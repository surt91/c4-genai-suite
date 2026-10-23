# Frontend review

Scope: `frontend/` at `a0bc870` (React 19 + Vite + Mantine 9, zustand + react-query 5, own SSE client, generated API
clients), after the chat overhaul (`docs/ux/chat-overhaul.md`). The user-facing chat had priority, the admin area
(including the evals) is covered as well. Paths are relative to `frontend/src/`.

Priorities: **P1** bug/security, **P2** important, **P3** nice-to-have. "Confirmed" means the code path was traced
end to end against the installed library versions (and, where noted, reproduced in a test); "unconfirmed" means
plausible but not verified.

The fix status of every finding is listed in the section *Status* at the end.

## P1 – bugs / security

### P1-1 The previous user's data stays in memory after a new login in the same tab – confirmed (trace)
`pages/login/LoginPage.tsx:100`, `api/state/zustand/appClientStore.ts:23-30`, `components/RouteWhenPrivate.tsx`.
When the session expires, the API middleware navigates client-side to `/login`. The password login then navigates
client-side to `/chat`, so the react-query cache (`['profile']`, `['chats']`, `['chat', id]`) and the zustand stores
(chat list, messages of all opened chats, selected personal files) of the previous user are still there.
Scenario (shared computer): A's session expires, B logs in in the same tab. `RouteWhenPrivate` renders immediately
with A's cached profile (name, e-mail, `isAdmin` → admin menu) and the chat list shows A's conversation titles until
the refetches finish; going back to one of A's conversations shows A's messages from the store until the 403 arrives.
The password login also ignores the `post-login-redirect` cookie (only the OAuth callback honors it).
Fix: after a successful password login, do a full page load (`window.location.assign`) to the stored redirect target
(same-origin paths only) or `/chat`. This drops all client state and honors the redirect.

### P1-2 A network error while loading a chat crashes the whole app – confirmed (trace)
`pages/chat/state/chat.ts:67-79`.
The error effect reads `error.response.status`. The generated client throws a `FetchError` (no `response`) when the
request fails without a response (server not reachable, proxy reset, offline). The effect throws a `TypeError`, and
without an error boundary React unmounts the root: a white page.
Fix: read the status defensively (`error instanceof ResponseError ? error.response.status : undefined`).

### P1-3 Admin files: the row selection is carried over to another bucket, "Remove" deletes the wrong files – confirmed (trace)
`pages/admin/files/FilesPage.tsx:41-46,170-190`, `pages/admin/files/BucketsPage.tsx:78`.
The table has no `getRowId`, so the selection is keyed by row index, and `FilesPage` is the same element for every
`:id`, so selection, filter and page survive a bucket change.
Scenario: select the first two files in bucket A, click bucket B: B shows "2 selected" and the bulk delete removes B's
first two files.
Fix: `getRowId: (file) => String(file.id)` and remount the page per bucket (`key` = id).

### P1-4 Q&A catalogs: pending changes are global and can be saved into another catalog – confirmed (trace)
`pages/admin/evals/qa-catalogs/state.ts`, `pages/admin/evals/qa-catalogs/QaCatalogDetailPage.tsx:39-47`.
The pending changes (additions, updates, deletions) live in a global zustand store that is only cleared by the
version dropdown and after saving. Scenario: add pairs in catalog A, go back to the list, open catalog B: A's
additions are shown in B and "Save all" sends them (and A's pair ids for updates/deletions) to B.
Fix: clear the pending changes when the catalog changes and when the page is left.

## P2 – important

### P2-1 Errors of the chat request before the stream starts are shown as a technical message – confirmed (trace)
`api/state/sse.ts:30-35`, `pages/chat/state/chat.ts:205-210`.
`fetchEventStream` does not look at the status. Every non-SSE response (401 after the session expired, 400/403/404
from guards and pipes, 413/502/504 from the proxy) ends as
`Expected content-type to be text/event-stream, Actual: application/json…` in the answer's error alert, and a 401
does not lead to the login page (unlike every other request). Network errors show the browser's raw message
(`Failed to fetch`).
Fix: throw an error with the status and the server's message for non-2xx responses; in the chat show
"The message could not be sent: <server message>" (localized) or a localized connection error, and redirect to the
login on 401 like the API middleware.

### P2-2 Every streamed chunk re-renders the whole chat page and every chat list entry – confirmed (trace)
`pages/chat/state/chat.ts:39,262,314,329-350`, `pages/chat/ConversationItem.tsx:21`, `pages/chat/ChatPage.tsx:49`.
`useStateOfChat`, `useStateOfMessages` and `useStateOfSelectedAssistantId` subscribe to the whole `chatDataMap`
(a new `Map` per chunk), and `useChatStream`/`useStateMutateMessageRating` subscribe to the whole store. `ChatPage`
(via `useStateOfSelectedAssistantId`) and every `ConversationItem` (via `useStateMutateRemoveChat` →
`useStateOfChat`) therefore render on every chunk: with 200 chats that is 200+ item renders plus the grouping/sorting
of the list per token.
In addition, the `complete` handler of a stream compares against a stale snapshot of the store
(`chatStore.chatDataMap` from the render that started the stream), so the finished subscription is never removed.
Fix: select the needed slices (with stable fallbacks) and read the store with `useChatStore.getState()` in the
stream callbacks.

### P2-3 Editing a question while the answer is generated runs two generations – confirmed (trace)
`pages/chat/conversation/ChatItem/HumanChatItem.tsx:124-150`, `pages/chat/state/chat.ts:93`,
`pages/chat/state/zustand/chatStore.ts` (`cancelActiveStream`).
The composer is disabled while the AI writes, the edit action of a question is not. `sendMessage` only
*unsubscribes* from the running stream (the request continues), so the server finishes and stores the first answer
while it generates the edited one. The client shows only one of them; after a reload the conversation differs.
Fix: no editing while an answer is generated (like the composer).

### P2-4 Blank page when the settings or the profile cannot be loaded – confirmed (trace)
`components/ThemeProvider.tsx:54-56`, `components/RouteWhenPrivate.tsx:15-17`, `components/RouteWhenLoggedOut.tsx`.
Both render `null` until the data is there. When the request fails (backend down, 5xx, network), react-query gives up
after three retries and the page stays white forever without a hint.
Fix: a small error state with "reload" when the query fails.

### P2-5 Closing the "thank you" of the conversation rating overwrites the rating – confirmed (trace)
`pages/Dialog.tsx:53`, `pages/chat/conversation/ChatRating.tsx`, `pages/chat/state/chat.ts:300-307`.
The X of the thank-you card calls `handleResult('dismiss')`, which calls `onSubmit('dismiss')` → the conversation is
rated `unrated` right after it was rated `good`/`bad`. The rating mutation does not update the chat in the store
either, so the card is offered again when the chat is opened again (until the refetch).
Fix: the X of the thank-you card only hides it; store the rating in the chat on success.

### P2-6 Merging the sources mutates the store and duplicates merged metadata – confirmed (trace)
`pages/chat/conversation/ChatItemSources.tsx:40-66`.
`mergeIdenticalSources` writes `metadata.pages` and the merged metadata into the `SourceDto` objects of the message
in the store. Every recomputation (new array of sources while streaming, remount) merges the already merged values
again: `title: "a, b"` becomes `"a, b, b"`, and the pages of the first source are replaced by the formatted string.
Fix: work on copies.

### P2-7 The inspector keeps the placeholder ID of a streamed answer – confirmed (trace)
`pages/chat/conversation/ChatItemTools.tsx:388`, `pages/chat/conversation/ChatItemSources.tsx:32`,
`pages/chat/state/chat.ts` (`saved`), `pages/chat/state/zustand/chatStore.ts` (`stopActiveStream`).
The answer has the ID `-1` until the server sends `saved` at the end. Tool details or a source opened during the
generation are stored with `messageId: -1`; after `saved` (or after stopping, which renumbers the placeholders) the
inspector no longer finds the message ("no details"), and the source passages are requested with message `-1`.
Fix: remap the message ID of the inspector entries when the placeholder gets its real ID.

### P2-8 Transcription: the automatic stop after the maximum duration never stops – confirmed (trace)
`hooks/useTranscribe.ts:156-164`.
The interval calls the `stopRecording` of the render that started the recording, which sees
`recordingState === 'idle'` and returns. After 10 minutes the recording continues and the "maximum duration reached"
notification is shown every 100 ms.
Fix: read the current state through a ref / event callback.

### P2-9 Validation messages are frozen in English – confirmed (trace)
`components/UserProfileModal.tsx:15`, `components/ChatSuggestionsScheme.tsx:6` and the zod schemas of 13 admin
dialogs (`UpsertUserDialog`, `UpsertBucketDialog`, the user-group, metric, LLM endpoint and Q&A dialogs, …).
The schemas (and some option lists, e.g. the metric types) are built at module load with `texts.*`. i18next starts
with `en` and `ThemeProvider` switches to the configured language later, so a German installation shows English
validation errors (e.g. "Passwords do not match").
Fix: build the schemas when they are used.

### P2-10 The selected assistant is not shared between hook instances – confirmed (trace)
`hooks/stored.ts:20-36`, `pages/chat/state/listOfChats.ts:85,123,145`, `pages/chat/state/listOfAssistants.ts:60`.
`usePersistentState` reads `localStorage` once per hook instance. Selecting an assistant in the chat settings updates
only that instance; `useStateMutateRemoveChat`, `useStateMutateRemoveAllChats`, `useMutateNewChat` and
`useStateOfSelectedAssistant` keep the value of their mount. Scenario: change the assistant, delete the current chat:
the new chat gets the previously selected assistant.
Fix: use Mantine's `useLocalStorage`, which synchronizes all instances.

### P2-11 Chat settings: failures to save the options or to change the assistant are not reported – confirmed (trace)
`pages/chat/conversation/ChatSettings.tsx:82,146`, `hooks/conversation-extension-context.ts:352-358`.
The extension options are saved with a fire-and-forget `mutate`: the popover closes as if it worked and the error is
swallowed. Changing the assistant has no error handling either.
Fix: await the update (`mutateAsync`) so the existing error notification is shown; notify on assistant errors.

### P2-12 "0" is rendered in answers – confirmed (trace)
`pages/chat/conversation/ChatItem/AIChatItemActions.tsx:84`, `pages/chat/conversation/ChatItem/AIChatItem.tsx:70`.
`user.isAdmin && tokenCount && …` renders `0` when the token count is 0 (the "0" next to the thumb in the screenshot
of the overhaul doc), and `message.reasoning?.length && …` renders `0` when a reasoning event with empty content
arrived.
Fix: boolean conditions.

### P2-13 Admin evals: lists never show more than one page – confirmed (trace)
`pages/admin/evals/qa-catalogs/QaCatalogsPage.tsx:186`, `pages/admin/evals/metrics/MetricsPage.tsx:99`,
`pages/admin/evals/qa-catalogs/QaCatalogDetailPage.tsx:432-437`, `pages/admin/evals/evaluations/EvaluationsPage.tsx:15`.
The eval API returns pages without a total. These pages pass the length of the current page as `total`, so
`Pagination` never shows (only the first 20 catalogs/metrics/pairs are reachable); the evaluations list has no
pagination at all (`_setPage` unused). The LLM endpoints page already uses a "has more" heuristic.
Fix: one helper for the heuristic, used by all of them.

### P2-14 Admin evals: the detail of a new evaluation is not updated while it is pending – confirmed (trace)
`pages/admin/evals/evaluations/EvaluationDetailPage.tsx:40-51`.
Polling runs only for `RUNNING`; after creating, the evaluation is `PENDING` and the page never refreshes. The
results are only refreshed while their tab is open.
Fix: `refetchInterval` on the queries while `PENDING`/`RUNNING`.

### P2-15 Admin: reloading an eval page redirects to the dashboard – confirmed (trace)
`pages/admin/AdminPage.tsx:142-154`, `api/state/useEvalAvailability.ts`.
While the availability is loading, the eval routes are not registered and the catch-all redirects to the dashboard,
so deep links and reloads of `/admin/evals/...` never work.
`useEvalAvailability` also uses its own `fetch` instead of the generated `EvalApi.getEvalServiceStatus()` (no
`Accept-Language`, no 401 handling, own DTO type).
Fix: render nothing until the availability is known; use the generated client.

### P2-16 Admin buckets: changing endpoint and headers resets the other value – confirmed (trace)
`pages/admin/files/UpsertBucketDialog.tsx:103-118`.
The debounced handler is memoized once and sees the first-render `endpoint`/`headers`. Editing the headers after the
endpoint resets the endpoint to `''`: the file types are not loaded and the form cannot be saved.
Fix: functional state update.

### P2-17 Admin Q&A catalogs: change counters frozen, page and pairs stale – confirmed (trace)
`pages/admin/evals/qa-catalogs/QaCatalogDetailPage.tsx:49,64-83,146,214-219`.
`useMemo(() => getPendingChangeCounts(), [getPendingChangeCounts])` never recomputes (the badges stay at 0); the page
is not reset when the catalog/version changes; the pairs are not refetched when a generation finishes; an upload keeps
pending changes that refer to replaced pairs.
Fix: compute the counts on render; remount per catalog; refetch the pairs on status change; clear pending changes
after upload.

### P2-18 Admin assistants: the previous assistant's extensions are shown after switching – confirmed (trace)
`pages/admin/extensions/ExtensionsPage.tsx:31-98`, same pattern in `pages/admin/files/FilesPage.tsx:38-61`.
The page is not remounted on an `:id` change and renders the extensions from a global store that is only replaced
when the new query resolves; until then assistant B shows A's extensions (editing/deleting them uses B's id with A's
extension id; timing dependent, unconfirmed).
Fix: remount per id and only show the store when it belongs to the shown id.

### P2-19 Admin metric detail: not found / errors show a skeleton forever – confirmed (trace)
`pages/admin/evals/metrics/MetricDetailPage.tsx:61`.
Fix: error/not-found state.

### P2-20 Admin: tables can stay on a page past the end – confirmed (trace)
`pages/admin/files/FilesPage.tsx:189` (`autoResetPageIndex: false`: deleting the last files of the last page or
filtering on page 3 shows an empty "page 3 of 1"), `pages/admin/evals/llm-endpoints/LlmEndpointsPage.tsx:321-323`
(deleting the last item of the last page).
Fix: clamp the page.

### P2-21 Admin evals: large parts are not translated – confirmed
The evaluation wizard steps (`create/steps/*`), `EvaluationDetailPage` ("Evaluation in Progress", "Overview",
"Results", …), `EvaluationCard`, `TestCaseResultsTable`, `TestCasesPieChart`, `MetricDonutChart`, `QaPairsTable`
("context(s)"), `DashboardPage` ("Version:") use hard-coded English, partly with `'s'` plurals.
Fix: move the strings to `texts` (de/en).

### P2-22 Server state is mirrored into zustand stores – confirmed (trace)
Chat: the chat list and both assistant lists are copied from react-query into stores
(`pages/chat/state/listOfChats.ts`, `listOfAssistants.ts`, with a `refetch` function stored in zustand). Admin:
users, user groups, buckets, files, configurations and extensions are copied as well, mutations patch the stores
instead of the query cache, and the same entity has several query keys (`['configurations']`,
`` [`configurations_${lang}`] ``, …). This causes the stale-data bugs above (P2-18, P1-3) and flashes of old data.
Cost: two sources of truth per entity, every new page has to keep them in sync.
Fix: read from the queries and update/invalidate the query cache; drop the stores step by step.

## P3 – nice to have

### P3-1 The month groups of the chat list are always English – confirmed
`pages/chat/ConversationItems.tsx:35`: `format(date, 'LLLL')` uses date-fns' default locale ("October" in the German
UI). Fix: `Intl.DateTimeFormat(i18next.language, { month: 'long' })`.

### P3-2 Enter during IME composition sends the message – confirmed (trace)
`pages/chat/conversation/ChatInput.tsx:155-157`, `HumanChatItem.tsx:96-98`: confirming a Japanese/Chinese candidate
with Enter submits. Fix: ignore `event.nativeEvent.isComposing`. Whitespace-only messages can be sent as well
(trim check), and the edit textarea keeps a cancelled edit.

### P3-3 Invalid chat IDs are not handled like unknown chats – confirmed (trace)
`pages/chat/state/chat.ts:59-79`: `/chat/abc` requests `/conversations/NaN` (400), retries three times and shows
"failed to load" on an empty page instead of going to a new chat like a 404. Fix: treat 400 like 404.

### P3-4 Dead / misleading code in the chat – confirmed
`ConversationPage.tsx:46` `&& !!history` checks the global `window.history` (always true);
`texts/index.ts` maps `chat.updateRating.ratingHint` and `dashboard.users.filterInterval.*` to keys that do not
exist (unused); `useConversationBucketAvailabilities` and `useUserBucket` are the same hook for two bucket types and
request the availability of assistant `-1` before the assistants are loaded. Fix: remove, merge, `enabled: id > 0`,
and a test that every text key exists.

### P3-5 In-app docs: one request per chat, missing checks – confirmed (trace)
`components/InAppDocsProvider.tsx:74-87`: the query key is the full path (`/chat/1`, `/chat/2`, … each fetch
`/docs/chat/index.md` again), `response.ok` is not checked, and the close button of the admin panel has no
accessible name. Fix: key by the normalized path, check `ok`, `aria-label`.

### P3-6 An edited question keeps its old ID – confirmed (trace)
`pages/chat/state/chat.ts` (`saved`): an edit stores a new human message, but the `saved` event is applied to the
placeholder ID `0`, which does not exist for edits. Fix: apply it to the edited message.

### P3-7 Links in answers: detection of external links – confirmed (trace)
`components/Markdown.tsx:83-102`: links are external when they start with `http`/`mailto`. `HTTPS://…` or
protocol-relative `//host` links are passed to the router, whose `pushState` throws for other origins. Fix: compare
the origin of the resolved URL.

### P3-8 The chat conversation and its extension arguments are fetched twice – confirmed
`hooks/conversation-extension-context.ts:346-350` fetches `getConversation` again for the extension arguments, which
`['chat', id]` already contains. Deferred (small cost, touches the settings flow).

### P3-9 Transcription only works with WebM – unconfirmed
`hooks/useTranscribe.ts:128-131`: `MediaRecorder` with `audio/webm` throws in Safari. A fallback needs a check of the
formats the transcription backend accepts.

### P3-10 Admin: smaller issues – confirmed unless noted
- Icon-only buttons without accessible name (`QaCatalogsPage.tsx:154`, `FilesPage.tsx:228`, `BucketsPage.tsx:60`,
  `AddQaPairDialog`/`EditQaPairDialog`, `TestCaseResultsTable`, `components/Pagination.tsx`, `TablePagination.tsx`).
- Click-only table rows (`<tr onClick>`) and the sort toggle of `FilterableTable` are not keyboard accessible.
- `TestCaseResultsTable.tsx:218-221`: fragment without key in a list.
- Whitespace-only names pass validation (`z.string().min(1)`), `EditEvaluationNameDialog` sends an empty name.
- `AssistantSelectionStep`/`MetricsSelectionStep` show "none available" on errors.
- Errors are reported twice (toast in the hook plus `FormAlert`), manual `refetch()` after `invalidateQueries`.
- `UpsertBucketDialog.tsx:72` uses `texts.theme.updateFailed` for buckets.
- Logo and catalog uploads have no `accept`/type check, `UploadQaCatalogDialog.tsx:233` logs with `console.log`.
- Components called as functions (`UpdateMetricDialog`, `UpdateLlmEndpointDialog`), `any` for the configurations.
- `components/Logo.tsx:41`: object URLs of the preview are never revoked.
- Metric search (`useMetricQueries.ts:12-15`) has no effect: the eval API has no search parameter.
- The wizard loads at most 100 catalogs/metrics (`CatalogSelectionStep.tsx:13`, `MetricsSelectionStep.tsx:18`).
- `UpsertLlmEndpointDialog.tsx:37`: the API key is optional on create (unconfirmed whether the backend rejects it).

### P3-11 Test gaps
No tests for the SSE error handling, the chat stream state (`useChatStream`), the rating dialog, the transcription,
`QaCatalogDetailPage`, `FilesPage`, `ExtensionsPage`, `EvaluationDetailPage`, `useEvalAvailability`/eval routing.

## Checked, not an issue
- Markdown is rendered without raw HTML; `react-markdown` strips unsafe URLs, highlight.js output is escaped, KaTeX
  runs with `trust: false`. React 19 blocks `javascript:` URLs in `href` (source links).
- All `target="_blank"` links have `rel="noopener noreferrer"`; the URL card opens only after consent with
  `noopener,noreferrer`, the backend only allows `https:` (and `http://localhost` outside production).
- `AuditLogPage` uses `dangerouslySetInnerHTML` with jsondiffpatch's HTML formatter, which escapes keys and values.
- Deleting a personal file from the composer only unlinks it from the conversation (backend `DeleteFile` with
  `conversationId`).
- de/en translations have the same keys (`de` is typed as `typeof en`).

## Status

To be filled in with the fixes.
