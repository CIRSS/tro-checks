# Capabilities

Every JSON Schema capability the expectations in `exports/` use, and the demo in [`CIRSS/json-schema-demos`](https://github.com/CIRSS/json-schema-demos) that demonstrates it. Capability names are that gallery's, from its [`CAPABILITIES.md`](https://github.com/CIRSS/json-schema-demos/blob/main/CAPABILITIES.md), as are the demo numbers. The third column is this repository's: the expectations in [`exports/`](exports), named without their `.schema.json` suffix.

The point of the mapping is that no expectation in this repository rests on a construct whose behavior has not been put to both validators and recorded in a golden file.

Note that `check-tro` runs the Python-based `jsonschema-validate`  tool alone for JSON Schema validation.

## Capabilities used

| Capability | Demo | Expectations using it |
| --- | --- | --- |
| `dialect-declaration` | `22` | all seven |
| `id-and-anchor` | `13` | all seven (`$id` only; no `$ref` in this repository resolves by URI) |
| `annotations` | `06` | `title` in all seven; `description` in all but `tro-minimal`; `$comment` in `node-id-present` and `is-a-node-object-or-an-array-of-them` |
| `error-message` | `19` | all seven |
| `type` | `02` | all seven |
| `type-applicability` | `05` | `composition-fingerprint`, `context-base`, `hash-form`, `is-a-node-object-or-an-array-of-them`, `node-id-present`, `trs-typed` |
| `properties` | `02` | all but `tro-minimal` and `is-a-node-object-or-an-array-of-them` |
| `required` | `04` | all but `is-a-node-object-or-an-array-of-them` |
| `items` | `03` | `composition-fingerprint`, `hash-form`, `is-a-node-object-or-an-array-of-them`, `node-id-present`, `trs-typed` |
| `additional-properties` | `09` | `node-id-present` |
| `boolean-schema` | `01` | `node-id-present` |
| `const` | `10` | `hash-form`, `trs-typed` |
| `pattern` | `07` | `hash-form` |
| `contains` | `18` | `context-base`, `trs-typed` |
| `not` | `08` | `node-id-present` |
| `anyOf` | `08` | `node-id-present` |
| `if-then-else` | `11` | `context-base`, `node-id-present`, `trs-typed` |
| `defs-and-ref` | `12` | `hash-form`, `node-id-present` |
| `recursive-ref` | `17` | `node-id-present` |
| `exit-code-contract` | `20` | `check-tro`, `check-tros` |

Every capability these schemas use is demonstrated. Nothing in the battery rests on a construct with no demo; what is missing is demonstrations of the *combinations*.

