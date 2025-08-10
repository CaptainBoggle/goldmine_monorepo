#!/bin/bash

echo "🧪 Running Context Tests in Docker..."
echo "📋 Building test container..."

# Build the test container
docker build -f frontend/Dockerfile.test -t goldmine-frontend-test frontend/

if [ $? -ne 0 ]; then
    echo "❌ Failed to build test container"
    exit 1
fi

echo "📋 Running tests for contexts folder..."

# Run the tests
docker run --rm goldmine-frontend-test npm test -- src/contexts --watchAll=false

if [ $? -eq 0 ]; then
    echo "✅ Context tests completed!"
else
    echo "❌ Context tests failed!"
    exit 1
fi 