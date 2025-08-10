# 🧪 Frontend Testing Guide

Simple testing setup for the Goldmine frontend using Docker.

## 🚀 Quick Start

### Run All Tests

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

### Run Coverage Report
```bash
docker run --rm goldmine-frontend-test npm test -- --coverage
```

## 📁 Test Structure

```
frontend/src/
├── pages/__tests__/          # Page tests
├── components/__tests__/      # Component tests  
├── contexts/__tests__/        # Context tests
└── hooks/__tests__/          # Hook tests
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

## 📋 Current Test Coverage

- ✅ **Pages**: AboutPage, EvaluationPage, InferencePage, PerformancePage
- ✅ **Components**: ActionButtons, FileInput, HpoTermList, ModelActionOutput, ModelOutput, ModelSelector, MessageDisplay, TextInput
- ✅ **Contexts**: LoadingContext, EvaluationContext
- ✅ **Hooks**: useApiCall, useEvaluationAPI, useEvaluationPreload, useNavigation, usePerformanceAPI, useTools


## 📖 Resources

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started) 