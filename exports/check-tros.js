#!/usr/bin/env node
//
// Check every subject and write one report each.
//
//   check-tros <subjects-dir> <reports-dir>
//
// An unmet expectation is reported rather than treated as a failure of the run,
// so it never reaches the exit status. What does reach it is a subject left
// unresolved -- one that could not be read, or whose report has an expectation
// the validators could not settle.

const fs = require('node:fs')
const path = require('node:path')

const { loadSubject, checkSubject, writeReport, summarize } = require('./check-tro.js')

const RAN = 0
const DID_NOT_RUN = 2

const reportFor = (subjectPath, directory) =>
    path.join(directory, `${path.basename(subjectPath, '.jsonld')}.md`)

function cannotRun(message) {
    process.stderr.write(`check-tros: ${message}\n`)
    process.exit(DID_NOT_RUN)
}

function parseCommandLine() {
    const [subjects, reports] = process.argv.slice(2)
    if (!subjects || !reports) cannotRun('usage: check-tros <subjects-dir> <reports-dir>')
    return { subjects, reports }
}

function findSubjectsIn(directory) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        cannotRun(`no subjects directory at ${directory}`)
    }

    const subjectPaths = fs
        .readdirSync(directory)
        .filter((name) => name.endsWith('.jsonld'))
        .sort()
        .map((name) => path.join(directory, name))

    if (subjectPaths.length === 0) cannotRun(`no subjects in ${directory}`)

    return subjectPaths
}

// checkSubject is called rather than run as a command because Node exits 1 on
// an uncaught exception, which is also the code for an unmet expectation -- so
// a crashed subject and one with unmet expectations would arrive as the same
// number.
function reportOn(subjectPath, reportsDirectory) {
    const reportPath = reportFor(subjectPath, reportsDirectory)
    try {
        const subject = loadSubject(subjectPath)
        const findings = checkSubject(subject)
        const report = writeReport(reportPath, subject, findings)
        process.stdout.write(`${summarize(report)}\n`)
        return report.unresolved
    } catch (error) {
        process.stderr.write(`${path.basename(subjectPath)}: could not be checked -- ${error.message}\n`)
        return 1
    }
}

// One subject that cannot be checked does not stop the others; it is counted
// and the remaining reports are still written.
function checkEach(subjectPaths, reportsDirectory) {
    let subjectsLeftUnresolved = 0
    for (const subjectPath of subjectPaths) {
        if (reportOn(subjectPath, reportsDirectory) > 0) subjectsLeftUnresolved += 1
    }
    return subjectsLeftUnresolved
}

function main() {
    const { subjects, reports } = parseCommandLine()
    const subjectPaths = findSubjectsIn(subjects)
    fs.mkdirSync(reports, { recursive: true })
    const unresolved = checkEach(subjectPaths, reports)
    process.exit(unresolved > 0 ? DID_NOT_RUN : RAN)
}

main()
