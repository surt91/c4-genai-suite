# Changelog

## 1.0.0 (2026-10-24)


### ⚠ BREAKING CHANGES

* **frontend:** `npm run generate-eval-api` is gone, `npm run generate-api` generates both frontend clients.
* deployments with the Microsoft login must set AUTH_MICROSOFT_TENANT (helm: backend.auth.microsoftTenant) to the ID of their tenant; the backend does not start otherwise.
* local development and the images now require Node 26.
* **backend:** the backend is an ES module package; tests run with vitest.
* the `user-args-test` extension is no longer available in production; assistants that still have it configured skip it.
* `PUT /api/buckets/:id/files/:fileId` and `GET /api/users/:id` are gone. To replace a file, delete it and upload it again; to look up a user, use `GET /api/users?query=…`.
* extensions installed as `@gaible/extensions/*` packages are no longer loaded; extensions have to be part of the backend source.
* the `open-api` extension is gone. Expose tools via MCP instead. Assistants that still have it configured skip it ("Extension is not supported anymore").
* the `azure-ai-search` extension is gone. Assistants that still have it configured skip it ("Extension is not supported anymore").
* the `dall-e` and `azure-dall-e` extensions are gone. Use `gpt-image-1` or `azure-gpt-image-1` instead. Assistants that still have them configured skip them ("Extension is not supported anymore").
* the `bing-web-search` extension is gone. Assistants that still have it configured skip it ("Extension is not supported anymore"); importing configurations that contain it fails.
* the executorEndpoint/executorHeaders fields are removed from the configuration API (ConfigurationDto, UpsertConfigurationDto, ExportedConfigurationDto) and the columns are dropped from the database, so existing executor settings are lost. Assistants that used an executor now answer with their configured LLM.
* **frontend:** custom theme CSS can no longer use Tailwind/daisyUI classes or variables (except --color-primary/--color-primary-content).
* **backend:** user-provided templates (system prompts, MCP tool attribute values) no longer support nunjucks tags (`{% if %}`, `{% for %}`, ...), filters (`{{ x | upper }}`), expressions or comments; they are kept as literal text instead of being evaluated. Values are no longer HTML-escaped (nunjucks autoescaping turned e.g. `O'Brien` into `O&#39;Brien` in prompts and MCP arguments).
* **backend:** the DuckDuckGo web search tool extension is no longer available; use the Brave or Bing web search tools or an MCP server instead.
* **backend:** the "Grounding with Bing" tool extension is no longer available; assistants using it lose this tool (use the Bing or Brave web search tools or an MCP server instead).
* `npm run dev`, `npm run env` and docker-compose-dev.yml are gone; use `docker compose up --build`.
* env vars C4_* are now GAIBLE_*, the helm chart is named gaible, the default database is gaible and container images are published under ghcr.io/surt91/gaible.

### Features

* **backend:** remove the "Grounding with Bing" tool ([1e54998](https://github.com/surt91/gaible/commit/1e54998e92b2c2982bb1c28a957ee5bad0c6ebab))
* **backend:** remove the DuckDuckGo search tool ([1b3e1df](https://github.com/surt91/gaible/commit/1b3e1df89454a9c871401925c3318bad5302a1d6))
* **backend:** replace nunjucks with plain placeholder substitution ([0405081](https://github.com/surt91/gaible/commit/0405081312b04b73b604216460653075583a59b6))
* chat settings as chips in the composer and the profile for all users ([4c12ce4](https://github.com/surt91/gaible/commit/4c12ce4ae1cfc6a0b4f947fd59398a4499570bd1))
* **chat:** pick the assistant in the conversation header ([#25](https://github.com/surt91/gaible/issues/25)) ([ca69a0f](https://github.com/surt91/gaible/commit/ca69a0f1f711e4486bb8ff61ea1c7cba113ba2e9))
* **compose:** configure OpenAI-compatible embedding servers for REI-S ([#28](https://github.com/surt91/gaible/issues/28)) ([ae1097b](https://github.com/surt91/gaible/commit/ae1097b7459d95afe51fcc2a49c81beab9199a87))
* **frontend:** add the accent color and a wordmark to the logo ([6fedf90](https://github.com/surt91/gaible/commit/6fedf9014745f60309e547b6c0c2ee584fd51dba))
* **frontend:** add the Gaible logo and favicon ([a539fbc](https://github.com/surt91/gaible/commit/a539fbce77d4409830caab03669b768288bd9909))
* **frontend:** delete chats with undo and rename them with a Mantine input ([43dea31](https://github.com/surt91/gaible/commit/43dea3196e53e3a5fe2ec9f1e9301e79f9e82725))
* **frontend:** reactive chat layout with a header and the inspector ([6543d0d](https://github.com/surt91/gaible/commit/6543d0d6c3361364b44112499bc707e9d42a2a35))
* **frontend:** show an empty state in the chat when there is no assistant ([2a29c07](https://github.com/surt91/gaible/commit/2a29c0757a7e68ea09e64e01bc7ad936716ba218))
* **frontend:** switch to Mantine notifications and add shared chat building blocks ([6a80456](https://github.com/surt91/gaible/commit/6a80456faeaeecb71842c2ec2944764bee827fe7))
* **frontend:** tool cards and inline cards for forms, confirmations and URL requests ([2fe75a0](https://github.com/surt91/gaible/commit/2fe75a07f42c9b15150746da0622515103810dd6))
* **helm:** restrict the access to REI-S with a NetworkPolicy by default ([8323d8d](https://github.com/surt91/gaible/commit/8323d8d051e231ead31896d4ebf1e3d1b72424cc))
* interaction results, tool errors, URL elicitation and restorable chats in the API ([af41b23](https://github.com/surt91/gaible/commit/af41b23b884e28cf6ad3a1bf64751f5e963e4628))
* new logo showing a branching conversation and indigo as default primary color ([dd2d9de](https://github.com/surt91/gaible/commit/dd2d9de35f21ef14818168edeab72fa3e68e9178))
* personal files in a popover of the composer ([6889aea](https://github.com/surt91/gaible/commit/6889aeaca0f8f0effa12cd06c64c12d0b3ee5d85))
* prefill the REI-S endpoint when creating a bucket ([#27](https://github.com/surt91/gaible/issues/27)) ([7789017](https://github.com/surt91/gaible/commit/778901706aab6d4d1390712ceda9d980e9e6d01d))
* register the user args test extension only outside of production ([36f0352](https://github.com/surt91/gaible/commit/36f0352e21759457e8b466a331f45e8bf9a998b7))
* remove the Azure AI Search tool ([7e522eb](https://github.com/surt91/gaible/commit/7e522eb221ba46071204350aecbb24f95dab30cf))
* remove the Bing web search tool ([f429192](https://github.com/surt91/gaible/commit/f429192c28ee00fb34072256f405efb2a65548c4))
* remove the DALL-E image generation tools ([f167b0b](https://github.com/surt91/gaible/commit/f167b0ba7fa4281e5b1f54bcff9ff227d5f7096f))
* remove the executor feature ([dd9968c](https://github.com/surt91/gaible/commit/dd9968cb8dc9358975d7859d0a5e7d7877f12333))
* remove the OpenAPI "Tools-Server" extension ([99b3982](https://github.com/surt91/gaible/commit/99b398211d02a419f0f5835889e8e50479c93faa))
* remove the unused putFile and getUser endpoints ([9c60591](https://github.com/surt91/gaible/commit/9c60591ca7ee528ea2305c085a66287ca2caee3c))
* stop loading extensions dynamically from node_modules ([9f30050](https://github.com/surt91/gaible/commit/9f300506ec639ad18068c9438a3cd0345b786eab))
* stop the generation of an answer ([aa2b143](https://github.com/surt91/gaible/commit/aa2b143c1b44f0c27dcce23593d9905c1513a7cf))


### Bug Fixes

* accessibility and robustness of the new chat UI ([545a518](https://github.com/surt91/gaible/commit/545a51837b0dd9894aa5a9a7f58dd78ca6592998))
* **backend:** abort the generation when the SSE client disconnects ([1d19aa9](https://github.com/surt91/gaible/commit/1d19aa939f01f059d075b435a936a0e698f20248))
* **backend:** allow any file name in document downloads ([11af3ae](https://github.com/surt91/gaible/commit/11af3ae182bc5dbc96e40e4e1b6e07f69d9b9841))
* **backend:** answer password changes of users without password with 400 ([e9085ee](https://github.com/surt91/gaible/commit/e9085eeaf2cef21b4b427131eefb7049abbed527))
* **backend:** answer POST /responses with 200 and document it ([4a1aa54](https://github.com/surt91/gaible/commit/4a1aa54a9797ce65f05a7b5e7fc4f4a5c874edaf))
* **backend:** apply the configured history size of the summary extension ([19405a4](https://github.com/surt91/gaible/commit/19405a43552e67737a27a3a49ffb4ec7116747a8))
* **backend:** bind pending chat UI forms to user and conversation ([f7c861a](https://github.com/surt91/gaible/commit/f7c861ab3042230d47dc50435786e38b285dcab1))
* **backend:** call OpenAPI tools by the name the tool server listed ([de5ddb0](https://github.com/surt91/gaible/commit/de5ddb0dd41e0fbd1d7e746767c182829c0ca462))
* **backend:** check assistant access before using it in the responses API ([473af8a](https://github.com/surt91/gaible/commit/473af8a34d231664ef71a9d81ac58941d9ff2ca0))
* **backend:** check assistant access when sending a message ([c577a39](https://github.com/surt91/gaible/commit/c577a393d2f40c6993ee21e484b53838ca28bb59))
* **backend:** close MCP clients after use ([75eb897](https://github.com/surt91/gaible/commit/75eb897c4afb280e1641f0e827b6ad42e217a90c))
* **backend:** continue the chat when an MCP server is unreachable ([cf335d1](https://github.com/surt91/gaible/commit/cf335d1e349aed17e9d4030c963cb4a91c70a908))
* **backend:** count tokens of aborted and failed answers ([6db62f1](https://github.com/surt91/gaible/commit/6db62f1c2f7b21e6b5958d9af123ad1992df66f1))
* **backend:** debug request logging must not buffer streams or leak keys ([b10cf35](https://github.com/surt91/gaible/commit/b10cf359f037390e9c8e4f0927f735d863170e64))
* **backend:** delete REI-S documents from the right index and on failures ([b34ad54](https://github.com/surt91/gaible/commit/b34ad54775a6279e261f74b9ea89198e67814d8b))
* **backend:** delete the files and REI-S documents of purged conversations and deleted users ([9347c04](https://github.com/surt91/gaible/commit/9347c04a1d3df19eb8dd1ae72abccb88aff75ccd))
* **backend:** delete the generated images of purged conversations and deleted users ([5a2f052](https://github.com/surt91/gaible/commit/5a2f052c0061d9b6c8fd8adb4db209a8357ea3d9))
* **backend:** do not reveal registered e-mail addresses on login ([ca7941a](https://github.com/surt91/gaible/commit/ca7941ae773c76e812ecc6247adf012b36d458f5))
* **backend:** do not share OpenAPI tool instances between users ([b1e2360](https://github.com/surt91/gaible/commit/b1e236087fed87ab3590a6df3db3a49ae74d23c2))
* **backend:** expire sessions on the server side ([e1a194e](https://github.com/surt91/gaible/commit/e1a194e8f9e98c587f3ad630cfedf510e05fdedd))
* **backend:** forward multipart bodies and query strings through the eval proxy ([ba33584](https://github.com/surt91/gaible/commit/ba3358487fa5f060c59e4e7218d086176c0373ec))
* **backend:** generate unique extension ids when importing configurations ([ac7770a](https://github.com/surt91/gaible/commit/ac7770a1845a6e2892e15f4114626dbb7ccccabb))
* **backend:** hash AUTH_INITIALUSER_APIKEY before storing it ([6542dc9](https://github.com/surt91/gaible/commit/6542dc9298eba59b282bc21343e908a89e45d05c))
* **backend:** hide executor credentials from regular users ([2c17de7](https://github.com/surt91/gaible/commit/2c17de7fa95a13e7d1d9497a24b71b1b5f4e3056))
* **backend:** include nested values in the chat cache key ([0ea8a9f](https://github.com/surt91/gaible/commit/0ea8a9f91f8b27ae395d60e2838ff2394e3e5297))
* **backend:** limit uploads and restrict uploads without bucket ([a65b2d4](https://github.com/surt91/gaible/commit/a65b2d4a0051f53db188755f1305a58855aa03c4))
* **backend:** mask secrets in rebuilt extensions and check the extension type ([f1789d9](https://github.com/surt91/gaible/commit/f1789d9cf7cfe41983668301ec80cc6fb5e100eb))
* **backend:** number duplicated conversations by the user's own titles ([df93829](https://github.com/surt91/gaible/commit/df938293fe116d91b65eafc5668317bd375b87fc))
* **backend:** only allow own files when sending a message ([0bb7fa5](https://github.com/surt91/gaible/commit/0bb7fa5b5e3040ce1988657ba0b7bd62da21c92f))
* **backend:** only edit messages of the same conversation ([ba2cd77](https://github.com/surt91/gaible/commit/ba2cd775795084bde2c4b0c4364aedaa13f52256))
* **backend:** parse configured headers with one shared parser ([76205f3](https://github.com/surt91/gaible/commit/76205f3d12f68ff9df7e96676eabe09f3788930d))
* **backend:** parse the enabled query parameter of GET /configurations ([c25f284](https://github.com/surt91/gaible/commit/c25f28443fa0f3140261dd3782f208ef9e6aee91))
* **backend:** prevent open redirect after login ([ca95888](https://github.com/surt91/gaible/commit/ca95888db2e894cbabae62b96a4db1656cc7e887))
* **backend:** regenerate the session id on login ([a04d5b1](https://github.com/surt91/gaible/commit/a04d5b1adf005d708db6ce1c307c88801d43adbe))
* **backend:** reject missing or invalid input with 400 instead of 500 ([785d313](https://github.com/surt91/gaible/commit/785d313e3a6332e41e5058d638cff94acd41c58a))
* **backend:** reject more missing or invalid input with 4xx instead of 500 ([2423450](https://github.com/surt91/gaible/commit/2423450d460cd64edbdb58aed85c42fb4c608d0f))
* **backend:** report token limits to the user and count only tokens ([2929b59](https://github.com/surt91/gaible/commit/2929b593f3c25b1019200bd22212c75e4932db4f))
* **backend:** request the user:email scope for GitHub logins ([0613851](https://github.com/surt91/gaible/commit/061385143474d5cc39caa6925e84bd5a9fe2abb7))
* **backend:** responses API model selection and file metadata ([4168a70](https://github.com/surt91/gaible/commit/4168a70797d4c5a36ced8c56a7d5707f4d2f79d7))
* **backend:** restrict reading buckets to admins ([2b64129](https://github.com/surt91/gaible/commit/2b64129a6b78332711965c8ddebdc68278da1f07))
* **backend:** restrict reading extension configurations to admins ([8f9a98c](https://github.com/surt91/gaible/commit/8f9a98ce3327582fd599505d0e4cda1ceb0e85e5))
* **backend:** send the executor history with the correct message types ([7d0ef34](https://github.com/surt91/gaible/commit/7d0ef3431d7aa3b9913496dcf45b905f22b892a0))
* **backend:** send the reasoning effort to OpenAI compatible and NVIDIA models ([ed34611](https://github.com/surt91/gaible/commit/ed34611a9386296f0dabcafbbf70805c54fcd0d6))
* **backend:** serve only images and logos by blob id, with nosniff ([5294c6d](https://github.com/surt91/gaible/commit/5294c6d9ff1f530072e76fc70d6043afbd038be8))
* **backend:** stable user pagination and search by name or e-mail ([5784201](https://github.com/surt91/gaible/commit/5784201985534652aa66fb7225e3803dab7b3248))
* **backend:** use SameSite=Lax for the session cookie ([e98d5c2](https://github.com/surt91/gaible/commit/e98d5c27f3da402dbd1536b4c08b8f8dc3317029))
* **backend:** validate numeric path parameters ([6f1a85d](https://github.com/surt91/gaible/commit/6f1a85db69706218a6183bacf2e43aba19673725))
* **backend:** warn when Microsoft logins are not limited to a tenant ([ce0306c](https://github.com/surt91/gaible/commit/ce0306ca592bff4dcedcb23892ba3e8c2728f899))
* bake VERSION into the backend image ([d3ac33b](https://github.com/surt91/gaible/commit/d3ac33baa8316b3071e20bd264f1e8e6224dd365))
* **ci:** build mcp helper image with unpinned packages and pin helm version ([e1ddeba](https://github.com/surt91/gaible/commit/e1ddeba54d983e2e8e80a8da51f968f4545afd2d))
* **ci:** drop stale helm Chart.lock and regenerate chart README ([7ebb800](https://github.com/surt91/gaible/commit/7ebb8003af1e8c9b081ea427814b820c6682a897))
* **ci:** run e2e on ubuntu-24.04 and split e2e steps ([744ff40](https://github.com/surt91/gaible/commit/744ff407355ed37f6264463e4af3b514af50c98f))
* **compose:** pull the published main images by default ([beaadfe](https://github.com/surt91/gaible/commit/beaadfecacf7ff453530481c0dfce40be3de7631))
* **confluence-importer:** import each page of large spaces only once ([f7d973a](https://github.com/surt91/gaible/commit/f7d973a816ff6b7f0221bb12619cad5dde7f9f0e))
* declare express and @ai-sdk/provider as backend dependencies ([a913791](https://github.com/surt91/gaible/commit/a913791b219a7e172c74a01936e1a9186c601162))
* **dev:** advertise completions capability in the MCP proxy ([c78d4ea](https://github.com/surt91/gaible/commit/c78d4eaf4bbc0781b4da039f6c67f3789d1a9abf))
* do not store the masked secrets of an imported configuration ([d8bade3](https://github.com/surt91/gaible/commit/d8bade350e324a7d054ea57a8e7883152a9cb0a0))
* **frontend:** closing the thanks for a conversation rating does not reset the rating ([22d3abf](https://github.com/surt91/gaible/commit/22d3abf34a7c499d34a9ad530261e1d658b934d8))
* **frontend:** create validation messages in the language of the installation ([d453a00](https://github.com/surt91/gaible/commit/d453a008cd0a625d4e9fbdacee7d1192d2d232e7))
* **frontend:** detect external links in answers by their origin ([e2811e3](https://github.com/surt91/gaible/commit/e2811e38d0b061211a78763eb83ea6e095e27e7c))
* **frontend:** do not accept evaluation names of only spaces ([6241f46](https://github.com/surt91/gaible/commit/6241f461fbfc3607dc209929cc68524909cb4ad1))
* **frontend:** do not allow to edit a question while an answer is generated ([66eca30](https://github.com/surt91/gaible/commit/66eca303494f34ae9118880c23a169b2c0139da0))
* **frontend:** do not change the sources of a message when merging them ([6eb6ae4](https://github.com/surt91/gaible/commit/6eb6ae4e7130d585b97c20711867bb9aa0a310bb))
* **frontend:** do not crash when a chat cannot be loaded because of a network error ([4fcb897](https://github.com/surt91/gaible/commit/4fcb8973258fc5db153270ff6a7ef93eb6d62fff))
* **frontend:** do not keep the selection of files when another bucket is shown in the admin area ([bc93275](https://github.com/surt91/gaible/commit/bc932750d3f4ae157b6344a43c995cb7817a4a5b))
* **frontend:** do not re-render the chat page and the chat list on every streamed chunk ([7196abc](https://github.com/surt91/gaible/commit/7196abc9bcb0eedde9ac24728fc48bcfcd9b140a))
* **frontend:** do not render a 0 for a token count of 0 or empty reasoning ([fa29eb7](https://github.com/surt91/gaible/commit/fa29eb75e6adb120f30e4ad0dd553efe029aec0c))
* **frontend:** do not send messages while composing with an input method or without text ([5b8e8fc](https://github.com/surt91/gaible/commit/5b8e8fc549a7d363e4d2da1594a610e16d67039c))
* **frontend:** do not show the extensions of the previous assistant in the admin area ([b48f137](https://github.com/surt91/gaible/commit/b48f1378e9f0016e8747a1e0e226306fb3cb2b62))
* **frontend:** do not stay on a page past the end of the files of a bucket ([6eac139](https://github.com/surt91/gaible/commit/6eac139cc3901ace43908b480984bd261060eb97))
* **frontend:** give the icon buttons of the admin area an accessible name ([b5ebafe](https://github.com/surt91/gaible/commit/b5ebafe092e6b0761ce79bdc902bcb744ece9ebd))
* **frontend:** keep eval pages on reload and load the eval status with the generated client ([f5ca7fa](https://github.com/surt91/gaible/commit/f5ca7fa3be5350304320d633e9b6fac97a2cef19))
* **frontend:** keep the composer popovers above the composer and within the viewport ([bdf33d3](https://github.com/surt91/gaible/commit/bdf33d3f1b9752f30b7c975482fd4f10ca2eca4a))
* **frontend:** keep the endpoint of a bucket when its headers are changed ([b3874bb](https://github.com/surt91/gaible/commit/b3874bb94ab0e2ee799f33c18cd49eb1b123f5f2))
* **frontend:** keep the pending changes of a Q&A catalog with the catalog and update their counters ([44a6580](https://github.com/surt91/gaible/commit/44a6580d97108f0ee2ea2af1b7c6b855859e272e))
* **frontend:** keep tool details and sources in the inspector when the answer gets its ID ([e142f95](https://github.com/surt91/gaible/commit/e142f95354c4f3d0ee61931097d9464c9547d368))
* **frontend:** label the buttons of the pagination ([4228f3b](https://github.com/surt91/gaible/commit/4228f3ba6a3ef0ea2c05a2fcb251958eef8ee1f8))
* **frontend:** load the application again after a password login to drop the data of a previous session ([9cf5afa](https://github.com/surt91/gaible/commit/9cf5afa6c97cfbfd76f6198a9cec59d91b6d0985))
* **frontend:** load the in-app docs once per kind of page and label their close button ([d8ffc8d](https://github.com/surt91/gaible/commit/d8ffc8d6799bee52434d0c36fa04f91f5f0b19a9))
* **frontend:** only offer images for the logo upload ([4537b06](https://github.com/surt91/gaible/commit/4537b063a3da618d1a34ee9d25154b5bf7e0f37f))
* **frontend:** open the rows of the admin tables with the keyboard ([cc7d151](https://github.com/surt91/gaible/commit/cc7d151de6653fa2ed5bba9553333c363326c4f6))
* **frontend:** page through all lists of the evals ([3e807bf](https://github.com/surt91/gaible/commit/3e807bfaa2963c059364ad4bd83d263bea44e447))
* **frontend:** release the object URLs of logo previews ([20169c8](https://github.com/surt91/gaible/commit/20169c86d24af4561d657d3f0c0bfc870ecf1450))
* **frontend:** remove null properties from the API responses again ([5d2ce2e](https://github.com/surt91/gaible/commit/5d2ce2eddd55c498f3605cfa3262c01f69e7a779))
* **frontend:** remove text entries without translation and a dead condition ([13c554d](https://github.com/surt91/gaible/commit/13c554d0f4ca51c0277cd05d31e237ee57972d59))
* **frontend:** report a failed bucket update once and with the right text ([6442b90](https://github.com/surt91/gaible/commit/6442b902ef8baf408b775249a7b73d21d3739219))
* **frontend:** report failures to save the chat settings ([292ac33](https://github.com/surt91/gaible/commit/292ac33edea58344769a3386d85528d80d531149))
* **frontend:** share the selected assistant between all components ([4e8df98](https://github.com/surt91/gaible/commit/4e8df9887704109b8490f896631391e833898db4))
* **frontend:** show an error instead of a skeleton when a metric cannot be loaded ([e7c400b](https://github.com/surt91/gaible/commit/e7c400b17f4d8f7c16fce7f14035b39286836ba4))
* **frontend:** show an error instead of a white page when the settings or the profile cannot be loaded ([96691c1](https://github.com/surt91/gaible/commit/96691c198539c906659631e62b48094cf4929d36))
* **frontend:** show the months of the chat list in the language of the installation ([5587c98](https://github.com/surt91/gaible/commit/5587c98f4ed6bd8170b6423744cab8259bf7f8a6))
* **frontend:** show the server's message and go to the login when sending a chat message fails ([4178137](https://github.com/surt91/gaible/commit/4178137bfb8624c5602756ea81890bc3a3b1fdea))
* **frontend:** stop the transcription recording after the maximum duration ([2b5cdda](https://github.com/surt91/gaible/commit/2b5cddaef0ca87e1b63ed29c1bd6ab48fd830ee4))
* **frontend:** translate the evals and the remaining texts of the admin area ([bbec3fb](https://github.com/surt91/gaible/commit/bbec3fb3bb71393421fe07959b2d714aabf847e2))
* **frontend:** treat invalid chat IDs in the URL like unknown chats ([8b1a12b](https://github.com/surt91/gaible/commit/8b1a12b15556038e191017c58b34c3b476b32027))
* **frontend:** update the details of an evaluation while it is pending ([3618e7e](https://github.com/surt91/gaible/commit/3618e7e6785a899fd7c8280d8e0daa9f2b4e3498))
* generate the REI-S spec with the existing script ([aac7827](https://github.com/surt91/gaible/commit/aac782700e4a5db5d1b8383e2cecd01d2f460158))
* **reis:** accept text files with BOM or legacy encoding ([275241d](https://github.com/surt91/gaible/commit/275241dccbb34eb5be8db9907a1b6dc4e4501f61))
* **reis:** clean up transcription temp files on errors and keep the last segment ([64c0071](https://github.com/surt91/gaible/commit/64c00714b3392071a8ddd02452cae3b3ad9944d1))
* **reis:** convert large audio/video files to the pdf preview in-process ([ed920d6](https://github.com/surt91/gaible/commit/ed920d6a6b5e11ed4da6a964f068ff3d119ef675))
* **reis:** do not fail searches with chunks of disabled formats ([45ae3d4](https://github.com/surt91/gaible/commit/45ae3d4402e986bccd3542a277b2f82f70cc626c))
* **reis:** do not hang on crashed subprocesses or leak their office previews ([6e5e036](https://github.com/surt91/gaible/commit/6e5e036fc614ea06349735d653f6b9f314b4a875))
* **reis:** do not load external resources when rendering pdf previews ([1cb4cd2](https://github.com/surt91/gaible/commit/1cb4cd2035de2e789b0385cc679a924c456111a9))
* **reis:** do not return ffmpeg output in error responses ([814b637](https://github.com/surt91/gaible/commit/814b637fd5a22fdf1436d56c53d1d50b0ef3fc01))
* **reis:** escape values in Azure AI Search filters ([01b58ab](https://github.com/surt91/gaible/commit/01b58ab42556f5900f25c2927259a93cb9723b3e))
* **reis:** name the right variables in configuration errors ([9acb95a](https://github.com/surt91/gaible/commit/9acb95a298d2effcf2cfecd3db968a1df3139951))
* **reis:** reject non-positive take values with 422 ([a22ccb2](https://github.com/surt91/gaible/commit/a22ccb2f22a2324405079a348c00b7c7d054987e))
* **reis:** replace chunks on re-upload and roll back failed uploads ([9800c4f](https://github.com/surt91/gaible/commit/9800c4f35d83e6703a594cc2b81f1de39e38ed65))
* **reis:** reuse the file store and do not hide S3 bucket errors ([b23bfb8](https://github.com/surt91/gaible/commit/b23bfb8c80e9bb13e6ff1f363f0faea1a310bc19))
* **reis:** share one database connection pool between pgvector indexes ([e94275a](https://github.com/surt91/gaible/commit/e94275a7af4c757bb590a7e799d4c26e2172fede))
* **reis:** split swift with the swift rules and match code extensions case-insensitively ([8645e1b](https://github.com/surt91/gaible/commit/8645e1bb0016e8b33fd30c2aadd27ff7713f27f5))
* **reis:** store uploads under random temp names and clean up aborted uploads ([6826e33](https://github.com/surt91/gaible/commit/6826e331f20cb9ecd2983fbce0c3a5433562b7dd))
* **reis:** stream pdf previews and make file store deletes idempotent ([af14f39](https://github.com/surt91/gaible/commit/af14f3942b685fcdf8648766cd4bb7b7a3c06f0d))
* **reis:** time out hanging LibreOffice and ffmpeg runs ([1950b98](https://github.com/surt91/gaible/commit/1950b987a03ebb10ba1a1c29561e4523a9d5b8b1))
* **reis:** transcribe audio and video only once per upload ([5816960](https://github.com/surt91/gaible/commit/5816960d4e00f03ca921ad364448cd9ed7f55154))
* **reis:** transcribe audio with any sample rate and channel count ([7a01e63](https://github.com/surt91/gaible/commit/7a01e63bc94966ee185590ac67644e95f459b05b))
* require a specific tenant for the Microsoft login ([3e20466](https://github.com/surt91/gaible/commit/3e2046694fe0cb14683cd0d894d64af75ca6a6b5))


### Performance Improvements

* **reis:** check the existence of an Azure AI Search index only once ([a27f16a](https://github.com/surt91/gaible/commit/a27f16a2d7405980f7af5bc975da1758d8885faf))
* **reis:** parse pdfs from the file instead of reading them into memory ([5297ed4](https://github.com/surt91/gaible/commit/5297ed4a62c32a6177893c6b3d745dbe3eb040ac))


### Code Refactoring

* **frontend:** remove Tailwind CSS and daisyUI ([22ea9a0](https://github.com/surt91/gaible/commit/22ea9a0b774e75deababb29378abb8c2c6e37c6c))
* rebrand fork as Gaible ([a7f0e70](https://github.com/surt91/gaible/commit/a7f0e7066620fca0f4c4ff9c9c6140d1b29b5caf))


### Build System

* **backend:** migrate to ESM and vitest ([2f1dc35](https://github.com/surt91/gaible/commit/2f1dc35086aa6fbadaf957ac1f2314ccd65c16a2))
* **frontend:** generate the API clients without Java ([9ab9cd8](https://github.com/surt91/gaible/commit/9ab9cd8690d57dafd41848fcf5d18764bea870ad))
* provide a single docker compose setup ([ddfb239](https://github.com/surt91/gaible/commit/ddfb239f515a76bc380a0956a2f0e58ae0224297))
* switch to Node 26 ([bb3ec85](https://github.com/surt91/gaible/commit/bb3ec85af5b0d7a5683c37201cdf6e7fdbdc9f76))

## Changelog

Gaible is a fork of an Apache-2.0-licensed upstream project.
The history of changes before the fork is available in the git history of this repository.
