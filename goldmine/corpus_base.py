"""
Base interface for corpus implementations.

Each corpus should implement this interface to provide a standard way
to parse and convert corpus data into the goldmine format.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from .types import Corpus, CorpusDocument


class CorpusParser(ABC):
    """Abstract base class for corpus parsers."""

    @abstractmethod
    def get_hpo_version(self) -> str:
        """Return the HPO version used by this corpus."""
        pass

    @abstractmethod
    def get_description(self) -> str:
        """Return a description of this corpus."""
        pass

    @abstractmethod
    def get_version(self) -> str:
        """Return the version of this corpus parser and data."""
        pass

    @abstractmethod
    def parse_corpus(self, corpus_path: Path) -> List[CorpusDocument]:
        """
        Parse the corpus from the given path and return a list of CorpusDocuments.

        Args:
            corpus_path: Path to the corpus directory

        Returns:
            List of CorpusDocument objects in the standard goldmine format
        """
        pass

    def create_corpus(self, corpus_path: Path) -> Corpus:
        """
        Create a complete Corpus object from the corpus directory.

        Args:
            corpus_path: Path to the corpus directory

        Returns:
            Complete Corpus object ready for database insertion
        """
        corpus_name = corpus_path.name
        documents = self.parse_corpus(corpus_path)

        return Corpus(
            name=corpus_name,
            description=self.get_description(),
            hpo_version=self.get_hpo_version(),
            corpus_version=self.get_version(),
            entries=documents,
        )
