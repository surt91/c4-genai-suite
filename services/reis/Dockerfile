FROM python:3.14.9-alpine3.24 AS builder

WORKDIR /reis

RUN apk add --no-cache build-base=0.5-r4 linux-headers=7.0.0-r1 rust=1.96.1-r0 cargo=1.96.1-r0

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Copy the deps and lockfile to use caching.
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-install-project --no-dev

#
# RUNTIME
#
FROM python:3.14.9-alpine3.24 AS production

# we need this library for extracting audio streams from videos and handeling office formats
RUN apk add --no-cache \
    ffmpeg=8.1.2-r0 \
    libreoffice-calc=25.8.7.3-r0 \
    libreoffice-impress=25.8.7.3-r0 \
    libreoffice-writer=25.8.7.3-r0
# Install fonts for pdf generation
RUN apk --no-cache add \
    msttcorefonts-installer=3.8.1-r1 \
    fontconfig=2.17.1-r1 \
    font-droid-nonlatin=20200215-r5 \
    font-droid=20200215-r5 \
    font-dejavu=2.37-r6 \
    font-freefont=20120503-r4 \
    ttf-liberation=2.1.5-r2 && \
    update-ms-fonts && \
    fc-cache -f

ENV VIRTUAL_ENV=/reis/.venv \
PATH="/reis/.venv/bin:$PATH"

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

COPY rei_s ./rei_s
COPY logging.conf logging.conf

EXPOSE 3201

HEALTHCHECK CMD python3 -c "import urllib.request, sys; sys.exit(0) if urllib.request.urlopen('http://localhost:3201/health').status == 200 else sys.exit(1)" || exit 1

# At the moment azure-search-documents gives use warning, disable to keep the logs in clean json format
ENV PYTHONWARNINGS="ignore:invalid escape sequence" \
HOST=0.0.0.0

# The fastapi command does not support logging config so use uvicorn instead
CMD ["sh", "-c", "HOST=${HOST:-0.0.0.0}; uvicorn rei_s.app:app --proxy-headers --port 3201 --host \"$HOST\" --log-config logging.conf"]
