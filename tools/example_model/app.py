from goldmine.toolkit.api import create_app
from .tool import ExampleModelImplementation

model_implementation = ExampleModelImplementation()

app = create_app(model_implementation)