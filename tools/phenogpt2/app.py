from tool import PhenoGPT2ModelImplementation
from goldmine.toolkit.api import create_app

model_implementation = PhenoGPT2ModelImplementation()
app = create_app(model_implementation)