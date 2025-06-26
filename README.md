# Goldmine

```bash
# run
docker compose up
```

## External access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: http://localhost:5432
- Example Model: http://localhost:6000

## Development

## Adding New Tools
1. Create tool directory in `tools/`
2. Implement `ModelInterface` from `goldmine.toolkit.interface`
3. Implement tool logic in `tools/my-tool/tool.py`
4. Create `app.py` in the tool directory to expose the FastAPI app
5. Create `Dockerfile` in the tool directory to build the tool image
6. Add tool to compose.yml in tools/
7. Create `pyproject.toml` in the tool directory to manage dependencies
8. Backend auto-discovers tools from compose file :rocket:

## Local Development
```bash
# Rebuild after code changes
docker compose down
docker compose build
docker compose up
```

```bash
# rebuild without cache if it's not working
docker compose down
docker compose build --no-cache
docker compose up
```

## Python Development (uv)
```bash
# Install uv if you don't have it
# curl -LsSf https://astral.sh/uv/install.sh | sh

# Initialise uv, do this in each tool directory,
# as well as the root directory,
# and maybe even in the backend directory too lol
uv sync

# Add dependencies if needed
uv add package-name

# Update lockfile after adding dependencies
uv lock
```


[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=19698121&assignment_repo_type=AssignmentRepo)
