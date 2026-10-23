# Messaging

## Technologies
- [NestJS Controller](https://docs.nestjs.com/controllers)
- [CQRS](https://docs.nestjs.com/recipes/cqrs)
- [Server Sent Events](https://docs.nestjs.com/techniques/server-sent-events)


## Patterns
- [CommandBus (CQRS)](patterns/CommandBus.md)
- [Middleware (custom)](patterns/Middleware.md)

## Message Handling
There are two types of middleware which are used to process incoming messages
* Default Middlewares which are static and always called in a specific order
* Extension Middlewares which are dynamically configured and attached within the default middlewares

### Default Middleware

#### ExceptionMiddleware
- catches all errors happending during the middleware calls
- errors are written via the sse socket to the client

#### CheckUsageMiddleware
- checks if the user has enough tokens to use llm

- no token check when:
  - user belongs to `BUILTIN_USER_GROUP_DEFAULT`
  - user belongs to `BUILTIN_USER_GROUP_ADMIN`
  - user has no group
  - user group `monthlyTokens` is lower 0
  - user group `monthlyUserTokens` is lower 0

- throws error if not enough tokens are present

#### UIMiddleware
- sets a callback handler to write ui specific messages to the sse socket

#### GetHistoryMiddleware
- adds the history to the context

#### GetUserMiddleware
- extends the user data in the context

#### LangfuseMiddleware
- enables the AI SDK telemetry (`context.telemetry`) when Langfuse is configured

#### ChooseLllMiddleware
- when no llm is present in context it sets the first given of the llms

#### DefaultPromptMiddleware
- adds a prompt to the context if there is non

#### RenderPromptMiddleware
- replaces the placeholders of the system prompts, see [Templates](#templates)

#### ExecutorMiddleware
checks executorEndpoint
- if defined sends request it to the endpoint
- if not defined calls execute middleware

#### ExecuteMiddleware
- uses the context to send commands to the langchain agent
- streams langchain results to the sse socket

#### UpdateLllMiddleware (based on ChooseLllMiddleware)
- when no llm is present returns immediately
- when llm is present updates conversation with llm

#### SummarizeHistoryMiddleware
- updates conversation with history

#### CompleteMiddleware
- sents token usage to the sse socket

#### StorageUsageMiddleware
- tracks the token usage and writes it to the db

### Extension Middleware

#### Llm middleware
- adds llm to context

#### Tool middleware
- adds tools to context

#### Prompt middleware
- adds prompts to context

## Message processing

![Messaging](plantuml/image/messaging.png)

## Message Context

![Context](plantuml/image/context.png)

## Templates

System prompts and the values of MCP tool attributes may contain placeholders that are replaced at runtime
(`src/lib/template.ts`):

- `{{ name }}` or `{{name}}` is replaced by the value of the variable, dotted paths address nested values
  (`{{ user.email }}`).
- Unknown variables, `null` and `undefined` become an empty string, other values are converted with `String()`.
- Values are inserted as they are, without HTML escaping.
- There is no further template syntax: tags (`{% if %}`, `{% for %}`), filters (`{{ name | upper }}`), expressions
  and comments (`{# #}`) are not evaluated but kept as literal text.

Variables of system prompts: `date`, `timestamp`, `llm_name`, `llm_provider`, `user`, `assistant`,
`assistant_description`.

Variables of MCP tool attribute values: `value` (the value defined by the LLM or the user), `language` and the
properties of the chat context, e.g. `conversationId`, `user.id`, `user.name`, `user.email`,
`configuration.name`.

Templates used to be rendered with nunjucks (with HTML escaping of the values); templates that rely on
tags, filters or expressions need to be rewritten.
