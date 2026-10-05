"""Path-chain loader pattern (generic layout, no proprietary names)."""

from pathlib import Path

from services.sql_loader import load_sql_with_connectorx

ROOT = Path(__file__).resolve().parent.parent
BASE_SQL_PATH = ROOT / "etl"

WAREHOUSE_FILE = BASE_SQL_PATH / "base_ownership.sql"


def _load_extract_df(sql_path, label: str):
    return load_sql_with_connectorx(sql_path=sql_path, label=label, params={})


def run_extract():
    return _load_extract_df(WAREHOUSE_FILE, "warehouse")
