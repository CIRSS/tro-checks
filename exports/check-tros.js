#!/usr/bin/env node
//
// Check every candidate and write one report each. A candidate is checked
// against the target given here, or the one its entry in
// candidates/manifest.json declares, or the assumed tier.
//
//   check-tros --candidates DIR --reports DIR [--target TIER]

const fs = require('node:fs')
const { parseArgs } = require('node:util')
const path = require('node:path')

const checkTro = require('./check-tro.js')

const USAGE = 'usage: check-tros --candidates DIR --reports DIR [--target TIER]'
const ASSUMED_TIER = '1'

const CANDIDATE_SUFFIX = '.jsonld'
const MANIFEST_NAME = 'manifest.json'

/** @throws {Error} if the directory or the manifest is missing, the manifest cannot be read or parsed, or it names no candidates. */
function readManifest(candidatesDirectory) {
    if (!fs.existsSync(candidatesDirectory) || !fs.statSync(candidatesDirectory).isDirectory()) {
        throw new Error(`no candidates directory at ${candidatesDirectory}`)
    }

    const manifestPath = path.join(candidatesDirectory, MANIFEST_NAME)
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`no ${MANIFEST_NAME} in ${candidatesDirectory}`)
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    if (Object.keys(manifest).length === 0) {
        throw new Error(`${MANIFEST_NAME} names no candidates`)
    }

    return manifest
}

/** @throws {Error} if an entry names a file that is not in the directory. */
function takeCandidateStems(manifest, candidatesDirectory) {
    const stems = Object.keys(manifest).sort()

    const absent = stems.filter((stem) =>
        !fs.existsSync(path.join(candidatesDirectory, `${stem}${CANDIDATE_SUFFIX}`)))
    if (absent.length > 0) {
        throw new Error(`no candidate file for ${absent.join(', ')}`)
    }

    return stems
}

function sayWhatWasSkipped(manifest, candidatesDirectory) {
    const skipped = fs
        .readdirSync(candidatesDirectory)
        .filter((name) => name.endsWith(CANDIDATE_SUFFIX))
        .filter((name) => manifest[path.basename(name, CANDIDATE_SUFFIX)] === undefined)
        .sort()

    for (const name of skipped) {
        process.stdout.write(`skipped ${name}; ${MANIFEST_NAME} does not name it\n`)
    }
}

/** @throws {Error} if the candidate cannot be checked, or its report cannot be written. */
function reportOn(candidate, reportsDirectory) {
    const reportPath = path.join(reportsDirectory, `${candidate.stem}.md`)

    const findings = checkTro.checkCandidateAgainstExpectations(candidate)
    const assessments = checkTro.assessTiers(candidate, findings)

    checkTro.writeReport(reportPath, candidate, findings, assessments)
    process.stdout.write(`${checkTro.summarizeInOneLine(reportPath, assessments)}\n`)
}

function checkEach(candidates, reportsDirectory) {
    let unreportedCount = 0
    for (const candidate of candidates) {
        try {
            reportOn(candidate, reportsDirectory)
        } catch (error) {
            process.stderr.write(`${candidate.stem}: could not be checked -- ${error.message}\n`)
            unreportedCount += 1
        }
    }
    return unreportedCount
}

function runAsCommand() {
    try {
        const optionValues = parseArgs({
            args: process.argv.slice(2),
            options: {
                candidates: { type: 'string' },
                reports: { type: 'string' },
                target: { type: 'string' },
            },
            allowPositionals: false,
        }).values

        const candidatesDirectory = optionValues.candidates
        const reportsDirectory = optionValues.reports
        if (!candidatesDirectory || !reportsDirectory) throw new Error(USAGE)

        const overrideTier = optionValues.target !== undefined
            ? checkTro.tierNumbered(optionValues.target)
            : undefined
        const assumedTier = checkTro.tierNumbered(ASSUMED_TIER)

        const manifest = readManifest(candidatesDirectory)
        const stems = takeCandidateStems(manifest, candidatesDirectory)

        sayWhatWasSkipped(manifest, candidatesDirectory)

        const candidates = stems.map((stem) => {
            const entry = manifest[stem]
            const declaredTier = entry.target !== undefined
                ? checkTro.tierNumbered(String(entry.target))
                : undefined

            return {
                stem,
                name: `${stem}${CANDIDATE_SUFFIX}`,
                path: path.join(candidatesDirectory, `${stem}${CANDIDATE_SUFFIX}`),
                description: entry.description,
                targetTier: overrideTier ?? declaredTier ?? assumedTier,
                targetWasDeclared: overrideTier !== undefined || declaredTier !== undefined,
            }
        })

        fs.mkdirSync(reportsDirectory, { recursive: true })

        const unreportedCount = checkEach(candidates, reportsDirectory)
        if (unreportedCount > 0) {
            throw new Error(`${unreportedCount} of ${candidates.length} candidates could not be checked`)
        }

        return 0
    } catch (error) {
        process.stderr.write(`check-tros: ${error.message}\n`)
        return 1
    }
}

process.exitCode = runAsCommand()
