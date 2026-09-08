#!/usr/bin/env bash

source "${REPRO_MNT}/demo/cells.sh"

# The runner cleans this directory but does not create it.
mkdir -p tmp

title "tro-checks  ·  demo 01: is-a-node-object-or-an-array-of-them (Tier 0)"

show "a single node object" \
    cat instance-node-object.jsonld
show "checked at Tier 0" \
    check-tro --target 0 --candidate instance-node-object.jsonld --report tmp/node-object.md
show "the report" \
    cat tmp/node-object.md

show "an array of node objects" \
    cat instance-array-of-node-objects.jsonld
show "checked at Tier 0" \
    check-tro --target 0 --candidate instance-array-of-node-objects.jsonld --report tmp/array-of-node-objects.md
show "the report" \
    cat tmp/array-of-node-objects.md

show "a string as the whole document" \
    cat instance-string.jsonld
show "checked at Tier 0" \
    check-tro --target 0 --candidate instance-string.jsonld --report tmp/string.md
show "the report" \
    cat tmp/string.md

show "an array carrying a scalar" \
    cat instance-array-with-scalar.jsonld
show "checked at Tier 0" \
    check-tro --target 0 --candidate instance-array-with-scalar.jsonld --report tmp/array-with-scalar.md
show "the report" \
    cat tmp/array-with-scalar.md

exit 0
