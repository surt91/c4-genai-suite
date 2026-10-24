FROM node:26.12.1-alpine3.24 AS base

FROM base AS build
WORKDIR /src

# install the dependencies before copying the sources, so that this layer is cached as long as they do not change
COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

FROM base
WORKDIR /srv

ENV NODE_ENV=production

COPY package*.json .
RUN npm ci --omit=dev
COPY --from=build /src/dist /srv/dist

# after the dependencies: a build argument invalidates the cache of all following RUN instructions
ARG VERSION
# read by the configuration export/import
ENV VERSION=$VERSION

CMD ["node", "dist/main.js"]
