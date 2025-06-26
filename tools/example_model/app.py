from tool import ExampleModelImplementation

from goldmine.toolkit.api import create_app

model_implementation = ExampleModelImplementation()

app = create_app(model_implementation)
