import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput

logger = logging.getLogger(__name__)

class GPT2ModelImplementation(ModelInterface):
    def __init__(self):
        super().__init__()
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    async def _load_model(self):
        logger.info("Loading placeholder GPT-2 model...")
        self.tokenizer = AutoTokenizer.from_pretrained("gpt2")
        self.model = AutoModelForCausalLM.from_pretrained("gpt2").to(self.device)
        logger.info("Model loaded.")

    async def _unload_model(self):
        logger.info("Unloading model...")
        del self.model
        del self.tokenizer

    async def _predict(self, input: ToolInput) -> ToolOutput:
        logger.info(f"Running inference on {len(input.sentences)} sentences...")
        results = []

        for sentence in input.sentences:
            input_ids = self.tokenizer.encode(sentence, return_tensors="pt").to(self.device)
            outputs = self.model.generate(
                input_ids,
                max_length=50,
                do_sample=False
            )
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Extract fake HPO terms like "HP:0001250" if present
            import re
            hpo_ids = re.findall(r'HP:\d{7}', generated_text)

            if not hpo_ids:
                logger.debug(f"No HPO terms found in: '{generated_text}'")


            matches = [PhenotypeMatch(id=hpo) for hpo in hpo_ids]
            results.append(matches)

        return ToolOutput(results=results)

    def _get_model_info(self) -> ToolInfo:
        return ToolInfo(
            name="GPT2 Placeholder",
            version="0.1.0",
            description=(
                "Temporary GPT-2 model for development — "
                "to be replaced with fine-tuned PhenoGPT2"
            ),
            author="T18A DATE Team",
        )
