# What happens during a run of check-tro

**The program accepts from the command line...**
- The location of the candidate.
- The location to write the report.
- The tier the candidate is expected to reach.
- A description of the candidate.

**The program describes its own usage and stops if...**
- The location of the candidate was not given.
- The location to write the report was not given.

**The program builds a representation of the candidate.**
- It settles which tier was meant — the one asked for, or tier 1.
  - It reads the tier definitions the module ships.
  - It stops if no tier answers to that number.
- It names the candidate after the file it sits in.
- It records whether the tier was asked for or assumed.

**The program checks the candidate against each expectation in the target.**
- It finds the expectation files the module ships.
- It settles which tier each expectation belongs to.
- It reports an expectation above the candidate's tier as not claimed.
- It puts an expectation at or below the candidate's tier to both validators, as in [asking a validator](#asking-a-validator).
- It reports the expectation met when both validators accept the candidate, unmet when either refuses.

**The program assesses each tier at or below the candidate's.**
- It reports the tier met when every finding in it was met, unmet when any was not.

**The program writes the report, as in [what the report says](#what-the-report-says).**

**The program says in one line what it wrote, giving...**
- The location of the report.
- Each tier's assessment.

**The program answers with an exit status, one of...**
- Nothing unmet.
- Something unmet.
- Could not check.

## Asking a validator

**The program runs the validator on the expectation and the candidate.**

**The validator answers...**
- Valid, when it exits with nothing to report.
- Invalid, when it exits reporting a violation.

**The validator gives no answer if...**
- It cannot be started.
- It is killed by a signal.
- It exits any other way.

**The program keeps whatever the validator wrote as the evidence.**

**The program stops the run when the validator gave no answer, saying...**
- Which validator refused.
- What it wrote.

## What the report says

**The report names the candidate and describes it.**

**The report states the tier aimed at, and whether that tier was declared or assumed.**

**The report gives the assessment of each tier at or below the one aimed at.**

**The report says that every expectation in the target was put to both validators, and that one outside the target was not claimed.**

**The report states every finding, giving...**
- The expectation.
- Its tier.
- Its outcome.
- The evidence for those unmet -- what each validator wrote.
