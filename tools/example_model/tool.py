import asyncio
import logging

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput

logger = logging.getLogger(__name__)


class ExampleModelImplementation(ModelInterface):
    """
    Example implementation of a phenotype identification model.
    """

    def __init__(self):
        super().__init__()
        self.model = None

    async def _load_model(self):
        logger.info("Loading example phenotype identification model...")

        # Simulate model loading time
        await asyncio.sleep(2)

        # For this example, we'll just create a mock model
        self.model = {
            "phenotype_mappings": {
                "microcephaly": "HP:0000252",
                "brachydactyly": "HP:0001156",
                "seizures": "HP:0001250",
                "hearing loss": "HP:0000365",
                "heart defect": "HP:0001627",
            }
        }

        logger.info("Example model loaded successfully")

    async def _unload_model(self):
        """
        Unload the model from memory to free resources.
        """
        logger.info("Unloading example model...")
        self.model = None

        logger.info("Example model unloaded")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        """
        Extract phenotype IDs from sentences using the example model.
        This is a simple keyword-based approach for demonstration.
        """
        if not self.model:
            raise Exception("Model not loaded")

        logger.info(f"Processing {len(input.sentences)} sentences")

        results = []
        phenotype_mappings = self.model["phenotype_mappings"]

        for sentence in input.sentences:
            sentence_lower = sentence.lower()
            sentence_matches = []

            # Simple keyword matching (in a real model, this would be much more sophisticated)
            for term, hpo_id in phenotype_mappings.items():
                if term in sentence_lower:
                    match = PhenotypeMatch(
                        id=hpo_id,
                        match_text=term
                    )
                    sentence_matches.append(match)

            results.append(sentence_matches)

        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        """
        Return information about this example model.
        """
        return ToolInfo(
            name="Example Phenotype Extractor",
            version="1.0.0",
            description="Example model",
            author="Felix Montanari",
        )
