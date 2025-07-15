"""
Database initialisation and startup service.

Handles database table creation and corpus ingestion on startup.
"""

from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from .corpus_ingestion import CorpusIngestionService


class DatabaseService:
    """Service for database initialisation and management."""

    def __init__(self, database_url: str, corpora_root: Path):
        """
        Initialise the database service.
        """
        self.engine = create_engine(database_url, echo=True)
        self.corpora_root = corpora_root

    def create_tables(self):
        """Create all database tables."""
        print("Creating database tables...")
        SQLModel.metadata.create_all(self.engine)
        print("Database tables created successfully")

    def get_session(self) -> Session:
        """Get a database session."""
        return Session(self.engine)

    def initialise_and_ingest(self):
        """
        Initialise the database and ingest all corpora,
        we do this on application startup.

        """
        # Create tables
        self.create_tables()

        # Ingest corpora
        with self.get_session() as session:
            ingestion_service = CorpusIngestionService(self.corpora_root, session)
            ingestion_service.ingest_all_corpora()


# Global database service instance
_db_service: DatabaseService | None = None


def get_database_service() -> DatabaseService:
    """Get the global database service instance."""
    if _db_service is None:
        raise RuntimeError("Database service not initialised. Call initialise_database() first.")
    return _db_service


def initialise_database(database_url: str, corpora_root: Path) -> DatabaseService:
    """
    Initialise the global database service.
    """
    global _db_service
    _db_service = DatabaseService(database_url, corpora_root)
    return _db_service


def get_db_session() -> Session:
    """Get a database session for dependency injection."""
    return get_database_service().get_session()
