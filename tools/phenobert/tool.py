import logging
import os
import re
import sys
import warnings

import fasttext
import stanza
import torch

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput

# Add the PhenoBERT utils to the path
sys.path.append('externals/PhenoBERT/phenobert/utils')
sys.path.append('externals/PhenoBERT/phenobert/utils/fastNLP')

from model import device
from util import (
    HPOTree,
    ModelLoader,
    annotate_phrases,
    bert_model_path,
    cnn_model_path,
    fasttext_model_path,
    process_text2phrases,
)

logger = logging.getLogger(__name__)

# Suppress annoying warning
warnings.simplefilter("ignore", torch.serialization.SourceChangeWarning)

# Use all available CPU cores
os.environ['MKL_NUMTHREADS'] = str(os.cpu_count())
os.environ['OMP_NUMTHREADS'] = str(os.cpu_count())


class PhenoBertModelImplementation(ModelInterface):
    def __init__(self):
        super().__init__()
        self.clinical_ner_model = None
        self.hpo_tree = None
        self.cnn_model = None
        self.bert_model = None
        self.fasttext_model = None
        self.loader = None

    async def _load_model(self):
        logger.info("Loading PhenoBERT...")

        try:
            logger.info("Loading Stanza clinical NER model...")
            self.clinical_ner_model = stanza.Pipeline('en', package='mimic', processors={'ner': 'i2b2'}, verbose=False)

            logger.info("Building HPO tree...")
            self.hpo_tree = HPOTree()
            self.hpo_tree.buildHPOTree()

            logger.info("Loading FastText model...")
            self.fasttext_model = fasttext.load_model(fasttext_model_path)

            logger.info("Loading CNN model...")
            self.loader = ModelLoader()
            self.cnn_model = self.loader.load_all(cnn_model_path)

            logger.info("Loading BERT model...")
            self.bert_model = self.loader.load_all(bert_model_path)

            logger.info("PhenoBERT model loaded!")

        except Exception as e:
            logger.error(f"Failed to load PhenoBERT model: {str(e)}")
            raise

    async def _unload_model(self):
        logger.info("Unloading PhenoBERT model...")

        if self.cnn_model is not None:
            del self.cnn_model
            self.cnn_model = None

        if self.bert_model is not None:
            del self.bert_model
            self.bert_model = None

        if self.fasttext_model is not None:
            del self.fasttext_model
            self.fasttext_model = None

        if self.clinical_ner_model is not None:
            del self.clinical_ner_model
            self.clinical_ner_model = None

        if self.hpo_tree is not None:
            del self.hpo_tree
            self.hpo_tree = None

        if self.loader is not None:
            del self.loader
            self.loader = None

        logger.info("PhenoBERT model unloaded")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        if not all([self.clinical_ner_model, self.hpo_tree, self.cnn_model,
                   self.bert_model, self.fasttext_model]):
            raise Exception("Model not loaded")

        logger.info(f"Processing {len(input.sentences)} sentences")

        results = []

        for sentence in input.sentences:
            try:
                # Clean the text similar to PhenoBERT preprocessing
                text = re.sub(r"(?<=[A-Z])-(?=\d)", "", sentence)

                # Extract phrases using clinical NER
                phrases_list = process_text2phrases(text, self.clinical_ner_model)

                # Annotate phrases to get HPO terms
                # Using default parameters: param1=0.8, param2=0.6, param3=0.9
                annotation_result = annotate_phrases(
                    text, phrases_list, self.hpo_tree, self.fasttext_model,
                    self.cnn_model, self.bert_model, None, device,
                    param1=0.8, param2=0.6, param3=0.9,
                    use_longest=True, use_step_3=True
                )

                # Parse the annotation result
                sentence_matches = []
                if annotation_result:
                    lines = annotation_result.strip().split('\n')
                    for line in lines:
                        if line.strip():
                            parts = line.split('\t')
                            if len(parts) >= 4:
                                match_text = parts[2]
                                hpo_id = parts[3]

                                match = PhenotypeMatch(
                                    id=hpo_id,
                                    match_text=match_text
                                )
                                sentence_matches.append(match)

                results.append(sentence_matches)
            except Exception as e:
                raise Exception(f"Error processing sentence '{sentence}': {str(e)}")

        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        return ToolInfo(
            name="PhenoBERT Phenotype Extractor",
            version="1.0.0",
            description="PhenoBERT: A combined deep learning and NLP framework for clinical phenotype extraction",
            author="Yuhao Feng, Lei Qi, Weidong Tian",
        )
