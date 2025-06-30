from tool import GPT2ModelImplementation
from goldmine.toolkit.api import create_app

model_implementation = GPT2ModelImplementation()
app = create_app(model_implementation)