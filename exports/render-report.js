//
// Write a candidate's findings and assessments as the Markdown report.
//
//   const { renderReportAsMarkdown } = require('./render-report.js')

// @ts-check

/** @typedef {import('./types.js').Tier} Tier */
/** @typedef {import('./types.js').Candidate} Candidate */
/** @typedef {import('./types.js').Assessment} Assessment */
/** @typedef {import('./types.js').Finding} Finding */
/** @typedef {import('./types.js').ErrorReport} ErrorReport */
/** @typedef {import('./types.js').Rejection} Rejection */

module.exports = {
    renderReportAsMarkdown,
}

const TARGET_SOURCE_LABELS = {
    default: 'default when not declared',
    manifest: 'from manifest declaration',
    option: 'assigned via --target option',
}

/**
 * @param {(string|number)[]} segments
 * @returns {string}  a JSON Pointer
 */
function pointerOf(segments) {
    return `/${segments.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`
}

/**
 * @param {ErrorReport} error
 * @returns {string}  what the keyword demanded, in its own terms
 */
function stateConstraint({ keyword, constraint = {}, particulars = {} }) {
    switch (keyword) {
        case 'required': return `missing required member \`${particulars.missingProperty}\``
        case 'additionalProperties':
        case 'unevaluatedProperties':
            return `member \`${particulars.additionalProperty ?? particulars.unevaluatedProperty}\` is not allowed here`
        case 'type': return `expected type ${[].concat(constraint.type).join(' or ')}`
        case 'enum': return `expected one of ${JSON.stringify(constraint.allowedValues)}`
        case 'const': return `expected ${JSON.stringify(constraint.allowedValue)}`
        case 'pattern': return `expected to match pattern \`${constraint.pattern}\``
        case 'maximum': case 'minimum': case 'exclusiveMaximum': case 'exclusiveMinimum':
            return `expected a value ${constraint.comparison} ${constraint.limit}`
        case undefined: return 'the schema here admits nothing'
        default: {
            const stated = { ...constraint, ...particulars }
            return Object.keys(stated).length > 0 ? `${keyword} ${JSON.stringify(stated)}` : keyword
        }
    }
}

/**
 * @param {ErrorReport} error
 * @returns {string}  one line: where, what was found, what the expectation says
 */
function describeError(error) {
    const where = error.site ? `\`${pointerOf(error.site)}\`` : 'the document'
    const found = 'found' in error ? ` found \`${JSON.stringify(error.found)}\`` : ''
    return `${where}${found} — ${error.message ?? stateConstraint(error)}`
}

/**
 * @param {Rejection} rejection
 * @returns {string}  one line naming the alternative tried
 */
function describeRejection(rejection) {
    if (rejection.site) return `element \`${pointerOf(rejection.site)}\` was tried and refused:`
    if (rejection.clause) return `alternative \`${rejection.clause[rejection.clause.length - 1]}\` was tried and refused:`
    throw new Error('rejection names neither an element nor a clause')
}

/**
 * @param {ErrorReport[]} errors
 * @param {string}        [indentation]  prefixed to every line
 * @returns {string[]}  one bullet per error, alternatives nested beneath
 */
function renderErrorsAsLines(errors, indentation = '') {
    const lines = []
    for (const error of errors) {
        lines.push(`${indentation}- ${describeError(error)}`)
        for (const rejection of error.rejections ?? []) {
            lines.push(`${indentation}  - ${describeRejection(rejection)}`)
            lines.push(...renderErrorsAsLines(rejection.errors, `${indentation}    `))
        }
    }
    return lines
}

/**
 * @param {Candidate}    candidate
 * @param {Finding[]}    findings
 * @param {Assessment[]} assessments
 * @param {boolean}      [compactly]  without blank lines (for terminal output, yields invalid Markdown)
 * @returns {string}
 */
function renderReportAsMarkdown(candidate, findings, assessments, compactly) {
    const targetSourceLabel = TARGET_SOURCE_LABELS[candidate.targetSource]
    if (targetSourceLabel === undefined) throw new Error(`no such target source: ${candidate.targetSource}`)

    const reportLines = [
        '# Report',
        '',
        `Candidate: \`${candidate.fileName}\``,
        '',
    ]

    if (candidate.description) reportLines.push(candidate.description, '')

    reportLines.push(
        `Target: Tier ${candidate.targetTier.number} -- ${candidate.targetTier.name} (${targetSourceLabel})`,
        '',
        '## Assessment',
        '',
    )

    for (const assessment of assessments) {
        reportLines.push(`- Tier ${assessment.tier.number} -- ${assessment.tier.name}: ${assessment.outcome}`)
    }

    reportLines.push('', '## Findings', '')

    for (const finding of findings) {
        reportLines.push(`### ${finding.expectation.name} (Tier ${finding.expectation.tier.number}): ${finding.outcome}`, '')
        if (finding.errors.length > 0) {
            reportLines.push(...renderErrorsAsLines(finding.errors), '')
        }
    }

    if (compactly) return `${reportLines.filter((line) => line !== '').join('\n')}\n`

    return reportLines.join('\n')
}
