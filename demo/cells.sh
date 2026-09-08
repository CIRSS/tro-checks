# Cell helpers for a demo's run.sh, which sources this file.
# Copied from CIRSS/json-schema-demos, pending adoption by the shell-notebook repro.

CELL_RANGES=()
for CELL_ARG in "$@"; do
    if [[ $CELL_ARG =~ ^[0-9]+$ ]]; then
        CELL_RANGES+=("$CELL_ARG $CELL_ARG")
    elif [[ $CELL_ARG =~ ^([0-9]+)-([0-9]+)$ ]]; then
        CELL_RANGES+=("${BASH_REMATCH[1]} ${BASH_REMATCH[2]}")
    else
        echo "usage: bash run.sh [CELL | FIRST-LAST]..." >&2
        exit 2
    fi
done
CELL_INDEX=0

cell_in_range() {
    CELL_INDEX=$(( CELL_INDEX + 1 ))
    (( ${#CELL_RANGES[@]} == 0 )) && return 0
    local range first last
    for range in "${CELL_RANGES[@]}"; do
        read -r first last <<< "$range"
        (( CELL_INDEX >= first && CELL_INDEX <= last )) && return 0
    done
    return 1
}

BANNER_WIDTH=78
DOC_FILL='=========================================================================================='
SHOW_FILL='------------------------------------------------------------------------------------------'
SECTION_FILL='##########################################################################################'

title() {
    (( ${#CELL_RANGES[@]} > 0 )) && return 0
    printf '%s\n#\n#   %s\n#\n%s\n' \
        "${SECTION_FILL:0:BANNER_WIDTH}" "$1" "${SECTION_FILL:0:BANNER_WIDTH}"
}

SECTION_INDEX=0
SECTION_PENDING=''

section() {
    SECTION_INDEX=$(( SECTION_INDEX + 1 ))
    SECTION_PENDING="$1"
}

flush_section() {
    [[ -z $SECTION_PENDING ]] && return 0
    local label="##### ${SECTION_INDEX}. ${SECTION_PENDING} "
    local pad=$(( BANNER_WIDTH - ${#label} ))
    (( pad < 5 )) && pad=5
    printf '\n\n%s\n%s%s\n%s\n' "${SECTION_FILL:0:BANNER_WIDTH}" \
        "$label" "${SECTION_FILL:0:pad}" "${SECTION_FILL:0:BANNER_WIDTH}"
    SECTION_PENDING=''
}

banner() {
    flush_section
    local fill="$1" title="$2"
    local label="${fill:0:5} [${CELL_INDEX}] ${title} "
    local pad=$(( BANNER_WIDTH - ${#label} ))
    (( pad < 5 )) && pad=5
    printf '\n%s%s\n\n' "$label" "${fill:0:pad}"
}

doc() {
    cell_in_range || return 0
    banner "$DOC_FILL" "$1"
    cat
}

show() {
    cell_in_range || return 0
    local title="$1"; shift
    banner "$SHOW_FILL" "$title"
    printf '$ %s\n' "$*"
    # stderr is folded in so the golden records everything the command emitted.
    "$@" 2>&1
}
