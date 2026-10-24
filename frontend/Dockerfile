FROM node:26.12.1-alpine3.24 AS build
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
# after `npm ci`: a build argument invalidates the cache of all following RUN instructions
ARG VERSION
RUN VITE_VERSION="$VERSION" npm run build


FROM caddy:2.11.7

RUN setcap -r /usr/bin/caddy

WORKDIR /srv

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv

EXPOSE 3080

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
