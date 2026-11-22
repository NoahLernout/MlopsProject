"""Training component: train several regressors, track them with MLflow, apply a quality gate,
save the best model bundle and register it in the Azure ML model registry."""
import argparse
import hashlib
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    import mlflow
except ImportError:  # allows running the script without MLflow
    mlflow = None

CATEGORICAL = ["brand", "model", "transmission", "fuelType"]
NUMERIC = ["year", "mileage", "tax", "mpg", "engineSize"]
TARGET = "price"
SEED = 42


def build_pipeline(regressor) -> Pipeline:
    pre = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL)],
        remainder="passthrough",
    )
    return Pipeline([("pre", pre), ("reg", regressor)])


def candidates():
    return {
        "linear_regression": TransformedTargetRegressor(
            LinearRegression(), func=np.log1p, inverse_func=np.expm1
        ),
        "random_forest": RandomForestRegressor(
            n_estimators=100, min_samples_leaf=3, max_depth=24, n_jobs=-1, random_state=SEED
        ),
        "hist_gradient_boosting": TransformedTargetRegressor(
            HistGradientBoostingRegressor(max_iter=400, learning_rate=0.1, random_state=SEED),
            func=np.log1p,
            inverse_func=np.expm1,
        ),
    }


def evaluate(model, X, y):
    pred = model.predict(X)
    return {
        "mae": float(mean_absolute_error(y, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y, pred))),
        "r2": float(r2_score(y, pred)),
    }


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--train_data", required=True)
    p.add_argument("--test_data", required=True)
    p.add_argument("--model_output", required=True)
    p.add_argument("--min_r2", type=float, default=0.85)
    p.add_argument("--registered_model_name", default="used-car-price")
    args = p.parse_args()

    train_path = os.path.join(args.train_data, "train.csv")
    test_path = os.path.join(args.test_data, "test.csv")
    train, test = pd.read_csv(train_path), pd.read_csv(test_path)
    X_train, y_train = train[CATEGORICAL + NUMERIC], train[TARGET]
    X_test, y_test = test[CATEGORICAL + NUMERIC], test[TARGET]
    print(f"train rows={len(train)} test rows={len(test)}")

    results, fitted = {}, {}
    for name, reg in candidates().items():
        pipe = build_pipeline(reg)
        pipe.fit(X_train, y_train)
        metrics = evaluate(pipe, X_test, y_test)
        results[name], fitted[name] = metrics, pipe
        print(name, metrics)
        if mlflow:
            with mlflow.start_run(run_name=name, nested=mlflow.active_run() is not None):
                mlflow.log_param("model_type", name)
                mlflow.log_param("seed", SEED)
                mlflow.log_metrics({f"test_{k}": v for k, v in metrics.items()})

    best_name = min(results, key=lambda n: results[n]["mae"])
    best, best_metrics = fitted[best_name], results[best_name]
    print(f"BEST: {best_name} {best_metrics}")

    # Quality gate: a model that is not good enough must not be released.
    if best_metrics["r2"] < args.min_r2:
        print(f"Quality gate failed: R2 {best_metrics['r2']:.3f} < {args.min_r2}")
        sys.exit(1)

    os.makedirs(args.model_output, exist_ok=True)
    model_file = os.path.join(args.model_output, "model.joblib")
    joblib.dump(best, model_file, compress=3)

    # Metadata ("model contract"): what the API needs to validate input and trace the model.
    options = {
        "brands": sorted(train["brand"].unique().tolist()),
        "models_by_brand": {b: sorted(g["model"].unique().tolist()) for b, g in train.groupby("brand")},
        "transmissions": sorted(train["transmission"].unique().tolist()),
        "fuel_types": sorted(train["fuelType"].unique().tolist()),
        "year_range": [int(train["year"].min()), int(train["year"].max())],
    }
    meta = {
        "model_name": args.registered_model_name,
        "algorithm": best_name,
        "metrics": best_metrics,
        "all_results": results,
        "features": CATEGORICAL + NUMERIC,
        "target": TARGET,
        "currency": "GBP",
        "seed": SEED,
        "sklearn_version": sklearn.__version__,
        "train_data_sha256": sha256(train_path),
        "test_data_sha256": sha256(test_path),
        "model_sha256": sha256(model_file),
        "options": options,
    }
    with open(os.path.join(args.model_output, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)

    if mlflow:
        mlflow.log_metrics({f"best_{k}": v for k, v in best_metrics.items()})
        mlflow.log_param("best_model", best_name)
        try:
            mlflow.sklearn.log_model(best, "model", registered_model_name=args.registered_model_name)
            print("model registered in the model registry")
        except Exception as exc:  # registration should not hide a successful training
            print("model registration skipped:", exc)


if __name__ == "__main__":
    main()
