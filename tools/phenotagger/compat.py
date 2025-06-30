import os
import sys
import platform

# Check if we're on ARM64 and need to alias tensorflow-aarch64 to tensorflow
machine = platform.machine().lower()
is_arm64 = machine in ['aarch64', 'arm64']

if is_arm64:
    try:
        import tensorflow
        print(f"Using regular TensorFlow {tensorflow.__version__}")
    except ImportError:
        try:
            import tensorflow_aarch64
            sys.modules['tensorflow'] = tensorflow_aarch64
            # Also alias submodules
            sys.modules['tensorflow.keras'] = tensorflow_aarch64.keras
            sys.modules['tensorflow.keras.layers'] = tensorflow_aarch64.keras.layers
            sys.modules['tensorflow.keras.models'] = tensorflow_aarch64.keras.models
            sys.modules['tensorflow.keras.preprocessing'] = tensorflow_aarch64.keras.preprocessing
            sys.modules['tensorflow.keras.preprocessing.sequence'] = tensorflow_aarch64.keras.preprocessing.sequence
            print(f"Using TensorFlow-aarch64 {tensorflow_aarch64.__version__} aliased as tensorflow")
        except ImportError:
            print("ERROR: Could not import tensorflow or tensorflow-aarch64!")
            raise
else:
    try:
        import tensorflow
        print(f"Using TensorFlow {tensorflow.__version__}")
    except ImportError:
        print("ERROR: Could not import tensorflow!")
        raise