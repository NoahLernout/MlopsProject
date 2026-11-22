"""API tests: build a tiny model from the real data format, then call the API."""
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

CAT = ["brand", "model", "transmission", "fuelType"]
NUM = ["year", "mileage", "tax", "mpg", "engineSize"]


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    d = tmp_path_factory.mktemp("model")
    rng = np.random.default_rng(0)
    n = 200
    df = pd.DataFrame({
        "brand": rng.choice(["audi", "bmw"], n), "model": rng.choice(["A3", "X1"], n),
        "transmission": rng.choice(["Manual", "Automatic"], n), "fuelType": rng.choice(["Petrol", "Diesel"], n),
        "year": rng.integers(2010, 2020, n), "mileage": rng.integers(1000, 90000, n),
        "tax": rng.integers(0, 300, n), "mpg": rng.uniform(30, 70, n), "engineSize": rng.uniform(1, 3, n),
    })
    y = 30000 - (2020 - df["year"]) * 1500 - df["mileage"] * 0.05
    pipe = Pipeline([
        ("pre", ColumnTransformer([("c", OneHotEncoder(handle_unknown="ignore"), CAT)], remainder="passthrough")),
        ("reg", RandomForestRegressor(n_estimators=10, random_state=0)),
    ]).fit(df[CAT + NUM], y)
    joblib.dump(pipe, d / "model.joblib")
    meta = {
        "model_name": "test", "algorithm": "random_forest", "metrics": {"mae": 1.0, "rmse": 1.0, "r2": 0.9},
        "features": CAT + NUM, "model_sha256": "x", "train_data_sha256": "x", "sklearn_version": "x",
        "options": {"brands": ["audi", "bmw"], "models_by_brand": {"audi": ["A3", "X1"], "bmw": ["A3", "X1"]},
                    "transmissions": ["Manual", "Automatic"], "fuel_types": ["Petrol", "Diesel"], "year_range": [2010, 2019]},
    }
    (d / "metadata.json").write_text(json.dumps(meta))
    os.environ["MODEL_DIR"] = str(d)
    os.environ["DATABASE_URL"] = f"sqlite:///{d}/test.db"
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "inference"))
    import main
    with TestClient(main.app) as c:
        yield c


GOOD = {"brand": "audi", "model": "A3", "year": 2017, "transmission": "Manual", "mileage": 35000,
        "fuel_type": "Petrol", "tax": 145, "mpg": 55.4, "engine_size": 1.4}


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_predict_and_store(client):
    r = client.post("/predict", json=GOOD)
    assert r.status_code == 200 and r.json()["estimated_price"] > 0
    assert len(client.get("/predictions").json()) >= 1


def test_validation(client):
    assert client.post("/predict", json={**GOOD, "mileage": -5}).status_code == 422
    assert client.post("/predict", json={**GOOD, "brand": "tesla"}).status_code == 422


def test_version(client):
    assert "git_sha" in client.get("/version").json()


def test_web_ui_is_served(client):
    r = client.get("/ui/")
    assert r.status_code == 200 and "CarWorth" in r.text
    assert client.get("/", follow_redirects=False).status_code in (302, 307)


def test_options_for_dropdowns(client):
    o = client.get("/options").json()
    assert "audi" in o["brands"] and "A3" in o["models_by_brand"]["audi"]
