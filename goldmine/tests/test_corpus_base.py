import pytest
from pathlib import Path
from unittest.mock import Mock
from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus, CorpusDocument, ToolInput, ToolOutput, PhenotypeMatch


class MockCorpusParser(CorpusParser):
    """Mock implementation of CorpusParser for testing."""

    def __init__(
        self, hpo_version="2023-01-01", description="Test corpus", version="1.0"
    ):
        self._hpo_version = hpo_version
        self._description = description
        self._version = version

    def get_hpo_version(self) -> str:
        return self._hpo_version

    def get_description(self) -> str:
        return self._description

    def get_version(self) -> str:
        return self._version

    def parse_corpus(self, corpus_path: Path):
        # Return mock documents for testing
        return [
            CorpusDocument(
                name="test_doc_1",
                annotator="test_annotator",
                input=ToolInput(sentences=["Test sentence 1"]),
                output=ToolOutput(
                    results=[[PhenotypeMatch(id="HP:0000001", match_text="test1")]]
                ),
            ),
            CorpusDocument(
                name="test_doc_2",
                annotator="test_annotator",
                input=ToolInput(sentences=["Test sentence 2"]),
                output=ToolOutput(results=[[]]),
            ),
        ]


class TestCorpusParser:
    """Test class for CorpusParser abstract base class."""

    def test_abstract_methods_cannot_be_instantiated(self):
        """Test that CorpusParser cannot be instantiated directly."""
        with pytest.raises(TypeError):
            CorpusParser()

    def test_get_hpo_version_abstract(self):
        """Test that get_hpo_version is abstract."""
        parser = MockCorpusParser()
        assert parser.get_hpo_version() == "2023-01-01"

    def test_get_description_abstract(self):
        """Test that get_description is abstract."""
        parser = MockCorpusParser()
        assert parser.get_description() == "Test corpus"

    def test_get_version_abstract(self):
        """Test that get_version is abstract."""
        parser = MockCorpusParser()
        assert parser.get_version() == "1.0"

    def test_parse_corpus_abstract(self):
        """Test that parse_corpus is abstract and returns documents."""
        parser = MockCorpusParser()
        corpus_path = Path("/fake/path/test_corpus")
        documents = parser.parse_corpus(corpus_path)

        assert len(documents) == 2
        assert all(isinstance(doc, CorpusDocument) for doc in documents)
        assert documents[0].name == "test_doc_1"
        assert documents[1].name == "test_doc_2"

    def test_create_corpus_basic(self):
        """Test create_corpus method with basic functionality."""
        parser = MockCorpusParser()
        corpus_path = Path("/fake/path/test_corpus")

        corpus = parser.create_corpus(corpus_path)

        assert isinstance(corpus, Corpus)
        assert corpus.name == "test_corpus"  # Uses path name
        assert corpus.description == "Test corpus"
        assert corpus.hpo_version == "2023-01-01"
        assert corpus.corpus_version == "1.0"
        assert len(corpus.entries) == 2

    def test_create_corpus_with_different_name(self):
        """Test create_corpus uses the directory name as corpus name."""
        parser = MockCorpusParser()
        corpus_path = Path("/different/path/my_special_corpus")

        corpus = parser.create_corpus(corpus_path)

        assert corpus.name == "my_special_corpus"

    def test_create_corpus_with_custom_metadata(self):
        """Test create_corpus with custom metadata."""
        parser = MockCorpusParser(
            hpo_version="2024-01-01", description="Custom test corpus", version="2.0"
        )
        corpus_path = Path("/path/custom_corpus")

        corpus = parser.create_corpus(corpus_path)

        assert corpus.name == "custom_corpus"
        assert corpus.description == "Custom test corpus"
        assert corpus.hpo_version == "2024-01-01"
        assert corpus.corpus_version == "2.0"

    def test_create_corpus_preserves_document_data(self):
        """Test that create_corpus preserves all document data."""
        parser = MockCorpusParser()
        corpus_path = Path("/path/test_corpus")

        corpus = parser.create_corpus(corpus_path)

        # Check first document
        doc1 = corpus.entries[0]
        assert doc1.name == "test_doc_1"
        assert doc1.annotator == "test_annotator"
        assert doc1.input.sentences == ["Test sentence 1"]
        assert len(doc1.output.results[0]) == 1
        assert doc1.output.results[0][0].id == "HP:0000001"

        # Check second document
        doc2 = corpus.entries[1]
        assert doc2.name == "test_doc_2"
        assert doc2.input.sentences == ["Test sentence 2"]
        assert len(doc2.output.results[0]) == 0

    def test_create_corpus_with_empty_documents(self):
        """Test create_corpus when parse_corpus returns empty list."""
        parser = MockCorpusParser()
        # Override parse_corpus to return empty list
        parser.parse_corpus = Mock(return_value=[])
        corpus_path = Path("/path/empty_corpus")

        corpus = parser.create_corpus(corpus_path)

        assert len(corpus.entries) == 0
        assert corpus.name == "empty_corpus"

    def test_create_corpus_calls_parse_corpus_with_correct_path(self):
        """Test that create_corpus calls parse_corpus with the provided path."""
        parser = MockCorpusParser()
        parser.parse_corpus = Mock(return_value=[])
        corpus_path = Path("/specific/path/test_corpus")

        parser.create_corpus(corpus_path)

        parser.parse_corpus.assert_called_once_with(corpus_path)


class ConcreteCorpusParser(CorpusParser):
    """Another concrete implementation for testing edge cases."""

    def get_hpo_version(self) -> str:
        return "2025-01-01"

    def get_description(self) -> str:
        return "Another test corpus"

    def get_version(self) -> str:
        return "3.0"

    def parse_corpus(self, corpus_path: Path):
        # Simulate parsing error
        raise ValueError("Parsing failed")


class TestCorpusParserErrorHandling:
    """Test class for error handling in CorpusParser."""

    def test_create_corpus_handles_parse_error(self):
        """Test that create_corpus handles errors from parse_corpus."""
        parser = ConcreteCorpusParser()

        # test that the parser properly implements the abstract methods
        assert parser.get_hpo_version() == "2025-01-01"
        assert parser.get_description() == "Another test corpus"
        assert parser.get_version() == "3.0"

        corpus_path = Path("/path/bad_corpus")

        with pytest.raises(ValueError, match="Parsing failed"):
            parser.create_corpus(corpus_path)

    def test_create_corpus_with_special_characters_in_path(self):
        """Test create_corpus with special characters in path name."""
        parser = MockCorpusParser()
        corpus_path = Path("/path/test-corpus_with.special@chars")

        corpus = parser.create_corpus(corpus_path)

        assert corpus.name == "test-corpus_with.special@chars"

    def test_create_corpus_with_unicode_path(self):
        """Test create_corpus with unicode characters in path."""
        parser = MockCorpusParser()
        corpus_path = Path("/path/test_corpus_🧬")

        corpus = parser.create_corpus(corpus_path)

        assert corpus.name == "test_corpus_🧬"
