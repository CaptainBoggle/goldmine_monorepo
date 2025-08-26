# HPO-Agent

This folder contains some messy code related to the hpo-agent.

In the experiment directory we have code that was used when I was building and testing the agent.

In the clean directory we have code that could be used to cleanly create a new embedding database for a given HPO version that can be dropped into the hpo-agent tool.

In order to ingest a new hpo version, you need to first create a new directory in `hpo` named with the date
of the version you want to ingest (for example 2024-04-19). Then navigate to the [releases page](https://github.com/obophenotype/human-phenotype-ontology/releases) and acquire the following files from the desired release:

1. `hp.obo`
2. `genes_to_phenotype.txt`
3. `phenotype.hpoa`

Place all three files into the newly created directory, then make sure to move any existing `hpo_vector_db` directory out of the way (if it exists), and finally ensure you modify HPO_VERSION in the code to match the new version. Running the script will then create a new `hpo_vector_db` directory that can be dropped into the hpo-agent tool.

Additionally in the `clean` directory, you can find `model_error_summary.py`, which is a script to generate a text file displaying each error made by the HPO agent during its predictions. This requires the backend to be up
and running, and the script needs to be moved to the repo root too. 