# tro-checks

## Overview

Transparent Research Objects (TROs) adhere to syntactic, structural and
semantic requirements that are defined by the TRACE specification and adopted by
producing and consuming organizations.

The artifacts in this repository provide means for a **producer** — an
organization whose Trusted Research System emitted a TRO — or for a **consumer**
deciding whether to rely on one, to establish what requirements a given TRO
satisfies and to identify any it does not. The TRO under examination is the
**candidate**, checked against **expectations**, each a condition reflecting the
TRACE **specification**. Expectations are grouped into **tiers**; the **target**
is the tiers a candidate is expected to satisfy — claimed by its producer, or
required by a consumer. Every expectation is tested by at least one
**validator**; what the validators establish about one expectation is a
**finding**, and whether a candidate meets the expectations in a tier is an
**assessment**. See [`GLOSSARY.md`](GLOSSARY.md).

A target names a single **tier** to identify the set of expectations the
candidate is to meet. Because tiers are ordered and cumulative, naming a single
tier implies all tiers below it are targeted as well. A report carries one
assessment per targeted tier, followed by the detailed findings for each
expectation. An expectation belonging to a tier outside the target is reported
as `not claimed`.

## Usage

The tools are implemented and distributed for now as a REPRO capability module
holding the expectations and the checker. Checking a particular TRO entails
building and running a distinct REPRO that consumes this module and supplies
the candidates — see
[`spec-tro-checks`](https://github.com/transparency-certified/spec-tro-checks)
for a worked example of such a repository.

Include these lines in the consuming REPRO's Dockerfile:

```
ENV TRACE 'https://raw.githubusercontent.com/transparency-certified/${1}/${2}/exports'

RUN repro.require tro-checks main ${TRACE} --report
```

This installs `check-tro` and `check-tros`, and hooks the check-and-report
workflow to the REPRO's `build-reports` target.

Put the candidates in the consuming REPRO's `candidates/` directory, and list
them in `candidates/manifest.json`. Each key names a `.jsonld` file beside the
manifest, so the key `spec-example-2026-04-08` selects
`candidates/spec-example-2026-04-08.jsonld`:

```json
{
    "spec-example-2026-04-08": {
        "target": 1,
        "description": "What this candidate is. Copied into its report."
    }
}
```

The manifest is what `check-tros` checks: a `.jsonld` file the manifest does not
name is reported as skipped. An entry naming a file that is not in the directory
stops the run.

Then, in that REPRO:

```
make build-reports
```

One report per candidate is written to `reports/<name>.md`.

A report gives one assessment per targeted tier, then one finding per
expectation. Under an unmet finding it lists for each underlying error its
location in the candidate, the value found there, and how it failed to meet an
expectation. Every expectation is put to every validator, and is unmet if any
of them rejects the candidate. The report lists every error any validator
reported, once, and names no validator.

`check-tros` takes a target tier from the manifest provided with a candidate and
assumes tier 1 is targeted when the manifest names none. `--target` overrides
the manifest, for every candidate in the run. The report labels the target
with where it came from: the manifest, the `--target` option, or the default.

## Key files

| File | What it is |
| --- | --- |
| [`exports/check-tro.js`](exports/check-tro.js) | The checker. Applies the expectations in a candidate's target and writes the report. Installed as `check-tro`. |
| [`exports/check-tros.js`](exports/check-tros.js) | Runs the checker over the candidates the manifest names, each at its own target, writing `reports/<name>.md` for each. Installed as `check-tros`. |
| [`exports/render-report.js`](exports/render-report.js) | Writes the report from a candidate's findings and assessments. Supplies functions used by the checker; not a command. |
| [`exports/types.js`](exports/types.js) | The checker's entities as types the editor can check — the glossary's candidate, tier, finding and assessment — and the shape of a validator's report entry. Not a command. |
| [`exports/tiers.json`](exports/tiers.json) | Which expectations belong to which tier, and each tier's name. An expectation file in `exports/` that `tiers.json` lists under no tier stops every run rather than being silently skipped. |
| [`GLOSSARY.md`](GLOSSARY.md) | The key entities the tools in this repository concern. |
| [`CAPABILITIES.md`](CAPABILITIES.md) | The JSON Schema capabilities the expectations use, each with its demo in [`json-schema-demos`](https://github.com/CIRSS/json-schema-demos). |
| [`REVIEWS.md`](REVIEWS.md) | Who has reviewed each file, at what level of detail. |
| [`demo/`](demo) | Demos of checking particular expectations. |

## Building this REPRO

`make test-code` checks the checker's JavaScript against the type annotations
in its comments, with the configuration in `jsconfig.json` that the editor also
reads. A field renamed in one file and not in another fails there.

Requires Git, Docker and GNU Make.

```
make build-parent      # once, on a fresh clone
make build-image
```

Check that the built image has the commands its modules were required for:

```
make run-in-repro CMD='bash check-image'
```

## Adding an expectation

Put a `<name>.schema.json` in [`exports/`](exports), list it in
[`exports/base-manifest`](exports/base-manifest), and assign it to a tier in
[`exports/tiers.json`](exports/tiers.json). Include a demo in [`demo/`](demo).
