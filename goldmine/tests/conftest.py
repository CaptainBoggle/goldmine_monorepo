from typing import Generator

import pytest
from pytest_postgresql import factories
from sqlmodel import Session, SQLModel, create_engine

# Create postgresql process and database fixtures
postgresql_proc = factories.postgresql_proc()
postgresql = factories.postgresql("postgresql_proc")


@pytest.fixture(scope="function")
def test_db_engine(postgresql):
    """Create a test database engine using PostgreSQL."""
    # Create connection string from postgresql fixture
    connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"

    engine = create_engine(
        connection_string,
        echo=False,  # Set to True for SQL debugging
        pool_pre_ping=True,
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def test_db_session(test_db_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    session = Session(test_db_engine)
    try:
        yield session
    finally:
        session.close()
