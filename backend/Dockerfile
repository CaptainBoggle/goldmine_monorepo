FROM ghcr.io/astral-sh/uv:python3.13-bookworm

WORKDIR /app

COPY pyproject.toml uv.lock /app/
COPY goldmine/pyproject.toml /app/goldmine/pyproject.toml
COPY backend/pyproject.toml /app/backend/pyproject.toml

COPY goldmine/ /app/goldmine/

WORKDIR /app/backend

RUN uv sync --frozen --package goldmine-backend

COPY backend/app/ /app/backend/app/

# Copy the tools/compose.yml for tool discovery
COPY tools/compose.yml /app/tools/compose.yml

# Copy corpora directory to the container
COPY corpora/ /app/corpora/

# Copy run script
COPY backend/run.sh /app/run.sh

# Make the run script executable
RUN chmod +x /app/run.sh

# Generate self-signed certificate and install nginx for reverse proxy
RUN apt-get update && apt-get install -y openssl nginx && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /app/certs && \
    openssl req -x509 -newkey rsa:4096 -keyout /app/certs/key.pem -out /app/certs/cert.pem -sha256 -days 365 -nodes -subj "/C=AU/ST=NSW/L=Sydney/O=UNSW/OU=CSE/CN=localhost" && \
    echo "daemon off;" >> /etc/nginx/nginx.conf && \
    rm /etc/nginx/sites-enabled/default

# Create nginx config for the reverse proxy
RUN echo "server { \
        listen 8000; \
        server_name localhost; \
        location / { \
            proxy_pass http://127.0.0.1:8001; \
            proxy_set_header Host \$host; \
            proxy_set_header X-Real-IP \$remote_addr; \
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
            proxy_set_header X-Forwarded-Proto \$scheme; \
        } \
    } \
    server { \
        listen 8443 ssl; \
        server_name localhost; \
        ssl_certificate /app/certs/cert.pem; \
        ssl_certificate_key /app/certs/key.pem; \
        location / { \
            proxy_pass http://127.0.0.1:8001; \
            proxy_set_header Host \$host; \
            proxy_set_header X-Real-IP \$remote_addr; \
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
            proxy_set_header X-Forwarded-Proto \$scheme; \
        } \
    }" > /etc/nginx/sites-enabled/goldmine.conf

EXPOSE 8000
EXPOSE 8443

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["/app/run.sh"]
