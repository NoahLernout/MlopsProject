"""Data preparation component: merge the brand CSV files, clean them and split into train/test."""
import argparse
import glob
import os

import pandas as pd
from sklearn.model_selection import train_test_split

# The Kaggle dataset has one CSV per brand. cclass/focus are sub-sets of merc/ford and the
# "unclean" files are the raw versions, so we only use the clean per-brand files.
SKIP = {"cclass", "focus", "unclean cclass", "unclean focus"}
FEATURES = ["brand", "model", "year", "transmission", "mileage", "fuelType", "tax", "mpg", "engineSize"]
TARGET = "price"


def load_all(folder: str) -> pd.DataFrame:
    frames = []
    for path in sorted(glob.glob(os.path.join(folder, "**", "*.csv*"), recursive=True)):
        name = os.path.basename(path).split(".")[0].lower()
        if name in SKIP:
            continue
        df = pd.read_csv(path)
        df.columns = [c.strip() for c in df.columns]
        df = df.rename(columns={"tax(£)": "tax"})  # the Hyundai file uses another column name
        df["brand"] = "hyundai" if name == "hyundi" else name
        frames.append(df)
        print(f"loaded {name}: {len(df)} rows")
    return pd.concat(frames, ignore_index=True)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    for col in ["model", "transmission", "fuelType", "brand"]:
        df[col] = df[col].astype(str).str.strip()
    df = df.dropna(subset=FEATURES + [TARGET]).drop_duplicates()
    df = df[(df["year"].between(1995, 2021)) & (df["mileage"] >= 0) & (df["price"] > 0)]
    df = df[(df["engineSize"] > 0) & (df["mpg"] > 0)]  # a few rows have 0 for unknown values
    df = df[df["price"] < df["price"].quantile(0.999)]  # drop extreme outliers
    print(f"cleaning: {before} -> {len(df)} rows")
    return df[FEATURES + [TARGET]].reset_index(drop=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True)
    parser.add_argument("--train_output", type=str, required=True)
    parser.add_argument("--test_output", type=str, required=True)
    parser.add_argument("--test_size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(vars(args))

    df = clean(load_all(args.data))
    train, test = train_test_split(df, test_size=args.test_size, random_state=args.seed)
    train.to_csv(os.path.join(args.train_output, "train.csv"), index=False)
    test.to_csv(os.path.join(args.test_output, "test.csv"), index=False)
    print(f"train={len(train)} test={len(test)}")


if __name__ == "__main__":
    main()
