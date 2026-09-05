# tro-checks

## Overview

Transparent Research Objects (TROs) must adhere to syntactic, structural and
semantic requirements, defined by the TRACE specification and adopted by
producing and consuming organizations.

The artifacts in this repository provide means for a **producer** — an
organization whose trusted research system emitted a TRO — or for a **consumer**
deciding whether to rely on one, to establish what a given TRO satisfies and
what it does not. The TRO under examination is the **candidate**, checked
against **expectations**, each a condition reflecting the TRACE
**specification**. Expectations are grouped into **tiers**; the **target** is
the tiers a candidate is expected to satisfy — claimed by its producer, or
required by a consumer. Every expectation is tested by at least one
**validator**; what the validators establish about one expectation is a
**finding**, and whether a candidate meets the expectations in a tier is an
**assessment**. A **report** states both, about one candidate, with respect to a
target. See [`GLOSSARY.md`](GLOSSARY.md).

Currently, every expectation that can be checked by this version of the checker
is applied to every candidate, and a report states findings only. Support for
distinct tiers, targets and assessments will be added in the future.

## Usage

The tools are implemented and distributed as a REPRO capability module holding
the expectations and the checker. Checking a particular TRO currently entails
building and running a distinct REPRO that employs this module and supplies the
candidates — see [`spec-tro-checks`](https://github.com/CIRSS/spec-tro-checks)
for a worked example of such a repository.

Add this line to that REPRO's Dockerfile:

```
RUN repro.require tro-checks main ${CIRSS} --report
```

It installs `check-tro` and `check-tros`, and hooks the check-and-report
workflow to the REPRO's `build-reports` target.

Put each candidate in `candidates/`, as a `.jsonld` file. Then, in that REPRO:

```
make build-reports
```

Every `candidates/*.jsonld` is checked, and one report per candidate is written
to `reports/<name>.md`.

There is not yet a way to declare a candidate's target, so every expectation is
applied to every candidate.

## Key files

| File | What it is |
| --- | --- |
| [`exports/composition-fingerprint.schema.json`](exports/composition-fingerprint.schema.json) | The composition carries a `trov:hasFingerprint`. |
| [`exports/context-base.schema.json`](exports/context-base.schema.json) | The `@context` declares an `@base`. |
| [`exports/hash-form.schema.json`](exports/hash-form.schema.json) | Every hash names `sha256` and carries 64 lowercase hexadecimal digits. |
| [`exports/node-id-present.schema.json`](exports/node-id-present.schema.json) | Every node object carries an `@id`. |
| [`exports/tro-minimal.schema.json`](exports/tro-minimal.schema.json) | The declaration is an object carrying `@context` and `@graph`. |
| [`exports/trs-typed.schema.json`](exports/trs-typed.schema.json) | The system named by `trov:wasAssembledBy` is typed `trov:TrustedResearchSystem`. |
| [`exports/check-tro.js`](exports/check-tro.js) | The checker. Applies every expectation (`*.schema.json`) in the module directory to one candidate and writes the report. Installed as `check-tro`. |
| [`exports/check-tros.js`](exports/check-tros.js) | Runs `check-tro` over every `candidates/*.jsonld`, writing `reports/<name>.md` for each. Installed as `check-tros`. |
| [`exports/base-manifest`](exports/base-manifest) | What a consuming REPRO gets: the checker, the expectations, and the setup that installs the validators. |
| [`exports/base-setup`](exports/base-setup) | Installs the validators, from `json-schema-dev`. |
| [`exports/report-targets`](exports/report-targets), [`exports/report-makefile`](exports/report-makefile) | The `--report` profile: gives a consuming REPRO `make build-reports`. |
| [`check-image`](check-image) | Asserts a built image has the commands its modules were required for. |
| [`GLOSSARY.md`](GLOSSARY.md) | The key entities the tools in this repository concern. |
| [`CAPABILITIES.md`](CAPABILITIES.md) | The JSON Schema capabilities the expectations use, each with its demo in [`json-schema-demos`](https://github.com/CIRSS/json-schema-demos). |
| [`REVIEWS.md`](REVIEWS.md) | Who has read which version of which file. Generated. |

## Building this REPRO

Requires Git, Docker and GNU Make.

```
make build-parent      # once, on a fresh clone
make build-image
```

Check that the built image has the commands its modules were required for:

```
make run-in-repro CMD='bash check-image'
```

`make build-reports` here regenerates this repository's own review report. There
is no candidate in this repository to check, so it runs only `reviews`. Tests
and demos will be run from here too, once this REPRO has them.

## Adding an expectation

Put a `<name>.schema.json` in [`exports/`](exports) and list it in
[`exports/base-manifest`](exports/base-manifest). `check-tro` applies every
expectation in the module directory, and names each finding in the report after
the expectation it came from.
