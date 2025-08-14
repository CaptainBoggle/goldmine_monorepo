from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from app.services.database import (
    DatabaseService,
    get_database_service,
    get_db_session,
    initialise_database,
)


class TestDatabaseService:
    """Test class for DatabaseService."""

    def test_database_service_init(self, postgresql):
        """Test DatabaseService initialization."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        service = DatabaseService(connection_string, corpora_root)

        assert service.corpora_root == corpora_root
        assert service.engine is not None

    @patch("app.services.database.SQLModel")
    def test_create_tables(self, mock_sqlmodel, postgresql):
        """Test creating database tables."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        service = DatabaseService(connection_string, corpora_root)

        with patch("builtins.print") as mock_print:
            service.create_tables()

            mock_sqlmodel.metadata.create_all.assert_called_once_with(service.engine)
            mock_print.assert_any_call("Creating database tables...")
            mock_print.assert_any_call("Database tables created successfully")

    def test_get_session(self, postgresql):
        """Test getting a database session."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        service = DatabaseService(connection_string, corpora_root)
        session = service.get_session()

        assert session is not None
        # Clean up
        session.close()

    @patch("app.services.database.CorpusIngestionService")
    @patch("app.services.database.SQLModel")
    def test_initialise_and_ingest(self, mock_sqlmodel, mock_ingestion_service, postgresql):
        """Test database initialization and corpus ingestion."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        mock_ingestion_instance = Mock()
        mock_ingestion_service.return_value = mock_ingestion_instance

        service = DatabaseService(connection_string, corpora_root)
        service.initialise_and_ingest()

        # Verify tables are created
        mock_sqlmodel.metadata.create_all.assert_called_once_with(service.engine)

        # Verify ingestion service is called
        mock_ingestion_service.assert_called_once()
        mock_ingestion_instance.ingest_all_corpora.assert_called_once()


class TestDatabaseServiceGlobals:
    """Test class for global database service functions."""

    def setup_method(self):
        """Reset global state before each test."""
        import app.services.database

        app.services.database._db_service = None

    def teardown_method(self):
        """Reset global state after each test."""
        import app.services.database

        app.services.database._db_service = None

    def test_initialise_database(self, postgresql):
        """Test initializing the global database service."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        service = initialise_database(connection_string, corpora_root)

        assert isinstance(service, DatabaseService)
        assert service.corpora_root == corpora_root
        assert get_database_service() is service

    def test_get_database_service_not_initialised(self):
        """Test getting database service when not initialised."""
        with pytest.raises(RuntimeError, match="Database service not initialised"):
            get_database_service()

    def test_get_database_service_after_init(self, postgresql):
        """Test getting database service after initialisation."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        original_service = initialise_database(connection_string, corpora_root)
        retrieved_service = get_database_service()

        assert retrieved_service is original_service

    def test_get_db_session_not_initialised(self):
        """Test getting database session when service not initialised."""
        with pytest.raises(RuntimeError, match="Database service not initialised"):
            get_db_session()

    def test_get_db_session_after_init(self, postgresql):
        """Test getting database session after service initialization."""
        connection_string = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        corpora_root = Path("/test/corpora")

        initialise_database(connection_string, corpora_root)
        session = get_db_session()

        assert session is not None
        # Clean up
        session.close()

    def test_multiple_initialise_database_calls(self, postgresql):
        """Test that multiple calls to initialise_database replace the service."""
        connection_string1 = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}"
        connection_string2 = f"postgresql+psycopg2://{postgresql.info.user}:@{postgresql.info.host}:{postgresql.info.port}/{postgresql.info.dbname}_2"
        corpora_root = Path("/test/corpora")

        service1 = initialise_database(connection_string1, corpora_root)
        service2 = initialise_database(connection_string2, corpora_root)

        assert service1 is not service2
        assert get_database_service() is service2
