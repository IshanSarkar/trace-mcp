"""Synthetic ETL runner for loads_sql fixture tests (generic app layout)."""

SQL_FILE = "etl/base_ownership.sql"


def run_with_constant():
    read_sql_file(SQL_FILE)


def run_with_literal():
    read_sql_file("etl/incremental_list.sql")
