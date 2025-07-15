"""
Corpus discovery and ingestion system.

This module handles automatic discovery of corpus directories,
loading their parsers, and ingesting them into the database.
"""

import importlib.util
import subprocess
from pathlib import Path
from typing import Dict, Optional

from sqlmodel import Session, select

from goldmine.corpus_base import CorpusParser
from goldmine.types import Corpus


class CorpusIngestionService:
    """Service for discovering and ingesting corpora."""
    
    def __init__(self, corpora_root: Path, session: Session):
        """
        Initialise the ingestion service.
        """
        self.corpora_root = corpora_root
        self.session = session
    
    def discover_corpora(self) -> Dict[str, Path]:
        """
        Discover all corpus directories that contain a corpus.py file.
        """
        corpora = {}
        
        if not self.corpora_root.exists():
            print(f"Corpora directory not found: {self.corpora_root}")
            return corpora
        
        for corpus_dir in self.corpora_root.iterdir():
            # Need to filter garbage files/directories
            if corpus_dir.is_dir() and not corpus_dir.name.startswith('.'):
                corpus_py = corpus_dir / "corpus.py"
                if corpus_py.exists():
                    corpora[corpus_dir.name] = corpus_dir
                    print(f"Discovered corpus: {corpus_dir.name}")
        
        return corpora
    
    def load_corpus_parser(self, corpus_path: Path) -> Optional[CorpusParser]:
        """
        Dynamically load the corpus parser from corpus.py.
        """
        corpus_py = corpus_path / "corpus.py"
        
        try:
            spec = importlib.util.spec_from_file_location(
                f"{corpus_path.name}_parser", 
                corpus_py
            )
            if spec is None or spec.loader is None:
                print(f"Could not load spec for {corpus_py}")
                return None
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Look for a 'parser' attribute that implements CorpusParser
            if hasattr(module, 'parser') and isinstance(module.parser, CorpusParser):
                return module.parser
            else:
                print(f"No valid parser found in {corpus_py}")
                return None
                
        except Exception as e:
            print(f"Error loading parser from {corpus_py}: {e}")
            return None
    
    def is_corpus_ingested(self, corpus_name: str, version: str) -> bool:
        """
        Check if a corpus with the given name and version is already in the database.
        """
        statement = select(Corpus).where(
            Corpus.name == corpus_name,
            Corpus.corpus_version == version
        )
        result = self.session.exec(statement).first()
        return result is not None
    
    def ingest_corpus(self, corpus_name: str, corpus_path: Path) -> bool:
        """
        Ingest a single corpus into the database.
        """
        print(f"Starting ingestion of corpus: {corpus_name}")
        
        # Load the parser first to get its version
        parser = self.load_corpus_parser(corpus_path)
        if parser is None:
            print(f"Failed to load parser for {corpus_name}")
            return False
        
        # Get version from the parser
        version = parser.get_version()
        
        # Check if already ingested
        if self.is_corpus_ingested(corpus_name, version):
            print(f"Corpus {corpus_name} version {version} already ingested, skipping")
            return True
        
        try:
            # Parse the corpus
            corpus = parser.create_corpus(corpus_path)
            
            # Add to database
            self.session.add(corpus)
            self.session.commit()
            
            print(f"Successfully ingested corpus {corpus_name} version {version} with {len(corpus.entries)} documents")
            return True
            
        except Exception as e:
            print(f"Error ingesting corpus {corpus_name}: {e}")
            self.session.rollback()
            return False
    
    def ingest_all_corpora(self) -> int:
        """
        Discover and ingest all corpora that haven't been ingested yet.
        """
        corpora = self.discover_corpora()
        ingested_count = 0
        
        for corpus_name, corpus_path in corpora.items():
            if self.ingest_corpus(corpus_name, corpus_path):
                ingested_count += 1
        
        print(f"Ingestion complete. {ingested_count}/{len(corpora)} corpora processed")
        return ingested_count
