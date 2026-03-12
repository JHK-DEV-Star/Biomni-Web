#!/bin/bash

# OTLP instrumented Uvicorn launch (environment-variable based endpoints)
exec opentelemetry-instrument \
    --service_name "${OTEL_SERVICE_NAME:-aigen-backend}" \
    --exporter_otlp_endpoint "${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4317}" \
    --exporter_otlp_protocol "grpc" \
    --traces_exporter otlp \
    --metrics_exporter otlp \
    --logs_exporter otlp \
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
