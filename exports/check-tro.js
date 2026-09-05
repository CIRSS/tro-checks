#!/usr/bin/env node
//
// Check one candidate against every expectation and write the report.
//
//   check-tro <tro.jsonld> <report.md>

const childProcess = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const VALIDATORS = ['jsonschema-validate', 'ajv-validate']

const EXPECTATION = {
    MET: 'met',
    UNMET: 'unmet',
}

const EXIT = {
    ALL_MET: 0,
    SOME_UNMET: 1,
    COULD_NOT_CHECK: 2,
}

const expectationsDirectory = __dirname

module.exports = { checkCandidateAgainstExpectations, writeReport, summarizeInOneLine }

/** @throws {Error} if the module's own directory cannot be listed. */
function findExpectationFiles() {
    return fs
        .readdirSync(expectationsDirectory)
        .filter((name) => name.endsWith('.schema.json'))
        .sort()
        .map((name) => path.join(expectationsDirectory, name))
}

/** @throws {Error} if the validator cannot be run, is killed, or answers with an unrecognized exit status. */
function askValidator(validator, expectationPath, candidatePath) {
    const childResult = childProcess.spawnSync(
        validator,
        ['--schema', expectationPath, '--instance', candidatePath],
        { encoding: 'utf8' }
    )

    if (childResult.error) throw new Error(`${validator}: ${childResult.error.message}`)

    const output = (childResult.stdout + childResult.stderr).replace(/\s+$/, '')
    if (childResult.signal) throw new Error(`${validator}: killed by ${childResult.signal}\n${output}`)

    switch (childResult.status) {
        case 0: return { validator, valid: true, output }
        case 1: return { validator, valid: false, output }
        default: throw new Error(`${validator}: exit status ${childResult.status}\n${output}`)
    }
}

/** @throws {Error} if either validator fails to answer. */
function checkCandidateAgainstExpectation(candidatePath, expectationPath) {
    const violated = (answer) => !answer.valid

    const answers = VALIDATORS.map((validator) =>
        askValidator(validator, expectationPath, candidatePath))

    return {
        expectation: path.basename(expectationPath, '.schema.json'),
        outcome: answers.some(violated) ? EXPECTATION.UNMET : EXPECTATION.MET,
        answers,
    }
}

function renderReportAsMarkdown(candidatePath, findings) {
    const needsEvidence = (finding) => finding.outcome !== EXPECTATION.MET
    const renderEvidenceAsLines = (finding) => {
        const evidenceLines = []
        for (const answer of finding.answers) {
            evidenceLines.push(`\`${answer.validator}\`:`, '', '```', answer.output, '```', '')
        }
        return evidenceLines
    }

    const lines = [
        '# Report',
        '',
        `Candidate: \`${path.basename(candidatePath)}\``,
        '',
        `Every expectation below was put to both \`${VALIDATORS[0]}\` and \`${VALIDATORS[1]}\`.`,
        '',
    ]

    for (const finding of findings) {
        lines.push(`## ${finding.expectation}: ${finding.outcome}`, '')
        if (needsEvidence(finding)) lines.push(...renderEvidenceAsLines(finding))
    }

    return lines.join('\n')
}

function unmetCount(findings) {
    return findings.filter((finding) => finding.outcome === EXPECTATION.UNMET).length
}

/** @throws {Error} if the expectations cannot be listed, or a validator fails to answer. */
function checkCandidateAgainstExpectations(candidatePath) {
    return findExpectationFiles().map((expectationPath) =>
        checkCandidateAgainstExpectation(candidatePath, expectationPath))
}

/** @throws {Error} if the report cannot be written. */
function writeReport(reportPath, candidatePath, findings) {
    fs.writeFileSync(reportPath, renderReportAsMarkdown(candidatePath, findings))
}

function summarizeInOneLine(reportPath, findings) {
    return `wrote ${reportPath}; ${unmetCount(findings)} unmet`
}

function exitStatusForFindings(findings) {
    return unmetCount(findings) > 0 ? EXIT.SOME_UNMET : EXIT.ALL_MET
}

function runAsCommand() {
    try {
        const [candidatePath, reportPath] = process.argv.slice(2)
        if (!candidatePath || !reportPath) throw new Error('usage: check-tro <tro.jsonld> <report.md>')

        const findings = checkCandidateAgainstExpectations(candidatePath)
        writeReport(reportPath, candidatePath, findings)
        process.stdout.write(`${summarizeInOneLine(reportPath, findings)}\n`)
        return exitStatusForFindings(findings)
    } catch (error) {
        process.stderr.write(`check-tro: ${error.message}\n`)
        return EXIT.COULD_NOT_CHECK
    }
}

if (require.main === module) process.exitCode = runAsCommand()
