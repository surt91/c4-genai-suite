FROM python:3.14.9-slim-trixie AS builder

WORKDIR /reis

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Copy the deps and lockfile to use caching.
COPY pyproject.toml uv.lock ./

# Install dependencies (all of them are available as prebuilt manylinux wheels, no compiler needed)
RUN uv sync --frozen --no-install-project --no-dev --no-build

#
# RUNTIME
#
FROM python:3.14.9-slim-trixie AS production

# we need these packages for extracting audio streams from videos and handling office formats,
# pango is needed by weasyprint for pdf generation
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        libreoffice-calc-nogui \
        libreoffice-impress-nogui \
        libreoffice-writer-nogui \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 && \
    rm -rf /var/lib/apt/lists/*

# Install fonts for pdf generation. The Microsoft core fonts are in `contrib` and are downloaded
# from SourceForge during the installation; Carlito and Caladea are metric compatible to Calibri and Cambria.
RUN sed -i 's/^Components: main$/Components: main contrib/' /etc/apt/sources.list.d/debian.sources && \
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-crosextra-caladea \
        fonts-crosextra-carlito \
        fonts-dejavu-core \
        fonts-dejavu-extra \
        fonts-droid-fallback \
        fonts-freefont-ttf \
        fonts-liberation \
        ttf-mscorefonts-installer && \
    ls /usr/share/fonts/truetype/msttcorefonts | grep -qi '^arial\.ttf$' && \
    rm -rf /var/lib/apt/lists/* /var/cache/debconf/*-old && \
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
