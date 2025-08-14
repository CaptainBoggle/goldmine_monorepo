import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

from app.services.corpus_ingestion import CorpusIngestionService

from goldmine.types import Corpus


class TestCorpusIngestionService:
    """Test class for corpus ingestion service."""

    def test_discover_corpora_success(self, test_db_session):
        """Test discovering corpora successfully."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpora_root = Path(temp_dir)

            # Create test corpus directories
            corpus1_dir = corpora_root / "test_corpus_1"
            corpus1_dir.mkdir()
            (corpus1_dir / "corpus.py").touch()

            corpus2_dir = corpora_root / "test_corpus_2"
            corpus2_dir.mkdir()
            (corpus2_dir / "corpus.py").touch()

            # Create a directory without corpus.py (should be ignored)
            invalid_dir = corpora_root / "invalid_corpus"
            invalid_dir.mkdir()

            service = CorpusIngestionService(corpora_root, test_db_session)
            corpora = service.discover_corpora()

            assert len(corpora) == 2
            assert "test_corpus_1" in corpora
            assert "test_corpus_2" in corpora
            assert "invalid_corpus" not in corpora

    def test_discover_corpora_empty_directory(self, test_db_session):
        """Test discovering corpora in an empty directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpora_root = Path(temp_dir)
            service = CorpusIngestionService(corpora_root, test_db_session)
            corpora = service.discover_corpora()

            assert len(corpora) == 0

    def test_discover_corpora_nonexistent_directory(self, test_db_session):
        """Test discovering corpora when directory doesn't exist."""
        nonexistent_dir = Path("/nonexistent/directory")
        service = CorpusIngestionService(nonexistent_dir, test_db_session)
        corpora = service.discover_corpora()

        assert len(corpora) == 0

    def test_discover_corpora_ignores_hidden_directories(self, test_db_session):
        """Test that hidden directories are ignored."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpora_root = Path(temp_dir)

            # Create hidden directory
            hidden_dir = corpora_root / ".hidden_corpus"
            hidden_dir.mkdir()
            (hidden_dir / "corpus.py").touch()

            # Create normal directory
            normal_dir = corpora_root / "normal_corpus"
            normal_dir.mkdir()
            (normal_dir / "corpus.py").touch()

            service = CorpusIngestionService(corpora_root, test_db_session)
            corpora = service.discover_corpora()

            assert len(corpora) == 1
            assert "normal_corpus" in corpora
            assert ".hidden_corpus" not in corpora

    def test_load_corpus_parser_success(self, test_db_session):
        """Test loading a corpus parser successfully."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a mock corpus.py file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.0"

    def get_description(self):
        return "Test corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0"
        )

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            parser = service.load_corpus_parser(corpus_dir)

            assert parser is not None
            assert parser.get_version() == "1.0.0"

    def test_load_corpus_parser_no_file(self, test_db_session):
        """Test loading parser when corpus.py doesn't exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            parser = service.load_corpus_parser(corpus_dir)

            assert parser is None

    def test_load_corpus_parser_invalid_file(self, test_db_session):
        """Test loading parser with invalid Python file."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create invalid Python file
            (corpus_dir / "corpus.py").write_text("invalid python syntax !!!")

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            parser = service.load_corpus_parser(corpus_dir)

            assert parser is None

    def test_load_corpus_parser_no_parser_attribute(self, test_db_session):
        """Test loading parser when no parser attribute exists."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create corpus.py without parser attribute
            corpus_py_content = """
# This file has no parser attribute
def some_function():
    pass
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            parser = service.load_corpus_parser(corpus_dir)

            assert parser is None

    def test_load_corpus_parser_spec_loading_failure(self, test_db_session):
        """Test loading parser when spec loading fails."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a valid Python file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser

class TestParser(CorpusParser):
    pass

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)

            # Mock importlib.util.spec_from_file_location to return None
            with patch("importlib.util.spec_from_file_location", return_value=None):
                parser = service.load_corpus_parser(corpus_dir)

            assert parser is None

    def test_load_corpus_parser_spec_loader_none(self, test_db_session):
        """Test loading parser when spec.loader is None."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a valid Python file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser

class TestParser(CorpusParser):
    pass

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)

            # Mock spec with loader=None
            mock_spec = Mock()
            mock_spec.loader = None

            with patch("importlib.util.spec_from_file_location", return_value=mock_spec):
                parser = service.load_corpus_parser(corpus_dir)

            assert parser is None

    def test_is_corpus_ingested_true(self, test_db_session):
        """Test checking if corpus is ingested when it exists."""
        # Add a corpus to the database
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        service = CorpusIngestionService(Path("/tmp"), test_db_session)
        result = service.is_corpus_ingested("test_corpus", "1.0.0")

        assert result is True

    def test_is_corpus_ingested_false(self, test_db_session):
        """Test checking if corpus is ingested when it doesn't exist."""
        service = CorpusIngestionService(Path("/tmp"), test_db_session)
        result = service.is_corpus_ingested("nonexistent_corpus", "1.0.0")

        assert result is False

    @patch("builtins.print")
    def test_ingest_corpus_success(self, mock_print, test_db_session):
        """Test ingesting a corpus successfully."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a mock corpus.py file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.0"

    def get_description(self):
        return "Test corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0"
        )

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            result = service.ingest_corpus("test_corpus", corpus_dir)

            assert result is True

            # Check that corpus was added to database
            from sqlmodel import select

            statement = select(Corpus).where(Corpus.name == "test_corpus")
            corpus = test_db_session.exec(statement).first()
            assert corpus is not None
            assert corpus.corpus_version == "1.0.0"

    @patch("builtins.print")
    def test_ingest_corpus_no_parser(self, mock_print, test_db_session):
        """Test ingesting corpus when parser loading fails."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()
            # No corpus.py file

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            result = service.ingest_corpus("test_corpus", corpus_dir)

            assert result is False

    @patch("builtins.print")
    def test_ingest_corpus_latest_version(self, mock_print, test_db_session):
        """Test ingesting corpus with 'latest' version (should be rejected)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a mock corpus.py file with 'latest' version
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "latest"

    def get_description(self):
        return "Test corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="latest"
        )

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            result = service.ingest_corpus("test_corpus", corpus_dir)

            assert result is False

    @patch("builtins.print")
    def test_ingest_corpus_already_ingested(self, mock_print, test_db_session):
        """Test ingesting corpus that's already in database."""
        # Add corpus to database first
        corpus = Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0",
        )
        test_db_session.add(corpus)
        test_db_session.commit()

        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a mock corpus.py file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.0"

    def get_description(self):
        return "Test corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0"
        )

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)
            result = service.ingest_corpus("test_corpus", corpus_dir)

            assert result is True  # Should return True for already ingested

    @patch("builtins.print")
    def test_ingest_corpus_database_error(self, mock_print, test_db_session):
        """Test handling database errors during ingestion."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpus_dir = Path(temp_dir) / "test_corpus"
            corpus_dir.mkdir()

            # Create a mock corpus.py file
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.0"

    def get_description(self):
        return "Test corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus",
            description="Test corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0"
        )

parser = TestParser()
"""
            (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(Path(temp_dir), test_db_session)

            # Mock database commit to raise an error
            with patch.object(test_db_session, "commit", side_effect=Exception("Database error")):
                result = service.ingest_corpus("test_corpus", corpus_dir)

                assert result is False

    @patch("builtins.print")
    def test_ingest_all_corpora_success(self, mock_print, test_db_session):
        """Test ingesting all corpora successfully."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpora_root = Path(temp_dir)

            # Create multiple test corpus directories
            for i in range(3):
                corpus_dir = corpora_root / f"test_corpus_{i}"
                corpus_dir.mkdir()

                corpus_py_content = f"""
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.{i}"

    def get_description(self):
        return "Test corpus {i}"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="test_corpus_{i}",
            description="Test corpus {i}",
            hpo_version="2023-01-01",
            corpus_version="1.0.{i}"
        )

parser = TestParser()
"""
                (corpus_dir / "corpus.py").write_text(corpus_py_content)

            service = CorpusIngestionService(corpora_root, test_db_session)
            count = service.ingest_all_corpora()

            assert count == 3

    @patch("builtins.print")
    def test_ingest_all_corpora_mixed_results(self, mock_print, test_db_session):
        """Test ingesting all corpora with mixed success/failure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            corpora_root = Path(temp_dir)

            # Create successful corpus
            success_dir = corpora_root / "success_corpus"
            success_dir.mkdir()
            corpus_py_content = """
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput

class TestParser(CorpusParser):
    def get_version(self):
        return "1.0.0"

    def get_description(self):
        return "Success corpus"

    def get_hpo_version(self):
        return "2023-01-01"

    def parse_corpus(self, corpus_path):
        return []

    def create_corpus(self, corpus_path):
        return Corpus(
            name="success_corpus",
            description="Success corpus",
            hpo_version="2023-01-01",
            corpus_version="1.0.0"
        )

parser = TestParser()
"""
            (success_dir / "corpus.py").write_text(corpus_py_content)

            # Create failing corpus (no corpus.py)
            fail_dir = corpora_root / "fail_corpus"
            fail_dir.mkdir()

            service = CorpusIngestionService(corpora_root, test_db_session)
            count = service.ingest_all_corpora()

            assert count == 1  # Only one successful ingestion
