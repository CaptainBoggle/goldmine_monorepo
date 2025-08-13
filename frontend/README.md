# 🧪 Frontend Testing Guide

Simple testing setup for the Goldmine frontend using Docker.

## 🚀 Quick Start

### Run All Tests

**All Tests:**
```bash
docker run --rm goldmine-frontend-test npm run test -- --watchAll=false
```

**All Tests (in frontend):**
```bash
npm test -- --watchAll=false
```

**Pages Tests:**
```bash
./test-pages.sh
```

**Components Tests:**
```bash
./test-components.sh
```

**Contexts Tests:**
```bash
./test-contexts.sh
```

**Hooks Tests:**
```bash
./test-hooks.sh
```

**Integration Tests:**
```bash
./test-integration.sh
```

### Run Coverage Report
**Coverage:**
```bash
docker run --rm goldmine-frontend-test npm run test:coverage
```

**Coverage (in frontend):**
```bash
npm run test:coverage
```

## 📁 Test Structure

```
frontend/src/
├── pages/__tests__/          # Page tests
├── components/__tests__/      # Component tests  
├── contexts/__tests__/        # Context tests
└── hooks/__tests__/          # Hook tests (including integration tests)
```

## 🧩 Adding New Tests

1. **Create test file** in the appropriate `__tests__` folder
2. **Follow naming pattern**: `[ComponentName].test.jsx`
3. **Run the corresponding test script**

Example test:
```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Your Text')).toBeInTheDocument();
  });
});
```

## 🔗 Integration Tests

Integration tests test how components and hooks work together in realistic scenarios:

**useEvaluationAPI Integration Tests:**
```bash
npm test -- --testPathPattern="useEvaluationAPI.integration.test.js" --watchAll=false
```

These tests verify:
- Full data fetching workflows
- Error handling and recovery
- State management across API calls
- Performance with large datasets
- Real-world usage scenarios

**usePerformanceAPI Integration Tests:**
```bash
npm test -- --testPathPattern="usePerformanceAPI.integration.test.js" --watchAll=false
```

These tests verify:
- Complete tool selection to evaluation workflow
- Model loading and status management
- Prediction and evaluation processes
- Caching mechanisms for existing data
- Error handling and recovery scenarios
- State management during complex operations
- Performance with large datasets
- API integration and response handling

## 📋 Current Test Coverage

- ✅ **Pages**: AboutPage, EvaluationPage, InferencePage, PerformancePage
- ✅ **Components**: ActionButtons, FileInput, HpoTermList, ModelActionOutput, ModelOutput, ModelSelector, MessageDisplay, TextInput
- ✅ **Contexts**: LoadingContext, EvaluationContext
- ✅ **Hooks**: useApiCall, useEvaluationAPI, useEvaluationPreload, useNavigation, usePerformanceAPI, useTools
- ✅ **Integration Tests**: useEvaluationAPI and usePerformanceAPI workflow testing


## 📖 Resources

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started) 