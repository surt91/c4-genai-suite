# Changelog

## [10.2.0](https://github.com/surt91/c4-genai-suite/compare/v10.1.0...v10.2.0) (2025-10-13)


### Features

* backup-feature ([#10](https://github.com/surt91/c4-genai-suite/issues/10)) ([103de48](https://github.com/surt91/c4-genai-suite/commit/103de48bd928ac7c19c9839a275088a0bd184660))


### Bug Fixes

* fix rp ([#12](https://github.com/surt91/c4-genai-suite/issues/12)) ([67d0079](https://github.com/surt91/c4-genai-suite/commit/67d0079fb4b4f67465c67d9f4bb9e4b84309ebba))
* some fix ([#13](https://github.com/surt91/c4-genai-suite/issues/13)) ([3eabe48](https://github.com/surt91/c4-genai-suite/commit/3eabe48af457871959517a4eeb17e210ab43eb8d))

## [10.1.0](https://github.com/surt91/c4-genai-suite/compare/v10.0.1...v10.1.0) (2025-10-13)


### Features

* **frontend:** frontend feature ([6364781](https://github.com/surt91/c4-genai-suite/commit/6364781524fb160d7accf4bf289657679cead657))
* **frontend:** frontend feature ([90b561b](https://github.com/surt91/c4-genai-suite/commit/90b561b58526148f46112d61cea9e839bee3d6b2))

## [10.0.1](https://github.com/surt91/c4-genai-suite/compare/v10.0.0...v10.0.1) (2025-10-13)


### Bug Fixes

* frontend fix ([5018dfa](https://github.com/surt91/c4-genai-suite/commit/5018dfa85a84ac7931df57d4828d2d281ee9a32e))
* frontend fix ([7d34abc](https://github.com/surt91/c4-genai-suite/commit/7d34abcfc44fb52f9095042e45f60b0aea3a81e0))

## [10.0.0](https://github.com/surt91/c4-genai-suite/compare/v9.0.0...v10.0.0) (2025-10-13)


### ⚠ BREAKING CHANGES

* **ingress:** make tls section optional, no default cluster issuer

### helm

* **ingress:** make tls section optional, no default cluster issuer ([6525a4b](https://github.com/surt91/c4-genai-suite/commit/6525a4b7702208e6ec0032f0fd54379ba0de5e0c))


### Features

* add bedrock embeddings ([#406](https://github.com/surt91/c4-genai-suite/issues/406)) ([36c2dca](https://github.com/surt91/c4-genai-suite/commit/36c2dca45ce0c355f16e6383b9955f8124f46221))
* add gpt-image-1 tool to generate images ([#468](https://github.com/surt91/c4-genai-suite/issues/468)) ([a508b29](https://github.com/surt91/c4-genai-suite/commit/a508b29d49f32ec30d5eb88de469639996275bee))
* add responses and files api endpoint ([#387](https://github.com/surt91/c4-genai-suite/issues/387)) ([c08c415](https://github.com/surt91/c4-genai-suite/commit/c08c415a4df5b8ec47e79c0a25c4901adc700a40))
* ai sdk integration ([#474](https://github.com/surt91/c4-genai-suite/issues/474)) ([ff55b23](https://github.com/surt91/c4-genai-suite/commit/ff55b2328fc0df3acd9403f9d901ccb4f112afcf))
* **backend:** replace langchain by ai-sdk ([#481](https://github.com/surt91/c4-genai-suite/issues/481)) ([c1e19fd](https://github.com/surt91/c4-genai-suite/commit/c1e19fd69c87f9022bd3afd6a48899e963afeafe))
* **frontend:** enhance-assistant-selection ([#379](https://github.com/surt91/c4-genai-suite/issues/379)) ([7d54903](https://github.com/surt91/c4-genai-suite/commit/7d5490370beb9a833e9a6e0af2d73891746ca96f))
* introduce debug logging requests for nvidia extension ([#543](https://github.com/surt91/c4-genai-suite/issues/543)) ([1de3f8a](https://github.com/surt91/c4-genai-suite/commit/1de3f8a8eca9be1095565b48dc9531756b546694))
* make assistants in use deletable ([#513](https://github.com/surt91/c4-genai-suite/issues/513)) ([5ce32a3](https://github.com/surt91/c4-genai-suite/commit/5ce32a3bb92e37e5cee2db5b20e6301b47c4f3f4))
* new feature in frontend ([dafd8db](https://github.com/surt91/c4-genai-suite/commit/dafd8db58d0757bfc4ec572cbf299fde3c65edb1))
* **REIS/Helm:** store AWS access key entirely in secret ([0452b0d](https://github.com/surt91/c4-genai-suite/commit/0452b0d4dd46a4ae2eb3cfd6ba6a5f32a17853af))
* **REIS/Helm:** update values, add tests ([72d3a72](https://github.com/surt91/c4-genai-suite/commit/72d3a72a45521b1088b1b052e89545da17796e13))
* **REIS/Helm:** wrong values for bedrock aws access keys, typos ([8542957](https://github.com/surt91/c4-genai-suite/commit/85429570f63d28fbf285935ff1496ae0177eba61))
* **REIS:** add nvidia embeddings ([74878a2](https://github.com/surt91/c4-genai-suite/commit/74878a27025ea479980f3a955a88eb3f604b4661))
* users can change password ([#362](https://github.com/surt91/c4-genai-suite/issues/362)) ([52fb177](https://github.com/surt91/c4-genai-suite/commit/52fb177c5b842b3f9545fb810f7b0546b3d4bc4c))
* view uploaded documents when referenced ([#524](https://github.com/surt91/c4-genai-suite/issues/524)) ([45726d2](https://github.com/surt91/c4-genai-suite/commit/45726d27eb560b729937d7dcef674ce94ff88f6d))


### Bug Fixes

* **backend:** increase failureThreshold in startupProbe to 5 ([#418](https://github.com/surt91/c4-genai-suite/issues/418)) ([1471650](https://github.com/surt91/c4-genai-suite/commit/14716501b4bc70e062f86a72fb1c208d63dce927))
* create user button too small ([#459](https://github.com/surt91/c4-genai-suite/issues/459)) ([0aec8ac](https://github.com/surt91/c4-genai-suite/commit/0aec8ac0bdfaf99ac39a03d5597ae81fed07bb95))
* flaky configuration test ([#408](https://github.com/surt91/c4-genai-suite/issues/408)) ([3024240](https://github.com/surt91/c4-genai-suite/commit/302424070113b6c688aa60e895f804b5da45f189))
* increase timeout to 60s, some models take longer to respond ([#417](https://github.com/surt91/c4-genai-suite/issues/417)) ([8b53db7](https://github.com/surt91/c4-genai-suite/commit/8b53db7956b84e7ae3d6b894305199e6c4bbc899))
* move example extensions code and remove unnecessary dev prefixes ([#461](https://github.com/surt91/c4-genai-suite/issues/461)) ([7715157](https://github.com/surt91/c4-genai-suite/commit/77151573a723ad86f7a2e349cf087e556b7aff57))
* prepend default image tags with `v` followed by the Chart version ([7a10d12](https://github.com/surt91/c4-genai-suite/commit/7a10d127ade7497fbaaaa0fa317cc35b980c0b45))
* **REIS:** fix type error of port parameter ([2344bf0](https://github.com/surt91/c4-genai-suite/commit/2344bf0b483ca66bc70da998783a3aa8e72ef60d))
* show specific errors to the user ([#523](https://github.com/surt91/c4-genai-suite/issues/523)) ([6d5c3ef](https://github.com/surt91/c4-genai-suite/commit/6d5c3ef3704e3cfebf595ef925cb67a558ead1f0))
* temperature display ([#458](https://github.com/surt91/c4-genai-suite/issues/458)) ([eae8cb3](https://github.com/surt91/c4-genai-suite/commit/eae8cb3fe5bf8c1450dff17f2f7eccf47c4e0b39))
* use caddy from official caddy image ([#445](https://github.com/surt91/c4-genai-suite/issues/445)) ([5d3905c](https://github.com/surt91/c4-genai-suite/commit/5d3905c601aee16a362a87c568c7fbfb523b1712))


### Reverts

* ignore release-please branches in quality-gate workflow ([90d9884](https://github.com/surt91/c4-genai-suite/commit/90d98847a009aee6d9deb64cf05ec216cbd31cca))

## [9.0.0](https://github.com/surt91/c4-genai-suite/compare/v8.5.1...v9.0.0) (2025-10-13)


### ⚠ BREAKING CHANGES

* **ingress:** make tls section optional, no default cluster issuer

### helm

* **ingress:** make tls section optional, no default cluster issuer ([6525a4b](https://github.com/surt91/c4-genai-suite/commit/6525a4b7702208e6ec0032f0fd54379ba0de5e0c))


### Features

* add bedrock embeddings ([#406](https://github.com/surt91/c4-genai-suite/issues/406)) ([36c2dca](https://github.com/surt91/c4-genai-suite/commit/36c2dca45ce0c355f16e6383b9955f8124f46221))
* add gpt-image-1 tool to generate images ([#468](https://github.com/surt91/c4-genai-suite/issues/468)) ([a508b29](https://github.com/surt91/c4-genai-suite/commit/a508b29d49f32ec30d5eb88de469639996275bee))
* add responses and files api endpoint ([#387](https://github.com/surt91/c4-genai-suite/issues/387)) ([c08c415](https://github.com/surt91/c4-genai-suite/commit/c08c415a4df5b8ec47e79c0a25c4901adc700a40))
* ai sdk integration ([#474](https://github.com/surt91/c4-genai-suite/issues/474)) ([ff55b23](https://github.com/surt91/c4-genai-suite/commit/ff55b2328fc0df3acd9403f9d901ccb4f112afcf))
* **backend:** replace langchain by ai-sdk ([#481](https://github.com/surt91/c4-genai-suite/issues/481)) ([c1e19fd](https://github.com/surt91/c4-genai-suite/commit/c1e19fd69c87f9022bd3afd6a48899e963afeafe))
* **frontend:** enhance-assistant-selection ([#379](https://github.com/surt91/c4-genai-suite/issues/379)) ([7d54903](https://github.com/surt91/c4-genai-suite/commit/7d5490370beb9a833e9a6e0af2d73891746ca96f))
* introduce debug logging requests for nvidia extension ([#543](https://github.com/surt91/c4-genai-suite/issues/543)) ([1de3f8a](https://github.com/surt91/c4-genai-suite/commit/1de3f8a8eca9be1095565b48dc9531756b546694))
* make assistants in use deletable ([#513](https://github.com/surt91/c4-genai-suite/issues/513)) ([5ce32a3](https://github.com/surt91/c4-genai-suite/commit/5ce32a3bb92e37e5cee2db5b20e6301b47c4f3f4))
* **REIS/Helm:** store AWS access key entirely in secret ([0452b0d](https://github.com/surt91/c4-genai-suite/commit/0452b0d4dd46a4ae2eb3cfd6ba6a5f32a17853af))
* **REIS/Helm:** update values, add tests ([72d3a72](https://github.com/surt91/c4-genai-suite/commit/72d3a72a45521b1088b1b052e89545da17796e13))
* **REIS/Helm:** wrong values for bedrock aws access keys, typos ([8542957](https://github.com/surt91/c4-genai-suite/commit/85429570f63d28fbf285935ff1496ae0177eba61))
* **REIS:** add nvidia embeddings ([74878a2](https://github.com/surt91/c4-genai-suite/commit/74878a27025ea479980f3a955a88eb3f604b4661))
* users can change password ([#362](https://github.com/surt91/c4-genai-suite/issues/362)) ([52fb177](https://github.com/surt91/c4-genai-suite/commit/52fb177c5b842b3f9545fb810f7b0546b3d4bc4c))
* view uploaded documents when referenced ([#524](https://github.com/surt91/c4-genai-suite/issues/524)) ([45726d2](https://github.com/surt91/c4-genai-suite/commit/45726d27eb560b729937d7dcef674ce94ff88f6d))


### Bug Fixes

* **backend:** increase failureThreshold in startupProbe to 5 ([#418](https://github.com/surt91/c4-genai-suite/issues/418)) ([1471650](https://github.com/surt91/c4-genai-suite/commit/14716501b4bc70e062f86a72fb1c208d63dce927))
* create user button too small ([#459](https://github.com/surt91/c4-genai-suite/issues/459)) ([0aec8ac](https://github.com/surt91/c4-genai-suite/commit/0aec8ac0bdfaf99ac39a03d5597ae81fed07bb95))
* flaky configuration test ([#408](https://github.com/surt91/c4-genai-suite/issues/408)) ([3024240](https://github.com/surt91/c4-genai-suite/commit/302424070113b6c688aa60e895f804b5da45f189))
* increase timeout to 60s, some models take longer to respond ([#417](https://github.com/surt91/c4-genai-suite/issues/417)) ([8b53db7](https://github.com/surt91/c4-genai-suite/commit/8b53db7956b84e7ae3d6b894305199e6c4bbc899))
* move example extensions code and remove unnecessary dev prefixes ([#461](https://github.com/surt91/c4-genai-suite/issues/461)) ([7715157](https://github.com/surt91/c4-genai-suite/commit/77151573a723ad86f7a2e349cf087e556b7aff57))
* prepend default image tags with `v` followed by the Chart version ([7a10d12](https://github.com/surt91/c4-genai-suite/commit/7a10d127ade7497fbaaaa0fa317cc35b980c0b45))
* **REIS:** fix type error of port parameter ([2344bf0](https://github.com/surt91/c4-genai-suite/commit/2344bf0b483ca66bc70da998783a3aa8e72ef60d))
* show specific errors to the user ([#523](https://github.com/surt91/c4-genai-suite/issues/523)) ([6d5c3ef](https://github.com/surt91/c4-genai-suite/commit/6d5c3ef3704e3cfebf595ef925cb67a558ead1f0))
* temperature display ([#458](https://github.com/surt91/c4-genai-suite/issues/458)) ([eae8cb3](https://github.com/surt91/c4-genai-suite/commit/eae8cb3fe5bf8c1450dff17f2f7eccf47c4e0b39))
* use caddy from official caddy image ([#445](https://github.com/surt91/c4-genai-suite/issues/445)) ([5d3905c](https://github.com/surt91/c4-genai-suite/commit/5d3905c601aee16a362a87c568c7fbfb523b1712))


### Reverts

* ignore release-please branches in quality-gate workflow ([90d9884](https://github.com/surt91/c4-genai-suite/commit/90d98847a009aee6d9deb64cf05ec216cbd31cca))
