# 🧪 Frontend Testing Guide

Simple testing setup for the Goldmine frontend using Docker.

## 🚀 Quick Start

### Coverage Result

96.9% Function Coverage with 91.49% Statement Coverage. Mostly affected by useEvaluationAPI.js and usePerformanceAPI.js as there are certain error cases we hard mock test on. Other than the two specific files, most of the coverage are all 100% coverage.

-------------------------------|---------|----------|---------|---------|-----------------------------------------------------------
File                           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                         
-------------------------------|---------|----------|---------|---------|-----------------------------------------------------------
All files                      |   91.49 |    84.38 |    96.9 |   91.85 |                                                           
 components                    |   97.28 |    89.65 |   96.92 |   98.78 |                                                           
  ActionButtons.jsx            |     100 |      100 |     100 |     100 |                                                           
  FileInput.jsx                |     100 |    85.71 |     100 |     100 | 41-44                                                     
  HpoTermList.jsx              |   96.55 |    81.48 |     100 |     100 | 16,67-69,83                                               
  MessageDisplay.jsx           |     100 |      100 |     100 |     100 |                                                           
  MetricsDisplay.jsx           |     100 |      100 |     100 |     100 |                                                           
  ModelActionOutput.jsx        |      96 |       90 |   83.33 |      96 | 85                                                        
  ModelOutput.jsx              |      95 |    84.78 |   93.33 |   97.95 | 91                                                        
  ModelSelector.jsx            |     100 |      100 |     100 |     100 |                                                           
  ModelStatusIndicator.jsx     |     100 |      100 |     100 |     100 |                                                           
  Navigation.jsx               |     100 |       75 |     100 |     100 | 21                                                        
  PerformanceActionButtons.jsx |     100 |      100 |     100 |     100 |                                                           
  SelectionForm.jsx            |     100 |      100 |     100 |     100 |                                                           
  TextInput.jsx                |     100 |      100 |     100 |     100 |                                                           
 contexts                      |     100 |      100 |     100 |     100 |                                                           
  EvaluationContext.jsx        |     100 |      100 |     100 |     100 |                                                           
  LoadingContext.jsx           |     100 |      100 |     100 |     100 |                                                           
 hooks                         |   86.12 |    75.49 |   91.66 |    86.5 |                                                           
  useApiCall.js                |     100 |    93.75 |     100 |     100 | 19                                                        
  useEvaluationAPI.js          |   81.93 |    67.71 |   81.81 |   82.81 | 65,97,237-238,294,319-320,332-333,345-398,405-406,425-427 
  useNavigation.js             |     100 |      100 |     100 |     100 |                                                           
  usePerformanceAPI.js         |   85.71 |    79.59 |     100 |   85.42 | 94-102,140-144,163-164,170,213-220,245-252,316-323        
  useTools.js                  |     100 |      100 |     100 |     100 |                                                           
 pages                         |   98.52 |       90 |     100 |   98.48 |                                                           
  AboutPage.jsx                |     100 |      100 |     100 |     100 |                                                           
  EvaluationPage.jsx           |     100 |    88.23 |     100 |     100 | 20,113-184,273-277,340                                    
  InferencePage.jsx            |   94.87 |    93.93 |     100 |   94.87 | 41-42                                                     
  PerformancePage.jsx          |     100 |      100 |     100 |     100 |                                                           
 utils                         |     100 |      100 |     100 |     100 |                                                           
  apiUtils.js                  |     100 |      100 |     100 |     100 |                                                           
  hpoUtils.js                  |     100 |      100 |     100 |     100 |                                                           
-------------------------------|---------|----------|---------|---------|-----------------------------------------------------------

Test Suites: 27 passed, 27 total
Tests:       538 passed, 538 total

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