from tool import HPOAgentModelImplementation

from goldmine.toolkit.api import create_app

model_implementation = HPOAgentModelImplementation()

app = create_app(model_implementation)
