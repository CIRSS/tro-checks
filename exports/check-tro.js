#!/usr/bin/env node
//
// Check one subject against every expectation and write the report.
//
//   check-tro <tro.jsonld> <report.md>
//
// check-tros requires this file rather than running it as a command, so that a
// crash arrives as an exception instead of as an exit status indistinguishable
// from an unmet expectation.

const childProcess = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const VALIDATORS = ['jsonschema-validate', 'ajv-validate']

// json-schema-dev's exit-status contract, which check-tro reads from the
// validators and then answers in itself.
const STATUS = {
    VALID: 0,
    INVALID: 1,
    ERROR: 2,
}

const EXPECTATION = {
    MET: 'met',
    UNMET: 'unmet',
    UNRESOLVED: 'unresolved',
}

const expectationsDirectory = __dirname

const valid = (run) => run.status === STATUS.VALID
const errored = (run) => run.status === STATUS.ERROR
const disagree = (runs) => runs.some((run) => run.status !== runs[0].status)
const unresolved = (reason) => ({ outcome: EXPECTATION.UNRESOLVED, reason })
const reasonFor = (error) => error.code || error.message

function read(file) {
    try {
        return fs.readFileSync(file)
    } catch (error) {
        throw new Error(`cannot read ${file}: ${reasonFor(error)}`)
    }
}

function write(file, text) {
    try {
        fs.writeFileSync(file, text)
    } catch (error) {
        throw new Error(`cannot write ${file}: ${reasonFor(error)}`)
    }
}

function findExpectations() {
    return fs
        .readdirSync(expectationsDirectory)
        .filter((name) => name.endsWith('.schema.json'))
        .sort()
}

function runValidator(validator, schema, instance) {
    const completed = childProcess.spawnSync(
        validator,
        ['--schema', schema, '--instance', instance],
        { encoding: 'utf8' }
    )

    if (completed.error) {
        return { validator, status: STATUS.ERROR, output: `${validator}: ${completed.error.message}` }
    }

    const spoke = completed.status === STATUS.VALID || completed.status === STATUS.INVALID
    return {
        validator,
        status: spoke ? completed.status : STATUS.ERROR,
        output: [completed.stdout, completed.stderr].join('').replace(/\s+$/, ''),
    }
}

// Disagreement is never held against the subject. It says the expectation
// admits two readings, which is ours to fix.
function outcomeOf(runs) {
    if (runs.some(errored)) return unresolved('the run failed')
    if (disagree(runs)) return unresolved('the validators disagree')
    return { outcome: runs.every(valid) ? EXPECTATION.MET : EXPECTATION.UNMET }
}

function checkExpectation(expectation, subjectPath) {
    const runs = VALIDATORS.map((validator) =>
        runValidator(validator, path.join(expectationsDirectory, expectation), subjectPath)
    )
    const { outcome, reason } = outcomeOf(runs)
    return { expectation: path.basename(expectation, '.schema.json'), outcome, reason, runs }
}

function loadSubject(subjectPath) {
    const contents = read(subjectPath)
    return {
        file: subjectPath,
        name: path.basename(subjectPath),
        digest: crypto.createHash('sha256').update(contents).digest('hex'),
    }
}

const needsEvidence = (finding) => finding.outcome !== EXPECTATION.MET

function renderOutcome({ outcome, reason }) {
    return reason ? `${outcome}: ${reason}` : outcome
}

// Both legs, labeled: they report the same finding at different granularity and
// neither rendering is the authoritative one.
function renderEvidence(finding) {
    const lines = []
    for (const run of finding.runs) {
        lines.push(`\`${run.validator}\`:`, '', '```', run.output, '```', '')
    }
    return lines
}

function renderReport(subject, findings) {
    const lines = [
        '# Report',
        '',
        `Subject: \`${subject.name}\`, sha256 ${subject.digest.slice(0, 16)}`,
        '',
        `Every expectation below was put to both \`${VALIDATORS[0]}\` and \`${VALIDATORS[1]}\`.`,
        '',
    ]

    for (const finding of findings) {
        lines.push(`## ${finding.expectation}: ${renderOutcome(finding)}`, '')
        if (needsEvidence(finding)) lines.push(...renderEvidence(finding))
    }

    return lines.join('\n')
}

function tally(findings) {
    const counted = (outcome) =>
        findings.filter((finding) => finding.outcome === outcome).length
    return { unmet: counted(EXPECTATION.UNMET), unresolved: counted(EXPECTATION.UNRESOLVED) }
}

function checkSubject(subject) {
    return findExpectations().map((expectation) => checkExpectation(expectation, subject.file))
}

function writeReport(reportPath, subject, findings) {
    write(reportPath, renderReport(subject, findings))
    const { unmet, unresolved } = tally(findings)
    return { file: reportPath, unmet, unresolved }
}

function summarize(report) {
    return `wrote ${report.file}; ${report.unmet} unmet, ${report.unresolved} unresolved`
}

function exitStatus({ unmet, unresolved }) {
    if (unresolved > 0) return STATUS.ERROR
    if (unmet > 0) return STATUS.INVALID
    return STATUS.VALID
}

function cannotRun(message) {
    process.stderr.write(`check-tro: ${message}\n`)
    process.exit(STATUS.ERROR)
}

function parseCommandLine() {
    const [subjectPath, reportPath] = process.argv.slice(2)
    if (!subjectPath || !reportPath) cannotRun('usage: check-tro <tro.jsonld> <report.md>')
    return { subjectPath, reportPath }
}

const announce = (line) => process.stdout.write(`${line}\n`)

function main() {
    const { subjectPath, reportPath } = parseCommandLine()
    const subject = loadSubject(subjectPath)
    const findings = checkSubject(subject)
    const report = writeReport(reportPath, subject, findings)
    announce(summarize(report))
    process.exit(exitStatus(report))
}

// A run that could not be made arrives here as an exception. Caught rather than
// left to Node, which exits 1 on an uncaught exception -- the code for an unmet
// expectation.
if (require.main === module) {
    try {
        main()
    } catch (error) {
        cannotRun(error.message)
    }
}

module.exports = { loadSubject, checkSubject, writeReport, summarize }
