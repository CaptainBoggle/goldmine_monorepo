from tool import PhenoBertModelImplementation

from goldmine.toolkit.api import create_app

model_implementation = PhenoBertModelImplementation()

app = create_app(model_implementation)
