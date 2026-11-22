"""FastAPI service that serves the used-car price model trained in Azure ML."""
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine, select
from sqlalchemy.orm import Session, declarative_base

MODEL_DIR = os.environ.get("MODEL_DIR", "model")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./predictions.db")
GIT_SHA = os.environ.get("GIT_SHA", "dev")
IMAGE_TAG = os.environ.get("IMAGE_TAG", "dev")

Base = declarative_base()


class PredictionLog(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    brand = Column(String(50))
    model = Column(String(50))
    year = Column(Integer)
    transmission = Column(String(20))
    mileage = Column(Integer)
    fuel_type = Column(String(20))
    tax = Column(Float)
    mpg = Column(Float)
    engine_size = Column(Float)
    predicted_price = Column(Float)
    model_algorithm = Column(String(50))


class CarFeatures(BaseModel):
    brand: str = Field(..., examples=["audi"])
    model: str = Field(..., examples=["A3"])
    year: int = Field(..., ge=1995, le=datetime.now().year + 1, examples=[2017])
    transmission: str = Field(..., examples=["Manual"])
    mileage: int = Field(..., ge=0, le=500_000, examples=[35000])
    fuel_type: str = Field(..., examples=["Petrol"])
    tax: float = Field(..., ge=0, le=1000, examples=[145])
    mpg: float = Field(..., gt=0, le=300, examples=[55.4])
    engine_size: float = Field(..., gt=0, le=8, examples=[1.4])


class PredictionResponse(BaseModel):
    estimated_price: float
    currency: str
    model_algorithm: str
    prediction_id: int


state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["model"] = joblib.load(os.path.join(MODEL_DIR, "model.joblib"))
    with open(os.path.join(MODEL_DIR, "metadata.json")) as f:
        state["meta"] = json.load(f)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    state["engine"] = engine
    yield
    engine.dispose()


app = FastAPI(
    title="Used car price estimator",
    description="Estimates the price (GBP) of a used car. Model trained with Azure ML.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/ui/")


@app.get("/health")
def health():
    """Used by the Kubernetes liveness and readiness probes."""
    return {"status": "ok", "model_loaded": "model" in state}


@app.get("/version")
def version():
    """Traceability: which code, image and model produced the predictions."""
    meta = state["meta"]
    return {
        "git_sha": GIT_SHA,
        "image_tag": IMAGE_TAG,
        "model_name": meta["model_name"],
        "algorithm": meta["algorithm"],
        "metrics": meta["metrics"],
        "model_sha256": meta["model_sha256"],
        "train_data_sha256": meta["train_data_sha256"],
        "sklearn_version": meta["sklearn_version"],
    }


@app.get("/options")
def options():
    """Valid values for the dropdowns of a client application."""
    return state["meta"]["options"]


@app.post("/predict", response_model=PredictionResponse)
def predict(car: CarFeatures):
    opts = state["meta"]["options"]
    brand = car.brand.strip().lower()
    if brand not in opts["brands"]:
        raise HTTPException(422, f"Unknown brand '{car.brand}'. Valid: {opts['brands']}")
    if car.model.strip() not in opts["models_by_brand"][brand]:
        raise HTTPException(422, f"Unknown model '{car.model}' for brand '{brand}'. See /options")
    if car.transmission not in opts["transmissions"]:
        raise HTTPException(422, f"Unknown transmission. Valid: {opts['transmissions']}")
    if car.fuel_type not in opts["fuel_types"]:
        raise HTTPException(422, f"Unknown fuel type. Valid: {opts['fuel_types']}")

    row = pd.DataFrame(
        [
            {
                "brand": brand,
                "model": car.model.strip(),
                "transmission": car.transmission,
                "fuelType": car.fuel_type,
                "year": car.year,
                "mileage": car.mileage,
                "tax": car.tax,
                "mpg": car.mpg,
                "engineSize": car.engine_size,
            }
        ]
    )[state["meta"]["features"]]
    price = round(float(state["model"].predict(row)[0]), 2)

    with Session(state["engine"]) as session:
        log = PredictionLog(
            brand=brand, model=car.model.strip(), year=car.year, transmission=car.transmission,
            mileage=car.mileage, fuel_type=car.fuel_type, tax=car.tax, mpg=car.mpg,
            engine_size=car.engine_size, predicted_price=price,
            model_algorithm=state["meta"]["algorithm"],
        )
        session.add(log)
        session.commit()
        pid = log.id
    return PredictionResponse(
        estimated_price=price, currency="GBP", model_algorithm=state["meta"]["algorithm"], prediction_id=pid
    )


@app.get("/predictions")
def list_predictions(limit: int = Query(20, ge=1, le=200)):
    """The latest stored predictions (persistent storage)."""
    with Session(state["engine"]) as session:
        rows = session.scalars(select(PredictionLog).order_by(PredictionLog.id.desc()).limit(limit)).all()
        return [
            {
                "id": r.id, "created_at": r.created_at, "brand": r.brand, "model": r.model,
                "year": r.year, "mileage": r.mileage, "predicted_price": r.predicted_price,
            }
            for r in rows
        ]


# Web interface (plain HTML/JS, no build step) served by the same container
_static = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(_static):
    app.mount("/ui", StaticFiles(directory=_static, html=True), name="ui")
