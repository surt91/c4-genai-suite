# Backend

## Description

The backend is based on [Nest](https://github.com/nestjs/nest).

## Installation

Install npm dependencies
```bash
$ npm install
```

Copy the `.env.example` to `.env` and modify as desired.

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

## Create migrations

Migrations are used to keep the database in sync with the entities.
Whenever a change is made to the entities a migration file should be created.
The commands (except `migration:create`) build the backend first and run TypeORM on the compiled `dist/`.

```bash
# create empty migration file with name <migration>
npm run migration:create --name=<migration>

# generate migration based on diff between typeorm entities and database
npm run migration:generate --name=<migration>

# generate migration dry run
npm run migration:generate:dryrun

# run all pending migrations
npm run migration:run

# reverts the latest migration
npm run migration:revert
```

## Langfuse

To enable langfuse tracing, the following environment variables need to be set:

```
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_BASEURL="https://cloud.langfuse.com"
```

The spans of the AI SDK (`experimental_telemetry`) are sent via OTLP/HTTP to `<LANGFUSE_BASEURL>/api/public/otel`
(Basic auth with `<public key>:<secret key>`), all other spans are dropped. The conversation id is set as Langfuse
session (`langfuse.session.id`), assistant and model are sent as metadata.

## Create Extensions

Each extension class needs to meet the following criteria:
- class need to include the decorator @Extension
- class need to implement the interface Extension
- class must be added to the providers list in src/extensions/module.ts

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
