#!/usr/bin/env node
//
// Check one candidate against the expectations in its target and write the report.
//
//   check-tro --candidate FILE --report FILE [--target TIER] [--description TEXT]

const childProcess = require('node:child_process')
const { parseArgs } = require('node:util')
const fs = require('node:fs')
const path = require('node:path')

module.exports = {
    lookUpTier,
    checkCandidateAgainstExpectations,
    assessTiers,
    writeReport,
    summarizeInOneLine,
}

const VALIDATORS = ['jsonschema-validate', 'ajv-validate']

const EXPECTATION = {
    MET: 'met',
    UNMET: 'unmet',
    NOT_CLAIMED: 'not claimed',
}

const expectationsDirectory = __dirname

/** @throws {Error} if the tier definitions cannot be read or parsed. */
function readTierDefinitions() {
    const definitions = JSON.parse(
        fs.readFileSync(path.join(expectationsDirectory, 'tiers.json'), 'utf8'))

    return Object.keys(definitions)
        .map((key) => ({ number: Number(key), ...definitions[key] }))
        .sort((one, other) => one.number - other.number)
}

/** @throws {Error} if the tier definitions cannot be read, or name no such tier. */
function lookUpTier(number) {
    const tiers = readTierDefinitions()
    const tier = tiers.find((each) => each.number === Number(number))

    if (!tier) {
        throw new Error(`no tier ${number}; the tiers are ${tiers.map((each) => each.number).join(', ')}`)
    }

    return tier
}

/** @throws {Error} if the module's own directory cannot be listed. */
function findExpectationFiles() {
    return fs
        .readdirSync(expectationsDirectory)
        .filter((name) => name.endsWith('.schema.json'))
        .sort()
        .map((name) => path.join(expectationsDirectory, name))
}

/** @throws {Error} if the expectation belongs to no tier. */
function tierOfExpectation(tiers, expectation) {
    const tier = tiers.find((each) => each.expectations.includes(expectation))
    if (!tier) throw new Error(`${expectation} belongs to no tier`)
    return tier
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

/** @throws {Error} if the expectations cannot be listed, one belongs to no tier, or a validator fails to answer. */
function checkCandidateAgainstExpectations(candidate) {
    const tiers = readTierDefinitions()

    const findings = findExpectationFiles().map((expectationPath) => {
        const expectation = path.basename(expectationPath, '.schema.json')
        const tier = tierOfExpectation(tiers, expectation)

        if (tier.number > candidate.targetTier.number) {
            return { expectation, tier, outcome: EXPECTATION.NOT_CLAIMED, answers: [] }
        }

        const answers = VALIDATORS.map((validator) =>
            askValidator(validator, expectationPath, candidate.path))

        return {
            expectation,
            tier,
            outcome: answers.some((answer) => !answer.valid) ? EXPECTATION.UNMET : EXPECTATION.MET,
            answers,
        }
    })

    return findings.sort((one, other) =>
        one.tier.number - other.tier.number || one.expectation.localeCompare(other.expectation))
}

function assessTiers(candidate, findings) {
    const unmetIn = (tier) => findings.some(
        (finding) => finding.tier.number === tier.number && finding.outcome === EXPECTATION.UNMET)

    return readTierDefinitions()
        .filter((tier) => tier.number <= candidate.targetTier.number)
        .map((tier) => ({ tier, outcome: unmetIn(tier) ? EXPECTATION.UNMET : EXPECTATION.MET }))
}

function namesOf(validators) {
    return validators.map((validator) => `\`${validator}\``).join(' and ')
}

function renderReportAsMarkdown(candidate, findings, assessments) {
    const renderEvidenceAsLines = (finding) => {
        const evidenceLines = []
        for (const answer of finding.answers) {
            evidenceLines.push(`\`${answer.validator}\`:`, '', '```', answer.output, '```', '')
        }
        return evidenceLines
    }

    const stated = candidate.targetWasDeclared ? 'declared' : 'assumed'

    const lines = [
        '# Report',
        '',
        `Candidate: \`${candidate.fileName}\``,
        '',
    ]

    if (candidate.description) lines.push(candidate.description, '')

    lines.push(
        `Target: Tier ${candidate.targetTier.number} -- ${candidate.targetTier.name} (${stated})`,
        '',
        '## Assessment',
        '',
    )

    for (const assessment of assessments) {
        lines.push(`- Tier ${assessment.tier.number} -- ${assessment.tier.name}: ${assessment.outcome}`)
    }

    lines.push(
        '',
        '## Findings',
        '',
        `Every expectation in the target was put to ${namesOf(VALIDATORS)}.`,
        '',
    )

    for (const finding of findings) {
        lines.push(`### ${finding.expectation} (Tier ${finding.tier.number}): ${finding.outcome}`, '')
        if (finding.outcome === EXPECTATION.UNMET) lines.push(...renderEvidenceAsLines(finding))
    }

    return lines.join('\n')
}

/** @throws {Error} if the report cannot be written. */
function writeReport(reportPath, candidate, findings, assessments) {
    fs.writeFileSync(
        reportPath,
        renderReportAsMarkdown(candidate, findings, assessments))
}

function summarizeInOneLine(reportPath, assessments) {
    const verdicts = assessments.map(
        (assessment) => `Tier ${assessment.tier.number} ${assessment.outcome}`)

    return `wrote ${reportPath}; ${verdicts.join(', ')}`
}

const USAGE =
    'usage: check-tro --candidate FILE --report FILE [--target TIER] [--description TEXT]'

const ASSUMED_TIER = '1'

const EXIT = {
    ALL_MET: 0,
    SOME_UNMET: 1,
    COULD_NOT_CHECK: 2,
}

function runAsCommand() {
    try {
        const optionValues = parseArgs({
            args: process.argv.slice(2),
            options: {
                candidate: { type: 'string' },
                report: { type: 'string' },
                target: { type: 'string' },
                description: { type: 'string' },
            },
            allowPositionals: false,
        }).values

        const candidatePath = optionValues.candidate
        const reportPath = optionValues.report
        if (!candidatePath || !reportPath) throw new Error(USAGE)

        const targetWasDeclared = optionValues.target !== undefined
        const targetTier = lookUpTier(targetWasDeclared ? optionValues.target : ASSUMED_TIER)
        const candidateDescription = optionValues.description

        const candidate = {
            fileName: path.basename(candidatePath),
            path: candidatePath,
            description: candidateDescription,
            targetTier,
            targetWasDeclared,
        }

        const findings = checkCandidateAgainstExpectations(candidate)
        const assessments = assessTiers(candidate, findings)

        writeReport(reportPath, candidate, findings, assessments)
        process.stdout.write(`${summarizeInOneLine(reportPath, assessments)}\n`)

        return findings.some((finding) => finding.outcome === EXPECTATION.UNMET)
            ? EXIT.SOME_UNMET
            : EXIT.ALL_MET
    } catch (error) {
        process.stderr.write(`check-tro: ${error.message}\n`)
        return EXIT.COULD_NOT_CHECK
    }
}

if (require.main === module) process.exitCode = runAsCommand()
