from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Ensure app is in pythonpath
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.db.base import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

from sqlalchemy.engine.mock import MockConnection
from sqlalchemy.inspection import _inspects

class MockInspector:
    """Mock inspector allowing offline migrations (--sql) to inspect metadata."""
    def __init__(self, bind):
        self.bind = bind
    def get_table_names(self, *args, **kwargs):
        return [t.name for t in Base.metadata.sorted_tables]
    def get_columns(self, table_name, *args, **kwargs):
        table = Base.metadata.tables.get(table_name)
        if table is not None:
            return [{"name": c.name} for c in table.columns]
        return []
    def get_indexes(self, table_name, *args, **kwargs):
        table = Base.metadata.tables.get(table_name)
        if table is not None:
            return [{"name": ix.name} for ix in table.indexes if ix.name]
        return []
    def get_unique_constraints(self, table_name, *args, **kwargs):
        table = Base.metadata.tables.get(table_name)
        if table is not None:
            return [{"name": c.name} for c in table.constraints if getattr(c, 'name', None)]
        return []
    def get_foreign_keys(self, table_name, *args, **kwargs):
        table = Base.metadata.tables.get(table_name)
        if table is not None:
            return [{"name": fk.name} for fk in table.foreign_keys if getattr(fk, 'name', None)]
        return []
    def has_table(self, table_name, *args, **kwargs):
        return table_name in Base.metadata.tables

_inspects(MockConnection)(lambda target: MockInspector(target))


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.SQL_HOST
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = settings.SQL_HOST
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata,
            render_as_batch=True
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
