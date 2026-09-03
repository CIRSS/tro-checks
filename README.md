# tro-checks

Takes a TRO declaration, checks it against a battery of expectations, and writes a
report saying which were met.

A REPRO capability module. It holds the expectations and the runner; it holds no
TRO. An organisation checking its own TROs requires this module and supplies the
document — see [`spec-tro-checks`](https://github.com/CIRSS/spec-tro-checks) for
a worked example of such a repository.


To include `tro-checks` in a consuming repro add this line to its Dockerfile:
```
RUN repro.require tro-checks main ${CIRSS} --report
```

This installs `check-tro` and hooks the check-and-report workflow to the consuming REPRO's `build-reports` make target. Issuing `make build-reports` in that repro will check its `tro.jsonld` and write the results to its `report.md`.

## Key files

| File | What it is |
| --- | --- |
| [`exports/tro-minimal.schema.json`](exports/tro-minimal.schema.json) | The one expectation so far: a TRO declaration is an object carrying `@context` and `@graph`. |
| [`exports/check-tro`](exports/check-tro) | The runner. Applies every `*.schema.json` in the module directory to one document and writes the report. |
| [`exports/base-manifest`](exports/base-manifest) | What a consumer gets: the runner, the schemas, and the setup that installs the validator. |
| [`exports/base-setup`](exports/base-setup) | Installs the validator, from `json-schema-dev`. |
| [`exports/report-targets`](exports/report-targets), [`exports/report-makefile`](exports/report-makefile) | The `--report` profile: gives a consumer `make build-reports`. |
| [`check-image`](check-image) | Asserts a built image has the commands its modules were required for. |
| [`REVIEW.md`](REVIEW.md) | Who has read which version of which file. Generated. |

## Building, testing and extending

Requires Git, Docker and GNU Make.

```
make build-parent      # once, on a fresh clone
make build-image
```

Check that a built image has the commands its modules were required for:

```
make run-in-repro CMD='bash check-image'
```

Regenerate this repo's review report. There is no TRO here to check, so this
runs only `reviews`:

```
make build-reports
```

To add an expectation, put a `<name>.schema.json` in [`exports/`](exports) and
list it in [`exports/base-manifest`](exports/base-manifest). `check-tro` applies
every schema in the module directory, and names each section of the report after
the schema it came from.
