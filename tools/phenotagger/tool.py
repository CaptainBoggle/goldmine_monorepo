import asyncio
import logging

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput

from nn_model import bioTag_CNN, bioTag_BERT
from tagging_text import bioTag
from dic_ner import dic_ont
import tensorflow as tf

logger = logging.getLogger(__name__)


class PhenoTaggerModelImplementation(ModelInterface):
    def __init__(self):
        super().__init__()
        self.model = None
        ontfiles={'dic_file':'externals/PhenoTagger/dict/noabb_lemma.dic',
              'word_hpo_file':'externals/PhenoTagger/dict/word_id_map.json',
              'hpo_word_file':'externals/PhenoTagger/dict/id_word_map.json'}
        self.biotag_dic = dic_ont(ontfiles)

    async def _load_model(self):
        logger.info("Loading PhenoTagger phenotype identification model...")

        # TODO: Properly model_type functionality
        model_type = "bioformer"
        if model_type =='cnn':
            vocabfiles={'w2vfile':'externals/PhenoTagger_weights/bio_embedding_intrinsic.d200',   
                        'charfile':'externals/PhenoTagger/dict/char.vocab',
                        'labelfile':'externals/PhenoTagger/dict/lable.vocab',
                        'posfile':'externals/PhenoTagger/dict/pos.vocab'}
            modelfile='externals/PhenoTagger_weights/cnn_PT_v1.2.h5'
        elif model_type == 'bioformer':
            vocabfiles={'labelfile':'externals/PhenoTagger/dict/lable.vocab',
                        'checkpoint_path':'externals/bioformer-cased-v1.0/',
                        'lowercase':False}
            modelfile='externals/PhenoTagger_weights/bioformer_PT_v1.2.h5'
        elif model_type == 'pubmedbert':
            vocabfiles={'labelfile':'externals/PhenoTagger/dict/lable.vocab',
                        'checkpoint_path':'externals/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext/',
                        'lowercase':True}
            modelfile='externals/PhenoTagger_weights/pubmedbert_PT_v1.2.h5'
        else:
            vocabfiles={'labelfile':'externals/PhenoTagger/dict/lable.vocab',
                        'checkpoint_path':'externals/biobert-base-cased-v1.2/',
                        'lowercase':False}
            modelfile='externals/PhenoTagger_weights/biobert_PT_v1.2.h5'  

        if model_type == 'cnn':
            self.model = bioTag_CNN(vocabfiles)
        else:
            self.model = bioTag_BERT(vocabfiles)
        self.model.load_model(modelfile)

        logger.info("PhenoTagger model loaded successfully")

    async def _unload_model(self):
        logger.info("Unloading PhenoTagger model...")
        
        del self.model
        tf.keras.backend.clear_session()

        logger.info("PhenoTagger model unloaded")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        logger.info(f"Processing {len(input.sentences)} sentences")

        results = []

        for sentence in input.sentences:
            annotations = bioTag(sentence.lower(), self.biotag_dic, self.model, True, True, 0.95)
            sentence_matches = []

            for an in annotations:
                match = PhenotypeMatch(
                    id=an[2]
                    #name=sentence.lower()[int(an[0]):an(an[1])]
                )
                sentence_matches.append(match)
            results.append(sentence_matches)

        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        return ToolInfo(
            name="PhenoTagger Phenotype Extractor",
            version="1.0.0",
            description="Interface to official implementation of 'PhenoTagger' paper",
            author="Ling Luo, Shankai Yan, et al.",
        )