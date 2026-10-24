FROM node:26.12.1-alpine3.24 AS base

FROM base AS build
WORKDIR /src

COPY . .

RUN npm ci --include=dev
RUN npm run build

FROM base
ARG VERSION
WORKDIR /srv

ENV NODE_ENV=production
# read by the configuration export/import
ENV VERSION=$VERSION

COPY package*.json .
RUN npm ci --omit=dev
COPY --from=build /src/dist /srv/dist

CMD ["node", "dist/main.js"]
