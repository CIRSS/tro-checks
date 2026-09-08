# Capabilities

What each expectation in [`exports/`](exports) depends on, named without its `.schema.json` suffix. A capability is a JSON Schema construct; the number beside it is the demo in [`CIRSS/json-schema-demos`](https://github.com/CIRSS/json-schema-demos) that demonstrates it. Capability names and demo numbers are that gallery's, from its [`CAPABILITIES.md`](https://github.com/CIRSS/json-schema-demos/blob/main/CAPABILITIES.md).

Every expectation uses `dialect-declaration` (`22`), `id-and-anchor` (`13`), `error-message` (`19`), `type` (`02`), and `annotations` (`06`). The table below lists what each uses beyond those.

| Expectation | Tier | Capabilities used |
| --- | --- | --- |
| `has-well-formed-context` | 0 | `type-applicability` (`05`), `properties` (`02`), `items` (`03`) |
| `has-well-formed-graph` | 0 | `type-applicability` (`05`), `properties` (`02`), `items` (`03`) |
| `is-node-object-or-array-of-them` | 0 | `type-applicability` (`05`), `items` (`03`) |
| `composition-fingerprint` | 1 | `type-applicability` (`05`), `properties` (`02`), `required` (`04`), `items` (`03`) |
| `hash-form` | 1 | `type-applicability` (`05`), `properties` (`02`), `required` (`04`), `items` (`03`), `const` (`10`), `pattern` (`07`), `defs-and-ref` (`12`) |
| `tro-minimal` | 1 | `required` (`04`) |
| `trs-typed` | 1 | `type-applicability` (`05`), `properties` (`02`), `required` (`04`), `items` (`03`), `const` (`10`), `contains` (`18`), `if-then-else` (`11`) |
| `context-base` | 2 | `type-applicability` (`05`), `properties` (`02`), `required` (`04`), `contains` (`18`), `if-then-else` (`11`) |
| `node-id-present` | 2 | `type-applicability` (`05`), `properties` (`02`), `required` (`04`), `items` (`03`), `additional-properties` (`09`), `boolean-schema` (`01`), `not` (`08`), `anyOf` (`08`), `if-then-else` (`11`), `defs-and-ref` (`12`), `recursive-ref` (`17`) |

`id-and-anchor` covers `$id` only; no `$ref` in this repository resolves by URI.

The runners depend on one capability of their own: `exit-code-contract` (`20`), which `check-tro` and `check-tros` both implement.

Every capability these schemas use is demonstrated. Nothing in the battery rests on a construct with no demo; what is missing is demonstrations of the *combinations*.
