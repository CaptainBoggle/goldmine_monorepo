# Import compatibility layer first to ensure TensorFlow is properly loaded
import compat

from tool import PhenoTaggerModelImplementation
from goldmine.toolkit.api import create_app

model_implementation = PhenoTaggerModelImplementation()

app = create_app(model_implementation)