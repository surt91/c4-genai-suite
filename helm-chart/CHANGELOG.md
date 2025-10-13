# Changelog

## [9.0.0](https://github.com/surt91/c4-genai-suite/compare/helm-chart-v8.5.1...helm-chart-v9.0.0) (2025-10-13)


### ⚠ BREAKING CHANGES

* **ingress:** make tls section optional, no default cluster issuer

### helm

* **ingress:** make tls section optional, no default cluster issuer ([6525a4b](https://github.com/surt91/c4-genai-suite/commit/6525a4b7702208e6ec0032f0fd54379ba0de5e0c))


### Features

* add bedrock embeddings ([#406](https://github.com/surt91/c4-genai-suite/issues/406)) ([36c2dca](https://github.com/surt91/c4-genai-suite/commit/36c2dca45ce0c355f16e6383b9955f8124f46221))
* **backend:** replace langchain by ai-sdk ([#481](https://github.com/surt91/c4-genai-suite/issues/481)) ([c1e19fd](https://github.com/surt91/c4-genai-suite/commit/c1e19fd69c87f9022bd3afd6a48899e963afeafe))
* introduce debug logging requests for nvidia extension ([#543](https://github.com/surt91/c4-genai-suite/issues/543)) ([1de3f8a](https://github.com/surt91/c4-genai-suite/commit/1de3f8a8eca9be1095565b48dc9531756b546694))
* **REIS/Helm:** store AWS access key entirely in secret ([0452b0d](https://github.com/surt91/c4-genai-suite/commit/0452b0d4dd46a4ae2eb3cfd6ba6a5f32a17853af))
* **REIS/Helm:** update values, add tests ([72d3a72](https://github.com/surt91/c4-genai-suite/commit/72d3a72a45521b1088b1b052e89545da17796e13))
* **REIS/Helm:** wrong values for bedrock aws access keys, typos ([8542957](https://github.com/surt91/c4-genai-suite/commit/85429570f63d28fbf285935ff1496ae0177eba61))
* **REIS:** add nvidia embeddings ([74878a2](https://github.com/surt91/c4-genai-suite/commit/74878a27025ea479980f3a955a88eb3f604b4661))
* view uploaded documents when referenced ([#524](https://github.com/surt91/c4-genai-suite/issues/524)) ([45726d2](https://github.com/surt91/c4-genai-suite/commit/45726d27eb560b729937d7dcef674ce94ff88f6d))


### Bug Fixes

* **backend:** increase failureThreshold in startupProbe to 5 ([#418](https://github.com/surt91/c4-genai-suite/issues/418)) ([1471650](https://github.com/surt91/c4-genai-suite/commit/14716501b4bc70e062f86a72fb1c208d63dce927))
* increase timeout to 60s, some models take longer to respond ([#417](https://github.com/surt91/c4-genai-suite/issues/417)) ([8b53db7](https://github.com/surt91/c4-genai-suite/commit/8b53db7956b84e7ae3d6b894305199e6c4bbc899))
* prepend default image tags with `v` followed by the Chart version ([7a10d12](https://github.com/surt91/c4-genai-suite/commit/7a10d127ade7497fbaaaa0fa317cc35b980c0b45))
