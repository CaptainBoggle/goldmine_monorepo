from tool import FastHPOCRImplementation

from goldmine.toolkit.api import create_app

model_implementation = FastHPOCRImplementation()

app = create_app(model_implementation)
