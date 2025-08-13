import logging
import os
import re
from typing import Dict, List

# Import agent modules
from agent import (
    SYSTEM_PROMPT,
    TOOLS,
    StellaEmbeddingModel,
    batch_search_hpo_candidates,
    search_hpo_candidates,
)
from google import genai
from google.genai import types

from goldmine.toolkit.interface import ModelInterface
from goldmine.types import PhenotypeMatch, ToolInfo, ToolInput, ToolOutput


def normalize_text_for_matching(text: str) -> str:
    """
    Normalize text for span matching by removing whitespace characters like \r, \n, \t
    and converting to lowercase.
    """
    if not text:
        return ""

    # Convert to lowercase
    text = text.lower()

    # Remove all whitespace characters (spaces, tabs, newlines, carriage returns, etc.)
    # and replace with single spaces, then strip leading/trailing whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class HPOAgentModelImplementation(ModelInterface):
    def __init__(self):
        super().__init__()
        self.gemini_client = None
        self.embedding_model = None
        self.gemini_config = None
        self._conversation_length_tracker = 0

    async def _load_model(self):
        """Load the models required for the HPO agent."""
        logger.info("Loading HPO agent models...")

        # Create and load the embedding model
        self.embedding_model = StellaEmbeddingModel()
        self.embedding_model._load_model()

        # Create Gemini client
        self.gemini_client = genai.Client(api_key=os.getenv("GOOG_API"))

        # Create cached prompt
        # cached_prompt = self.gemini_client.caches.create(
        #     model="gemini-2.5-flash",
        #     config=types.CreateCachedContentConfig(
        #         display_name="hpo-agent",
        #         system_instruction=SYSTEM_PROMPT,
        #         tools=[types.Tool(function_declarations=TOOLS)],
        #         tool_config= types.ToolConfig(
        #             function_calling_config=types.FunctionCallingConfig(
        #                 mode=types.FunctionCallingConfigMode.ANY
        #             ),
        #         )
        #     )
        # )

        # # Create Gemini configuration - simplified for proper API usage
        # self.gemini_config = types.GenerateContentConfig(
        #     temperature=0.5,
        #     cached_content=cached_prompt.name,
        # )

        # try to embed a few sentences to ensure the model is loaded
        test_sentences = [
            "The patient has a short stature and developmental delay.",
            "The patient exhibits signs of autism spectrum disorder.",
            "There is a family history of hypertension and diabetes."
        ]

        embedded_sentences = self.embedding_model.embed_queries(test_sentences)

        for sentence, embedding in zip(test_sentences, embedded_sentences):
            logger.info(f"Embedded sentence: {sentence}")
            logger.info(f"Embedding: {embedding}")


        self.gemini_config = types.GenerateContentConfig(
            temperature=0.5,
            tools=[types.Tool(function_declarations=TOOLS)],
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    mode=types.FunctionCallingConfigMode.ANY
                )
            ),
            system_instruction=SYSTEM_PROMPT,
            thinking_config= types.ThinkingConfig(
                include_thoughts= True,
                thinking_budget=-1
            )
        )

        logger.info("HPO agent models loaded successfully")

    async def _unload_model(self):
        """Unload the models to free memory."""
        logger.info("Unloading HPO agent models...")

        if self.embedding_model:
            self.embedding_model.unload_model()
            self.embedding_model = None

        self.gemini_client = None
        self.gemini_config = None

        logger.info("HPO agent models unloaded")

    async def _predict(self, input: ToolInput) -> ToolOutput:
        """Process sentences as a full document using the HPO agent."""
        logger.info(f"Processing document with {len(input.sentences)} sentences using HPO agent")

        # Process the entire document as one unit
        document_matches = await self._process_document(input.sentences)

        return ToolOutput(results=document_matches)

    async def _process_document(self, sentences: List[str]) -> List[List[PhenotypeMatch]]:
        """Process a full document (list of sentences) using the multi-turn agent."""
        logger.info(f"Processing document with {len(sentences)} sentences...")

        # Format the document with numbered sentences for Gemini
        document_text = "Document to analyze:\n"
        for i, sentence in enumerate(sentences, 1):
            document_text += f"({i}) {sentence}\n"

        # Start the conversation with proper Gemini contents structure
        contents: List[types.ContentUnion] = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=document_text)]
            )
        ]

        logger.info("Initial document sent to agent:")
        logger.info(f"Document text: {document_text}")
        self._conversation_length_tracker = 1  # Reset and track conversation length

        max_turns = 10  # Prevent infinite loops
        turn_count = 0

        while turn_count < max_turns:
            turn_count += 1
            logger.info(f"=== Agent turn {turn_count} ===")

            try:
                if not self.gemini_client:
                    logger.error("Gemini client is not initialised")
                    break

                logger.info("Calling Gemini model...")
                response = self.gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=self.gemini_config
                )

                logger.info("Gemini response received.")

                # Check if there are function calls to execute
                if (response and response.candidates and
                    response.candidates[0] and response.candidates[0].content and
                    response.candidates[0].content.parts):
                    function_calls = []
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            logger.info(f"Function call detected: {part.function_call.name}")
                            # Only log the function name and args summary, not full details
                            if part.function_call.args:
                                args_dict = dict(part.function_call.args)
                                # Log queries and mappings in detail for debugging
                                search_functions = ["batch_search_hpo_candidates",
                                                  "search_hpo_candidates"]
                                if part.function_call.name in search_functions:
                                    if "queries" in args_dict:
                                        logger.info(f"Search queries: {args_dict['queries']}")
                                    elif "query" in args_dict:
                                        logger.info(f"Search query: {args_dict['query']}")
                                elif part.function_call.name == "submit_answer":
                                    mappings = args_dict.get("mappings", [])
                                    logger.info(f"Submitting {len(mappings)} annotations")
                                    # Log first 5 for brevity
                                    for i, mapping in enumerate(mappings[:5]):
                                        logger.info(f"  {i+1}. {mapping}")
                                    if len(mappings) > 5:
                                        logger.info(f"  ... and {len(mappings) - 5} "
                                                  f"more annotations")
                                else:
                                    # For other functions, show summary
                                    args_summary = {
                                        k: (f"[{len(v)} items]" if isinstance(v, list) else v)
                                        for k, v in args_dict.items()
                                    }
                                    logger.info(f"Function args: {args_summary}")
                            function_calls.append(part.function_call)

                    if function_calls:
                        # Add the model's response to contents
                        if response.candidates[0].content:
                            logger.info("Added model response to conversation")
                            contents.append(response.candidates[0].content)
                            self._conversation_length_tracker += 1

                        # Execute function calls and create function response parts
                        function_response_parts = []
                        for func_call in function_calls:
                            logger.info(f"Executing function: {func_call.name}")
                            func_response = await self._execute_function_call(func_call, sentences)

                            # Log only summary of function response, not full details
                            result = func_response.get("result", {})
                            if func_call.name == "batch_search_hpo_candidates":
                                batch_candidates = result.get("batch_candidates", [])
                                logger.info(f"Function returned {len(batch_candidates)} "
                                          f"query results")
                            elif func_call.name == "search_hpo_candidates":
                                candidates = result.get("candidates", [])
                                logger.info(f"Function returned {len(candidates)} candidates")
                            elif func_call.name == "submit_answer":
                                total_submitted = result.get("total_submitted", "0")
                                total_validated = result.get("total_validated", "0")
                                errors = result.get("errors", "[]")
                                logger.info(f"Submitted {total_submitted} annotations, "
                                          f"{total_validated} validated")
                                # Always log errors in detail for debugging
                                if errors != "[]":
                                    logger.error(f"Validation errors: {errors}")
                                    # Parse and log each error separately for clarity
                                    try:
                                        import ast
                                        error_list = ast.literal_eval(errors)
                                        for i, error in enumerate(error_list):
                                            logger.error(f"  Error {i+1}: {error}")
                                    except Exception:
                                        # If parsing fails, just log the raw errors
                                        pass

                            # Check if this is a final submit_answer
                            if func_response.get("final", False):
                                validation_result = func_response.get("result", {})
                                logger.info("Final answer submitted by agent.")
                                validated_annotations = validation_result.get(
                                    "validated_annotations", []
                                )
                                return self._convert_to_sentence_organized_matches(
                                    validated_annotations, sentences
                                )

                            # Create function response part
                            function_response_part = types.Part.from_function_response(
                                name=func_call.name,
                                response=func_response.get("result", {})
                            )
                            function_response_parts.append(function_response_part)

                        # Add function responses to contents
                        logger.info(f"Added {len(function_response_parts)} function responses "
                                  f"to conversation")
                        contents.append(types.Content(role="user", parts=function_response_parts))
                        self._conversation_length_tracker += 1
                        logger.info(f"Conversation now has {self._conversation_length_tracker} "
                                  f"turns")

                        # Continue the conversation
                        continue
            except Exception as e:
                logger.error(f"Error in agent turn {turn_count}: {e}")
                logger.info("Exception details:", exc_info=True)
                break

        logger.warning(f"Agent reached maximum turns ({max_turns}) without submitting final answer")
        return [[] for _ in sentences]  # Return empty results for each sentence

    async def _execute_function_call(self, function_call, sentences: List[str]) -> Dict:
        """Execute a function call from the agent."""
        function_name = function_call.name
        args = dict(function_call.args) if function_call.args else {}

        logger.info(f"Executing function: {function_name} with args: {args}")

        try:
            if function_name == "batch_search_hpo_candidates":
                queries = args.get("queries", [])
                result = batch_search_hpo_candidates(queries, self.embedding_model)
                return {"function": function_name, "result": {"batch_candidates": result}}

            elif function_name == "search_hpo_candidates":
                query = args.get("query", "")
                top_k = args.get("top_k", 15)
                result = search_hpo_candidates(query, self.embedding_model, top_k)
                return {"function": function_name, "result": {"candidates": result}}

            elif function_name == "submit_answer":
                mappings = args.get("mappings", [])
                # Use the submit_annotations function for validation
                # We pass the sentences list that we have in scope
                from agent import submit_annotations
                validation_result = submit_annotations(mappings, sentences)

                # Check if there are errors - if so, don't mark as final
                errors = validation_result.get("errors", "")
                if errors and errors != "[]":  # If there are actual errors
                    return {
                        "function": function_name,
                        "result": validation_result,
                        "final": False  # Allow correction
                    }
                else:
                    return {
                        "function": function_name,
                        "result": validation_result,
                        "final": True
                    }

            else:
                logger.warning(f"Unknown function: {function_name}")
                return {"function": function_name, "error": "Unknown function"}

        except Exception as e:
            logger.error(f"Error executing function {function_name}: {e}")
            return {"function": function_name, "error": str(e)}

    def _validate_mappings(self, mappings: List[Dict], sentence: str) -> List[Dict]:
        """Validate that text spans exist in the sentence."""
        validated_mappings = []

        for mapping in mappings:
            text_span = mapping.get("text_span", "")
            hpo_id = mapping.get("hpo_id", "")

            # Validate HPO ID format
            if not re.match(r"^HP:\d{7}$", hpo_id):
                logger.warning(f"Invalid HPO ID format: {hpo_id}")
                continue

            # Validate text span exists in sentence
            if self._validate_text_span(text_span, sentence):
                validated_mappings.append({
                    "text_span": text_span,
                    "hpo_id": hpo_id
                })
            else:
                logger.warning(f"Text span '{text_span}' not found in sentence")

        return validated_mappings

    def _validate_text_span(self, text_span: str, sentence: str) -> bool:
        """
        Validate that a text span exists in the sentence.
        Ignores whitespace characters like \\r, \\n, \\t when matching.
        """
        # Handle discontinuous spans (e.g., "fingers -> short")
        if " -> " in text_span:
            parts = [part.strip() for part in text_span.split(" -> ")]
            # Check that all parts exist in the sentence
            sentence_normalized = normalize_text_for_matching(sentence)
            return all(normalize_text_for_matching(part) in sentence_normalized for part in parts)
        else:
            # Check for continuous span
            return normalize_text_for_matching(text_span) in normalize_text_for_matching(sentence)

    def _convert_to_sentence_organized_matches(
        self, validated_annotations: List[Dict], sentences: List[str]
    ) -> List[List[PhenotypeMatch]]:
        """Convert validated annotations to sentence-organized PhenotypeMatch objects."""
        # Initialize result with empty lists for each sentence
        sentence_matches = [[] for _ in sentences]

        for annotation in validated_annotations:
            text_span = annotation.get("text_span", "")
            hpo_id = annotation.get("hpo_id", "")
            sentence_index = annotation.get("sentence_index", 0)

            if text_span and hpo_id and 0 <= sentence_index < len(sentences):
                match = PhenotypeMatch(
                    id=hpo_id,
                    match_text=text_span
                )
                sentence_matches[sentence_index].append(match)

        return sentence_matches

    def _convert_to_phenotype_matches(
        self, validated_annotations: List[Dict]
    ) -> List[PhenotypeMatch]:
        """Convert validated annotations to PhenotypeMatch objects."""
        matches = []
        for annotation in validated_annotations:
            text_span = annotation.get("text_span", "")
            hpo_id = annotation.get("hpo_id", "")
            if text_span and hpo_id:
                matches.append(PhenotypeMatch(
                    id=hpo_id,
                    match_text=text_span
                ))
        return matches

    def _get_model_info(self) -> ToolInfo:
        """Return information about the HPO agent tool."""
        return ToolInfo(
            name="HPO Agent",
            version="1.0.0",
            description=(
                "AI agent for Human Phenotype Ontology term extraction "
                "using Gemini and vector search"
            ),
            author="T18A DATE Team",
        )
