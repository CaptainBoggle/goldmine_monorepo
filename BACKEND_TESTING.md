# Backend Testing

## Testing Stack

| Tool | Purpose | Usage |
|------|---------|-------|
| pytest | Core testing framework | Async support, fixtures, parameterisation |
| pytest-cov | Coverage reporting | Statement coverage with missing line tracking |
| pytest-asyncio | Async test execution | Proper event loop management |
| pytest-postgresql | Real database testing | Integration tests with actual PostgreSQL |
| pytest-mock | Enhanced mocking | Patching and mock object creation |

## Testing Strategy

### Unit Tests
Individual component isolation with comprehensive mocking.

| Layer | Components | Test Focus |
|-------|------------|------------|
| Backend Services (internal) | Database, Tool, Corpus Ingestion | Connection mgmt, discovery, transactions |
| API Routers (frontend facing) | Corpora, Predictions, Metrics, Tool Proxy | CRUD ops, error handling, HTTP responses |
| Goldmine Toolkit (dev facing) | Model Interface, API Framework, Types | State mgmt, validation, database integration |

### Integration Tests
Component interactions with real dependencies:
- PostgreSQL database with actual transactions
- Full schema creation and migration testing
- Complete request/response cycles
- Error propagation across layers

## Mocking Strategy

### External Dependencies

```python
# Tool communication mocking
@pytest.fixture
def mock_httpx_responses():
    return {
        "status": {"state": "ready", "message": "Tool is ready"},
        "predict": {"results": [...], "processing_time": 0.1},
        "batch_predict": {"results": [...], "processing_time": 0.2}
    }

# Service dependency mocking
@pytest.fixture  
def mock_tool_service(mock_tool_discovery_info):
    mock_service = Mock()
    mock_service.get_discovered_tools.return_value = mock_tool_discovery_info
    return mock_service
```

### File System Operations
- Docker Compose YAML parsing with controlled test content
- Corpus directory discovery using temporary directories  
- Configuration file loading with predefined test data

## Testing Limitations

### Custom Tool Source Code
The test suite covers the backend platform and goldmine toolkit but does not test the actual tool implementations located in the `tools/` directory. Each tool container runs independently and contains:

- Model-specific inference logic (e.g., PhenoBERT, PhenoTagger implementations)
- Custom wrapper code that adapts models to the goldmine toolkit interface
- Tool-specific dependencies and model loading procedures

Tools are treated as external black-box services by the backend. The platform tests tool integration through HTTP API calls but not the internal tool logic. This is by design, as not all tools will be written in Python, may require special hardware, or have other unique requirements. Not only this, but since many tools are git submodules that may be modified upstream, it is likely that their behaviour could change without notice, causing test failures. The tool interface itself is very robust and performs extensive validation to ensure compatibility, so any tool that passes the interface validation will work correctly with the backend, and invalid tools are handled gracefully.

(also having to run all the tools each time you want to test would probably be around 100x slower)

Tool correctness is validated through manual system testing against known corpora (see gold_corpus_small) and tool-specific validation during container startup.

## Running Tests

### Basic Commands
```bash
# Full test suite with coverage
# Ensure you are running this from the project root
uv run -m pytest
```

### Adding New Tests
1. Follow existing naming conventions (`test_*.py`)
2. Use appropriate fixtures from `conftest.py`
3. Mock external dependencies consistently
4. Test both success and failure scenarios
5. Ensure proper async handling for concurrent operations
6. Aim for 100% code coverage

### Test Data Management
- Use fixtures for reusable test data
- Create minimal test datasets for performance
- Isolate test data between test runs
- Clean up resources in test teardown

## Coverage Report

Latest execution results:

```
============================================ test session starts =============================================
platform darwin -- Python 3.13.0, pytest-8.4.1, pluggy-1.6.0 -- /Users/boggle/capstone-project-3900-t18a-date/
.venv/bin/python3                                                                                             
cachedir: .pytest_cache
rootdir: /Users/boggle/capstone-project-3900-t18a-date
configfile: pytest.ini
testpaths: backend goldmine
plugins: anyio-4.9.0, asyncio-1.1.0, cov-6.2.1, postgresql-7.0.2
asyncio: mode=Mode.AUTO, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 244 items                                                                                          

[... 244 tests passed ...]

=============================================== tests coverage ===============================================
______________________________ coverage: platform darwin, python 3.13.0-final-0 ______________________________

Name                                                   Stmts   Miss  Cover   Missing
------------------------------------------------------------------------------------
backend/app/dependencies.py                                4      0   100%
backend/app/main.py                                       37      0   100%
backend/app/routers/__init__.py                            0      0   100%
backend/app/routers/corpora.py                            68      0   100%
backend/app/routers/metrics.py                            54      0   100%
backend/app/routers/predictions.py                        58      0   100%
backend/app/routers/tool_proxy.py                         72      0   100%
backend/app/routers/tools.py                              14      0   100%
backend/app/services/corpus_ingestion.py                  73      0   100%
backend/app/services/database.py                          28      0   100%
backend/app/services/tool_service.py                      53      0   100%
backend/tests/__init__.py                                  0      0   100%
backend/tests/conftest.py                                 92      0   100%
backend/tests/test_conftest_fixtures.py                    8      0   100%
backend/tests/test_dependencies.py                        15      0   100%
backend/tests/test_main.py                               108      0   100%
backend/tests/test_routers/test_corpora.py               149      0   100%
backend/tests/test_routers/test_metrics.py               113      0   100%
backend/tests/test_routers/test_predictions.py           216      0   100%
backend/tests/test_routers/test_tool_proxy.py            177      0   100%
backend/tests/test_routers/test_tools.py                  56      0   100%
backend/tests/test_services/test_corpus_ingestion.py     197      0   100%
backend/tests/test_services/test_database.py              81      0   100%
backend/tests/test_services/test_tool_service.py         112      0   100%
goldmine/__init__.py                                       0      0   100%
goldmine/corpus_base.py                                   17      0   100%
goldmine/tests/__init__.py                                 0      0   100%
goldmine/tests/conftest.py                                18      0   100%
goldmine/tests/test_corpus_base.py                       117      0   100%
goldmine/tests/test_toolkit_api.py                       332      0   100%
goldmine/tests/test_toolkit_interface.py                 283      0   100%
goldmine/tests/test_types.py                             304      0   100%
goldmine/toolkit/__init__.py                               0      0   100%
goldmine/toolkit/api.py                                   77      0   100%
goldmine/toolkit/interface.py                             83      0   100%
goldmine/types.py                                        182      0   100%
------------------------------------------------------------------------------------
TOTAL                                                   3198      0   100%
============================================ 244 passed in 25.79s ============================================
```
