import asyncio
import logging
import unicodedata

from FastHPOCR.HPOAnnotator import HPOAnnotator

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput

logger = logging.getLogger(__name__)


def normalize_unicode_to_ascii(text: str) -> str:
    """
    Normalize Unicode text by converting problematic characters to standard ASCII equivalents.
    """
    if not text:
        return text

    # First, normalize to NFC form (canonical decomposition + composition)
    text = unicodedata.normalize("NFC", text)

    # char mappings stolen from https://github.com/sureshfizzy/CineSync/blob/72ab2317b9fad6c2ec39084e84c5c60d9975c928/MediaHub/utils/file_utils.py
    char_mappings = {
        # Various space characters -> regular space
        "\u00a0": " ",  # NO-BREAK SPACE
        "\u2002": " ",  # EN SPACE
        "\u2003": " ",  # EM SPACE
        "\u2004": " ",  # THREE-PER-EM SPACE
        "\u2005": " ",  # FOUR-PER-EM SPACE
        "\u2006": " ",  # SIX-PER-EM SPACE
        "\u2007": " ",  # FIGURE SPACE
        "\u2008": " ",  # PUNCTUATION SPACE
        "\u2009": " ",  # THIN SPACE
        "\u200a": " ",  # HAIR SPACE
        "\u202f": " ",  # NARROW NO-BREAK SPACE
        "\u205f": " ",  # MEDIUM MATHEMATICAL SPACE
        "\u3000": " ",  # IDEOGRAPHIC SPACE
        # Various hyphen and dash characters -> regular hyphen-minus
        "\u2010": "-",  # HYPHEN
        "\u2011": "-",  # NON-BREAKING HYPHEN
        "\u2012": "-",  # FIGURE DASH
        "\u2013": "-",  # EN DASH
        "\u2014": "-",  # EM DASH
        "\u2015": "-",  # HORIZONTAL BAR
        "\u2212": "-",  # MINUS SIGN
        "\uff0d": "-",  # FULLWIDTH HYPHEN-MINUS
        # Various quote characters -> regular quotes
        "\u2018": "'",  # LEFT SINGLE QUOTATION MARK
        "\u2019": "'",  # RIGHT SINGLE QUOTATION MARK
        "\u201a": "'",  # SINGLE LOW-9 QUOTATION MARK
        "\u201b": "'",  # SINGLE HIGH-REVERSED-9 QUOTATION MARK
        "\u201c": '"',  # LEFT DOUBLE QUOTATION MARK
        "\u201d": '"',  # RIGHT DOUBLE QUOTATION MARK
        "\u201e": '"',  # DOUBLE LOW-9 QUOTATION MARK
        "\u201f": '"',  # DOUBLE HIGH-REVERSED-9 QUOTATION MARK
        "\u2039": "<",  # SINGLE LEFT-POINTING ANGLE QUOTATION MARK
        "\u203a": ">",  # SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
        "\u00ab": '"',  # LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
        "\u00bb": '"',  # RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
        # Other common problematic characters
        "\u2026": "...",  # HORIZONTAL ELLIPSIS
        "\u2022": "*",  # BULLET
        "\u2023": "*",  # TRIANGULAR BULLET
        "\u2043": "*",  # HYPHEN BULLET
        "\u00b7": "*",  # MIDDLE DOT
        "\u2219": "*",  # BULLET OPERATOR
    }

    for unicode_char, replacement in char_mappings.items():
        text = text.replace(unicode_char, replacement)

    result = []
    for char in text:
        if ord(char) > 127:
            decomposed = unicodedata.normalize("NFD", char)
            if len(decomposed) > 1 and ord(decomposed[0]) <= 127:
                result.append(decomposed[0])
            else:
                result.append(char)
        else:
            result.append(char)

    return "".join(result)


class FastHPOCRImplementation(ModelInterface):
    """
    FastHPOCR implementation
    """

    def __init__(self):
        super().__init__()
        self.model = None

    async def _load_model(self):
        logger.info("Loading FastHPOCR Annotator...")

        # Simulate model loading time
        await asyncio.sleep(2)

        # For this example, we'll just create a mock model
        self.model = HPOAnnotator(crDataFile="index/hp.index")

        logger.info("FastHPOCR Annotator loaded successfully")

    async def _unload_model(self):
        """
        Unload the model from memory to free resources.
        """
        logger.info("Unloading FastHPOCR Annotator...")
        self.model = None

        logger.info("FastHPOCR Annotator unloaded")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        """
        Extract phenotype IDs from sentences using the example model.
        This is a simple keyword-based approach for demonstration.
        """
        if not self.model:
            raise Exception("Model not loaded")

        logger.info(f"Processing {len(input.sentences)} sentences")

        # results = []
        # phenotype_mappings = self.model["phenotype_mappings"]

        # for sentence in input.sentences:
        #     sentence_lower = sentence.lower()
        #     sentence_matches = []

        #     # Simple keyword matching (in a real model, this would be much more sophisticated)
        #     for term, hpo_id in phenotype_mappings.items():
        #         if term in sentence_lower:
        #             match = PhenotypeMatch(id=hpo_id, match_text=term)
        #             sentence_matches.append(match)

        #     results.append(sentence_matches)
        results = []
        for sentence in input.sentences:
            sentence = normalize_unicode_to_ascii(sentence)
            res = self.model.annotate(sentence, longestMatch=True)
            sentence_matches = []
            for annotation in res:
                match = PhenotypeMatch(
                    id=annotation.getHPOUri(), match_text=annotation.getTextSpan()
                )
                sentence_matches.append(match)
            results.append(sentence_matches)

        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        """
        Return information about this tool.
        """
        return ToolInfo(
            name="FastHPOCR",
            version="1.0.0",
            description="Fast dictionary-based HPO annotator",
            author="Tudor Groza et al.",
        )
