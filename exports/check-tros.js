#!/usr/bin/env node
//
// Check every candidate and write one report each.
//
//   check-tros <candidates-dir> <reports-dir>

const fs = require('node:fs')
const path = require('node:path')

const checkTro = require('./check-tro.js')

/** @throws {Error} if the candidates directory is missing, unreadable, or holds no candidates. */
function findCandidates(candidatesDirectory) {
    if (!fs.existsSync(candidatesDirectory) || !fs.statSync(candidatesDirectory).isDirectory()) {
        throw new Error(`no candidates directory at ${candidatesDirectory}`)
    }

    const candidatePaths = fs
        .readdirSync(candidatesDirectory)
        .filter((name) => name.endsWith('.jsonld'))
        .sort()
        .map((name) => path.join(candidatesDirectory, name))

    if (candidatePaths.length === 0) throw new Error(`no candidates in ${candidatesDirectory}`)

    return candidatePaths
}

/** @throws {Error} if the candidate cannot be checked, or its report cannot be written. */
function reportOn(candidatePath, reportsDirectory) {
    const reportPath = path.join(reportsDirectory, `${path.basename(candidatePath, '.jsonld')}.md`)

    const findings = checkTro.checkCandidateAgainstExpectations(candidatePath)
    checkTro.writeReport(reportPath, candidatePath, findings)
    process.stdout.write(`${checkTro.summarizeInOneLine(reportPath, findings)}\n`)
}

function checkEach(candidatePaths, reportsDirectory) {
    let unreportedCount = 0
    for (const candidatePath of candidatePaths) {
        try {
            reportOn(candidatePath, reportsDirectory)
        } catch (error) {
            process.stderr.write(`${path.basename(candidatePath)}: could not be checked -- ${error.message}\n`)
            unreportedCount += 1
        }
    }
    return unreportedCount
}

function runAsCommand() {
    try {
        const [candidatesDirectory, reportsDirectory] = process.argv.slice(2)
        if (!candidatesDirectory || !reportsDirectory) {
            throw new Error('usage: check-tros <candidates-dir> <reports-dir>')
        }

        const candidatePaths = findCandidates(candidatesDirectory)
        fs.mkdirSync(reportsDirectory, { recursive: true })

        const unreportedCount = checkEach(candidatePaths, reportsDirectory)
        if (unreportedCount > 0) {
            throw new Error(`${unreportedCount} of ${candidatePaths.length} candidates could not be checked`)
        }

        return 0
    } catch (error) {
        process.stderr.write(`check-tros: ${error.message}\n`)
        return 1
    }
}

process.exitCode = runAsCommand()
