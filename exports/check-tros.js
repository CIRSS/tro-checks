#!/usr/bin/env node
//
// Check every candidate and write one report each.
//
//   check-tros <candidates-dir> <reports-dir>
//
// An unmet expectation is reported rather than treated as a failure of the run,
// so it never reaches the exit status. What does reach it is a candidate left
// unresolved -- one that could not be read, or whose report has an expectation
// the validators could not settle.

const fs = require('node:fs')
const path = require('node:path')

const { loadCandidate, checkCandidate, writeReport, summarize } = require('./check-tro.js')

const RAN = 0
const DID_NOT_RUN = 2

const reportFor = (candidatePath, directory) =>
    path.join(directory, `${path.basename(candidatePath, '.jsonld')}.md`)

function cannotRun(message) {
    process.stderr.write(`check-tros: ${message}\n`)
    process.exit(DID_NOT_RUN)
}

function parseCommandLine() {
    const [candidates, reports] = process.argv.slice(2)
    if (!candidates || !reports) cannotRun('usage: check-tros <candidates-dir> <reports-dir>')
    return { candidates, reports }
}

function findCandidatesIn(directory) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        cannotRun(`no candidates directory at ${directory}`)
    }

    const candidatePaths = fs
        .readdirSync(directory)
        .filter((name) => name.endsWith('.jsonld'))
        .sort()
        .map((name) => path.join(directory, name))

    if (candidatePaths.length === 0) cannotRun(`no candidates in ${directory}`)

    return candidatePaths
}

// checkCandidate is called rather than run as a command because Node exits 1 on
// an uncaught exception, which is also the code for an unmet expectation -- so
// a crashed candidate and one with unmet expectations would arrive as the same
// number.
function reportOn(candidatePath, reportsDirectory) {
    const reportPath = reportFor(candidatePath, reportsDirectory)
    try {
        const candidate = loadCandidate(candidatePath)
        const findings = checkCandidate(candidate)
        const report = writeReport(reportPath, candidate, findings)
        process.stdout.write(`${summarize(report)}\n`)
        return report.unresolved
    } catch (error) {
        process.stderr.write(`${path.basename(candidatePath)}: could not be checked -- ${error.message}\n`)
        return 1
    }
}

// One candidate that cannot be checked does not stop the others; it is counted
// and the remaining reports are still written.
function checkEach(candidatePaths, reportsDirectory) {
    let candidatesLeftUnresolved = 0
    for (const candidatePath of candidatePaths) {
        if (reportOn(candidatePath, reportsDirectory) > 0) candidatesLeftUnresolved += 1
    }
    return candidatesLeftUnresolved
}

function main() {
    const { candidates, reports } = parseCommandLine()
    const candidatePaths = findCandidatesIn(candidates)
    fs.mkdirSync(reports, { recursive: true })
    const unresolved = checkEach(candidatePaths, reports)
    process.exit(unresolved > 0 ? DID_NOT_RUN : RAN)
}

main()
