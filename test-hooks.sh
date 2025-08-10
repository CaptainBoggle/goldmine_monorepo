#!/bin/bash

echo "🧪 Running Hook Tests in Docker..."
echo "📋 Building test container..."

# Build the test container
docker build -f frontend/Dockerfile.test -t goldmine-frontend-test frontend/

if [ $? -ne 0 ]; then
    echo "❌ Failed to build test container"
    exit 1
fi

echo "📋 Running tests for hooks folder..."

# Run the tests
docker run --rm goldmine-frontend-test npm test -- src/hooks --watchAll=false

if [ $? -eq 0 ]; then
    echo "✅ Hook tests completed!"
else
    echo "❌ Hook tests failed!"
    exit 1
fi 