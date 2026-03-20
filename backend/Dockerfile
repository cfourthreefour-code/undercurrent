FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy application code
COPY src/ src/

# Copy pre-computed data (graph, metrics, communities, people)
COPY output/ output/

EXPOSE 8000

CMD uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
