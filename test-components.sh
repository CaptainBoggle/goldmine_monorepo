#!/bin/bash

echo "🧪 Running Component Tests in Docker..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Building test container..."
docker build -f frontend/Dockerfile.test -t goldmine-frontend-test ./frontend

echo "📋 Running tests for components folder..."
docker run --rm goldmine-frontend-test npm test -- src/components --watchAll=false

echo "✅ Component tests completed!" 