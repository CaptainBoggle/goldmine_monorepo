import ast
import glob
import os

import bioc
import pandas as pd
import verifiers as vf
from datasets import Dataset, DatasetDict
from verifiers.utils.data_utils import extract_boxed_answer


def extract_hpo_ids(annotation):
    term_url = annotation.infons.get('HPOterm', '')
    return term_url.strip().split('/')[-1]

def parse_bioc_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        collection = bioc.load(f)

    rows = []
    for document in collection.documents:
        for passage in document.passages:
            for sentence in passage.sentences:
                text = sentence.text
                hpo_ids = [extract_hpo_ids(a) for a in sentence.annotations]
                rows.append((text, str(hpo_ids)))
    return rows

def pad_prompt(example, prefix, suffix):
    example["question"] = prefix + example["question"] + suffix
    return example

def load_hpo_dataset(dataset_path: str = "externals/phenotypeCR_eval/Annotations_BioC"):
    all_rows = []
    pattern = os.path.join(dataset_path, '*', 'lwit.xml')
    for file_path in glob.glob(pattern):
        rows = parse_bioc_file(file_path)
        all_rows.extend(rows)

    df = pd.DataFrame(all_rows, columns=['question', 'answer'])

    dataset = Dataset.from_pandas(df)
    prefix = (
        "Extract the HPO keywords from this sentence. "
        "Do not extract negated examples (e.g., 'patient does not have leukemia'), "
        "ignore the leukemia feature.\n\n"
        "Your final answer should be in the format ['HP_XXXXXXX', 'HP_XXXXXXX', ...] "
        "such that it can be parsed by ast.literal_eval.\n\n"
    )
    dataset = dataset.map(
        pad_prompt,
        fn_kwargs={"prefix": prefix, "suffix": ""}
    )

    ds_splits: DatasetDict = dataset.train_test_split(
        test_size=0.15,
        seed=42
    )

    return ds_splits["train"]

def get_hpo_environment():
    system_prompt = """
    Think step-by-step inside <think>...</think> tags.

    Then, give your final answer inside \\boxed{{...}}.
    """

    parser = vf.ThinkParser(extract_fn=extract_boxed_answer)

    def matches_reward_func(completion, answer, **kwargs):
        response = parser.parse_answer(completion)

        try:
            pred_ids = set(ast.literal_eval(response))
            actual_ids = set(ast.literal_eval(answer))
        except Exception as e:
            print(f"[WARN] Failed to parse prediction or answer: {response}, error: {e}")
            return 0.1

        if not actual_ids:
            return 1.0 if not pred_ids else 0.0

        return len(pred_ids & actual_ids) / len(actual_ids)

    rubric = vf.Rubric(
        funcs=[matches_reward_func, parser.get_format_reward_func()],
        weights=[1.0, 0.2],
    )
    dataset = load_hpo_dataset().select(range(1000))

    return vf.SingleTurnEnv(
        dataset=dataset,
        system_prompt=system_prompt,
        parser=parser,
        rubric=rubric
    )
