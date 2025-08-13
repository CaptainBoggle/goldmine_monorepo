"""
Parser for the gold_corpus_small (PhenotypeCR evaluation corpus, small subset for testing).

We use the BioC XML annotations as they are easier to parse than
the JSON format.
"""

import hashlib
import pathlib
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List

from goldmine.corpus_base import CorpusParser
from goldmine.types import CorpusDocument, PhenotypeMatch, ToolInput, ToolOutput


def get_hash_for_file_types_in_path(path: Path, types: List[str]) -> str:
    """Credit https://stackoverflow.com/a/77956841"""
    matched_paths = []
    for f in types:
        matched_paths.extend(list(path.rglob(f)))
    matched_paths.sort()
    m = hashlib.sha1()
    for p in matched_paths:
        digest = hashlib.file_digest(open(p, 'rb'), 'sha1')
        m.update(digest.digest())
    hash_sha1 = m.hexdigest()
    return hash_sha1


class GoldCorpusSmallParser(CorpusParser):
    """Parser for the gold_corpus_small BioC XML format (small subset for testing)."""

    def get_hpo_version(self) -> str:
        return "2024-02-08" # from the corpus annotation guidelines

    def get_description(self) -> str:
        return (
            "Small gold standard corpus for phenotype concept recognition evaluation "
            "(testing subset)"
        )

    def get_version(self) -> str:
        corpus_path = pathlib.Path(__file__).parent
        return get_hash_for_file_types_in_path(corpus_path, ["lwit.xml"])

    def parse_corpus(self, corpus_path: Path) -> List[CorpusDocument]:
        documents = []
        bioc_dir = corpus_path / "externals" / "Annotations_BioC"
        if not bioc_dir.exists():
            raise FileNotFoundError(f"BioC annotations directory not found: {bioc_dir}")
        for doc_dir in bioc_dir.iterdir():
            if doc_dir.is_dir():
                lwit_xml = doc_dir / "lwit.xml"
                if lwit_xml.exists():
                    try:
                        doc = self._parse_bioc_xml(lwit_xml)
                        documents.append(doc)
                    except Exception as e:
                        print(f"Warning: Error parsing {lwit_xml}: {e}")
                        continue
        print(f"Successfully parsed {len(documents)} documents from gold_corpus_small")
        return documents

    def _parse_bioc_xml(self, xml_path: Path) -> CorpusDocument:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        doc_id = xml_path.parent.name
        key_element = root.find('.//key')
        annotator = key_element.text if key_element is not None else "lwit"
        sentences = []
        sentence_annotations = []
        document = root.find('.//document')
        if document is not None:
            passage = document.find('passage')
            if passage is not None:
                for sentence in passage.findall('sentence'):
                    text_element = sentence.find('text')
                    if text_element is not None and text_element.text:
                        sentence_text = text_element.text.strip()
                        sentences.append(sentence_text)
                        matches = []
                        annotations_by_id = {}
                        for annotation in sentence.findall('annotation'):
                            ann_id = annotation.get('id')
                            text_elem = annotation.find('text')
                            location_elem = annotation.find('location')
                            annotations_by_id[ann_id] = {
                                'text': text_elem.text if text_elem is not None else "",
                                'offset': (int(location_elem.get('offset', 0))
                                    if location_elem is not None else 0),
                                'hpo_term': None
                            }
                            hpo_elem = annotation.find("infon[@key='HPOterm']")
                            if hpo_elem is not None:
                                annotations_by_id[ann_id]['hpo_term'] = hpo_elem.text
                        for ann_id, ann_data in annotations_by_id.items():
                            if ann_data['hpo_term']:
                                hpo_url = ann_data['hpo_term']
                                if hpo_url and 'HP_' in hpo_url:
                                    hpo_id = hpo_url.split('/')[-1].replace('_', ':')
                                    if re.match(r"^HP:[0-9]+$", hpo_id):
                                        matches.append(PhenotypeMatch(
                                            id=hpo_id,
                                            match_text=ann_data['text']
                                        ))
                        for relation in sentence.findall('relation'):
                            hpo_elem = relation.find("infon[@key='HPOterm']")
                            if hpo_elem is not None:
                                hpo_url = hpo_elem.text
                                if hpo_url and 'HP_' in hpo_url:
                                    hpo_id = hpo_url.split('/')[-1].replace('_', ':')
                                    if re.match(r"^HP:[0-9]+$", hpo_id):
                                        source_node = relation.find("node[@role='source']")
                                        target_node = relation.find("node[@role='target']")
                                        if source_node is not None and target_node is not None:
                                            source_id = source_node.get('refid')
                                            target_id = target_node.get('refid')
                                            source_data = annotations_by_id.get(source_id, {})
                                            target_data = annotations_by_id.get(target_id, {})
                                            source_offset = source_data.get('offset', 0)
                                            target_offset = target_data.get('offset', 0)
                                            if source_offset < target_offset:
                                                match_text = (f"{source_data.get('text', '')}"
                                                              f" -> {target_data.get('text', '')}")
                                            else:
                                                match_text = (f"{target_data.get('text', '')}"
                                                              f" <- {source_data.get('text', '')}")
                                            matches.append(PhenotypeMatch(
                                                id=hpo_id,
                                                match_text=match_text
                                            ))
                        sentence_annotations.append(matches)
        if len(sentences) != len(sentence_annotations):
            raise ValueError(
                f"Mismatch between sentences ({len(sentences)})"
                f" and annotations ({len(sentence_annotations)})"
                f" for document {doc_id}"
            )
        return CorpusDocument(
            name=doc_id,
            annotator=annotator or "lwit",
            input=ToolInput(sentences=sentences),
            output=ToolOutput(results=sentence_annotations)
        )

# Create the parser instance that will be imported by the corpus ingestion system
parser = GoldCorpusSmallParser()
