#!/bin/bash

# This script is used to run the backend service with HTTPS support
nginx &
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --proxy-headers