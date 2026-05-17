# Bash — Senior Developer Deep Reference

> Covers variables, expansions, control flow, functions, arrays, process management, and scripting best practices.

---

## Table of Contents

1. [Variables & Parameter Expansion](#1-variables--parameter-expansion)
2. [Quoting & Word Splitting](#2-quoting--word-splitting)
3. [Control Flow](#3-control-flow)
4. [Functions](#4-functions)
5. [Arrays & Associative Arrays](#5-arrays--associative-arrays)
6. [Process Management & Signals](#6-process-management--signals)
7. [Script Best Practices](#7-script-best-practices)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Variables & Parameter Expansion

### Variables

```bash
# Variable assignment — NO spaces around = ‼️
name="Alice"
count=42
readonly PI=3.14    # immutable

# Access — use $ prefix
echo "$name"        # Alice
echo "${name}"      # same — ‼️ prefer braces for clarity and safety

# Unset variable is empty string by default
echo "$undefined"   # (empty)

# export — make variable available to child processes
export DATABASE_URL="postgres://localhost/mydb"
# ‼️ Child processes get a COPY — changes don't propagate back to parent

# Command substitution — capture output
today=$(date +%Y-%m-%d)    # ‼️ preferred syntax
old_style=`date +%Y-%m-%d` # backtick — avoid (nesting is painful)

# Arithmetic — (( )) or $(( ))
count=$((count + 1))
((count++))              # increment in-place
result=$(( (3 + 5) * 2 ))
```

### Parameter Expansion

```bash
name="Alice"
unset empty_var

# Default values ‼️
echo "${name:-Bob}"        # Alice    (name is set)
echo "${empty_var:-Bob}"   # Bob      (empty_var is unset or empty)
echo "${empty_var-Bob}"    # Bob      (unset only, not empty)

# Assign default if unset
: "${LOG_LEVEL:=INFO}"     # assigns INFO to LOG_LEVEL if unset
                            # : is a no-op command — prevents side effects

# Fail if unset
echo "${required_var:?Error: required_var is not set}"
# ‼️ Exits with error message if required_var is unset — great for required env vars

# String manipulation
path="/home/alice/documents/report.txt"
echo "${path#*/}"        # home/alice/documents/report.txt  (strip shortest from front)
echo "${path##*/}"       # report.txt                       (strip longest from front)
echo "${path%/*}"        # /home/alice/documents            (strip shortest from back)
echo "${path%%/*}"       #                                  (strip longest from back)

filename="report.txt"
echo "${filename%.txt}"  # report                           (strip extension)
echo "${filename##*.}"   # txt                              (get extension)

# Replace
echo "${path/alice/bob}"   # replace first occurrence
echo "${path//a/A}"        # replace ALL occurrences ‼️
echo "${path/\/home/\/usr}" # /usr/alice/documents/report.txt

# Case conversion (Bash 4+)
echo "${name,,}"   # alice  (all lowercase)
echo "${name^^}"   # ALICE  (all uppercase)
echo "${name^}"    # Alice  (capitalize first)

# String length
echo "${#name}"    # 5

# Substrings
str="Hello World"
echo "${str:6}"    # World      (from position 6)
echo "${str:0:5}"  # Hello      (position 0, length 5)
echo "${str: -5}"  # World      (‼️ space before - required!)
```

---

## 2. Quoting & Word Splitting

```bash
# ‼️ Word splitting — unquoted variables are split on IFS characters (space, tab, newline)
filename="my file.txt"
rm $filename       # ✗ runs: rm my file.txt — tries to delete two files
rm "$filename"     # ✓ runs: rm "my file.txt" — correctly one argument

# ‼️ Globbing — unquoted * ? [ ] are expanded as filename patterns
files="*.txt"
ls $files          # ✗ glob expanded — lists actual .txt files in directory
ls "$files"        # ✓ literally *.txt — probably not what you want either
                   # use arrays for multiple files: files=(*.txt)

# Double quotes — preserve spaces, allow $ and ` expansion
echo "Name: $name, Date: $(date)"   # ✓ expands variables

# Single quotes — literal, NO expansion
echo 'Name: $name'  # prints: Name: $name

# $'' — ANSI-C quoting — interprets escape sequences
echo $'Hello\nWorld'  # Hello on one line, World on next

# ‼️ Always quote variables in conditions and arguments
if [ "$name" = "Alice" ]; then ...   # ✓ safe
if [ $name = "Alice" ]; then ...     # ✗ breaks if name is empty or has spaces

# [[ ]] vs [ ] ‼️
[[ "$name" == "Al*" ]]    # glob matching, no word splitting, no quoting issues
[[ "$a" -lt "$b" && "$b" -lt "$c" ]]  # && works inside [[ ]]
[ "$a" -lt "$b" ] && [ "$b" -lt "$c" ]  # [ ] needs separate commands for &&
```

---

## 3. Control Flow

### if / case

```bash
# if — tests exit code (0 = true, non-zero = false) ‼️
if command; then
    # runs if command exits 0
fi

if [[ "$count" -gt 10 ]]; then
    echo "large"
elif [[ "$count" -gt 5 ]]; then
    echo "medium"
else
    echo "small"
fi

# ‼️ Test operators
# Numeric:  -eq -ne -lt -le -gt -ge
# String:   = != < > (in [[ ]]), -z (empty), -n (non-empty)
# File:     -f (regular file), -d (directory), -e (exists), -r -w -x (permissions)
#           -s (non-empty file), -L (symlink), -nt (newer than), -ot (older than)

[[ -f "$file" ]] && echo "file exists"
[[ -d "$dir" || -z "$var" ]] && echo "dir exists or var is empty"

# case — pattern matching ‼️
case "$extension" in
    txt|md)
        process_text "$file" ;;
    jpg|png|gif)
        process_image "$file" ;;
    *.sh)                       # glob patterns work in case ‼️
        bash "$file" ;;
    *)
        echo "Unknown: $extension" ;;
esac
```

### Loops

```bash
# for loop
for i in 1 2 3 4 5; do echo "$i"; done
for i in {1..10}; do echo "$i"; done
for i in {0..100..5}; do echo "$i"; done  # step 5

# C-style for
for ((i=0; i<10; i++)); do echo "$i"; done

# Loop over files — ‼️ use glob, not ls!
for file in /tmp/*.log; do
    [[ -f "$file" ]] || continue  # skip if glob didn't match
    process "$file"
done

# while loop
while IFS= read -r line; do     # ‼️ IFS= prevents trimming, -r prevents backslash interpretation
    echo "Line: $line"
done < input.txt

# Read from command output
while IFS= read -r line; do
    echo "$line"
done < <(grep "ERROR" app.log)   # ‼️ process substitution — avoid subshell

# ‼️ Piping into while creates a SUBSHELL — variable changes are lost!
count=0
grep "ERROR" app.log | while IFS= read -r line; do
    ((count++))
done
echo "$count"  # ✗ 0 — count was modified in subshell, not parent shell

# Fix: use process substitution or herestring
while IFS= read -r line; do
    ((count++))
done < <(grep "ERROR" app.log)
echo "$count"  # ✓ correct value

# until — opposite of while
until ping -c1 server &>/dev/null; do
    echo "Waiting for server..."
    sleep 5
done
```

---

## 4. Functions

```bash
# Function definition (two equivalent syntaxes)
greet() {
    local name="$1"           # ‼️ local — prevent leaking to global scope
    local greeting="${2:-Hello}"
    echo "$greeting, $name!"
}

function greet { ... }        # alternative syntax

# Call
greet "Alice"          # Hello, Alice!
greet "Bob" "Hi"       # Hi, Bob!

# Return values
# ‼️ Bash functions return EXIT CODES (0-255), not values
# Return data via: stdout capture, global variable, file, or nameref

# Method 1: echo + capture (most common)
get_version() {
    echo "1.2.3"
}
version=$(get_version)

# Method 2: set a global (nameref — Bash 4.3+)
result_var() {
    local -n _retvar="$1"    # nameref — _retvar is an alias for the variable named in $1
    _retvar="computed_value"
}
result_var my_result
echo "$my_result"  # computed_value

# Return codes
is_even() {
    (( $1 % 2 == 0 ))   # returns 0 if even (true), 1 if odd (false)
}
if is_even 4; then echo "even"; fi

# Error handling in functions
create_dir() {
    local dir="$1"
    if ! mkdir -p "$dir"; then
        echo "ERROR: Cannot create $dir" >&2   # ‼️ errors to stderr
        return 1
    fi
    return 0
}

# ‼️ local keyword is ESSENTIAL — without it, variables leak to global scope
outer() {
    x=10
    inner
    echo "$x"  # 99 if inner changed x without local ‼️
}
inner() {
    local x=99  # with local: outer's x unchanged; without: overwrites it
}
```

---

## 5. Arrays & Associative Arrays

```bash
# Indexed arrays (Bash 4+)
fruits=("apple" "banana" "cherry")
fruits[3]="date"

# Access
echo "${fruits[0]}"       # apple — ‼️ 0-indexed
echo "${fruits[@]}"       # all elements (word-split safe)
echo "${fruits[*]}"       # all elements as one word (avoid — splitting issues)
echo "${#fruits[@]}"      # length: 4
echo "${!fruits[@]}"      # indices: 0 1 2 3

# Append
fruits+=("elderberry")
fruits+=("fig" "grape")

# Slice
echo "${fruits[@]:1:2}"   # banana cherry (start=1, length=2)

# Loop — ‼️ always use "${arr[@]}" with quotes
for fruit in "${fruits[@]}"; do
    echo "$fruit"
done

# Remove element (leaves sparse array)
unset fruits[1]
echo "${!fruits[@]}"  # 0 2 3 4 5 6 — index 1 is gone

# Compact sparse array
fruits=("${fruits[@]}")  # re-index

# Associative arrays (Bash 4+) — declare -A required ‼️
declare -A config
config[host]="localhost"
config[port]="5432"
config[db]="myapp"

echo "${config[host]}"      # localhost
echo "${!config[@]}"        # keys: host port db (unordered)
echo "${config[@]}"         # values

for key in "${!config[@]}"; do
    echo "$key = ${config[$key]}"
done

# Check if key exists
if [[ -v config[port] ]]; then echo "port is set"; fi
```

---

## 6. Process Management & Signals

### Background Jobs & Subshells

```bash
# Run in background
long_running_command &
pid=$!           # ‼️ $! = PID of last background process

# Wait for background job
wait "$pid"
exit_code=$?     # ‼️ $? = exit code of last command

# Run multiple in parallel and wait for all
for url in "${urls[@]}"; do
    curl -O "$url" &
done
wait             # wait for ALL background jobs ‼️

# Subshell — runs in a child process, changes don't affect parent
(cd /tmp && ls)  # parent's working directory unchanged
( export TEMP_VAR="value"; run_something )  # export only in subshell

# Process substitution — treat command output as a file
diff <(sort file1.txt) <(sort file2.txt)
# ‼️ <( ) creates a named pipe — command runs in background, output available as /dev/fd/N
```

### Signals & Traps

```bash
# ‼️ trap — intercept signals and EXIT for cleanup

# Cleanup on exit (script end, error, or signal)
cleanup() {
    local exit_code=$?
    rm -f "$TEMP_FILE"
    [[ "$exit_code" -ne 0 ]] && echo "Script failed with code $exit_code" >&2
}
trap cleanup EXIT           # ‼️ EXIT fires on any exit — most reliable for cleanup

# Handle Ctrl+C (SIGINT) gracefully
trap 'echo "Interrupted"; exit 130' INT

# Ignore HUP signal (keep running after terminal closes)
trap '' HUP

# Multiple signals
trap cleanup EXIT INT TERM  # cleanup on exit, ctrl-c, or termination

# Temporary file pattern with automatic cleanup ‼️
TEMP_FILE=$(mktemp)
trap 'rm -f "$TEMP_FILE"' EXIT

# ‼️ Common signals:
#   INT  (2)  — Ctrl+C — keyboard interrupt
#   TERM (15) — polite termination request (kill default)
#   KILL (9)  — force kill — cannot be caught or ignored
#   HUP  (1)  — hangup (terminal closed), often used to reload config
#   USR1/USR2 — user-defined signals

# Send signals
kill -TERM "$pid"   # polite kill
kill -9 "$pid"      # force kill (last resort)
kill -0 "$pid"      # test if process exists (no signal sent)
```

---

## 7. Script Best Practices

### Safety Header & Error Handling

```bash
#!/usr/bin/env bash
# ‼️ Use /usr/bin/env bash — portable, uses PATH to find bash

set -euo pipefail
# -e  : exit immediately on error ‼️
# -u  : treat unset variables as errors ‼️
# -o pipefail : pipe fails if ANY command fails (not just last) ‼️

# ‼️ set -e exemptions — these won't cause exit:
# - commands in if conditions: if ! command; then
# - commands followed by ||:  command || handle_error
# - commands in while/until conditions

# Explicitly handle errors where -e would be too aggressive
result=$(command_that_might_fail) || { echo "Failed" >&2; exit 1; }

# Strict IFS for safety (optional but good for parsing)
IFS=$'\n\t'      # don't split on spaces — safer for most scripts

# Script directory — reliable self-reference
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ‼️ Don't use $0 — breaks when script is sourced or called via symlink

# Logging functions
log()  { echo "[$(date +%T)] $*"; }
info() { echo "[INFO]  $*"; }
warn() { echo "[WARN]  $*" >&2; }
error(){ echo "[ERROR] $*" >&2; }
die()  { error "$*"; exit 1; }

# Argument parsing
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] <input>
Options:
  -v, --verbose   Enable verbose output
  -o, --output    Output file (default: output.txt)
  -h, --help      Show this help
EOF
}

OUTPUT="output.txt"
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -v|--verbose) VERBOSE=true; shift ;;
        -o|--output)  OUTPUT="$2"; shift 2 ;;
        -h|--help)    usage; exit 0 ;;
        --)           shift; break ;;         # end of options
        -*)           die "Unknown option: $1" ;;
        *)            break ;;                # positional arg
    esac
done

[[ $# -lt 1 ]] && { usage; die "Missing required argument: <input>"; }
INPUT="$1"
```

### Defensive Patterns

```bash
# Check required commands
require() {
    for cmd in "$@"; do
        command -v "$cmd" &>/dev/null || die "Required command not found: $cmd"
    done
}
require curl jq aws

# Atomic file write — write to temp, then move (prevents partial reads) ‼️
write_atomic() {
    local file="$1"
    local tmp; tmp=$(mktemp "${file}.XXXXXX")
    generate_content > "$tmp"
    mv "$tmp" "$file"   # ‼️ mv is atomic on same filesystem
}

# Lock file — prevent concurrent runs ‼️
LOCKFILE="/tmp/$(basename "$0").lock"
exec 9>"$LOCKFILE"                      # open fd 9 on lockfile
flock -n 9 || die "Another instance is running"
trap 'rm -f "$LOCKFILE"' EXIT

# Retry with exponential backoff
retry() {
    local max_attempts=5
    local delay=1
    local attempt=1
    while (( attempt <= max_attempts )); do
        "$@" && return 0
        warn "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
        sleep "$delay"
        (( delay *= 2, attempt++ ))
    done
    return 1
}
retry curl -f https://api.example.com/health
```

---

## 8. Common Interview Questions

```text
Q: What does set -euo pipefail do?
A: -e: exit on error (any command returns non-zero).
   -u: error on unset variable (prevents silent use of empty vars).
   -o pipefail: pipe fails if any command in the pipe fails (not just the last).
   ‼️ Without these, bugs hide silently. Always use them in production scripts.

Q: What is the difference between $@ and $*?
A: $@ (quoted: "$@") — each argument as a separate word. ALWAYS use this to pass args.
   $* (quoted: "$*") — all arguments joined with IFS separator (usually space) as ONE word.
   "$@" preserves arguments exactly. "$*" loses argument boundaries.

Q: What is the difference between [ ] and [[ ]] ?
A: [ ] — POSIX sh, external command (/bin/[), word splitting and globbing inside, requires quoting.
   [[ ]] — Bash built-in, no word splitting/globbing, supports =~ (regex), && ||, <>.
   ‼️ Use [[ ]] in Bash scripts — it's safer and more powerful.

Q: How do you capture both stdout and stderr?
A: output=$(cmd 2>&1)      — both to variable.
   cmd > out.txt 2>&1      — both to file. ‼️ Order matters: redirect stdout first, then stderr to stdout.
   cmd &> out.txt           — Bash shorthand for both to file.
   cmd 2>/dev/null          — silence stderr only.
   cmd > out.txt 2>err.txt  — separate files.

Q: What is a subshell and when is one created?
A: A subshell is a child bash process with a copy of the parent's environment.
   Created by: ( commands ), command substitution $( ), pipe stages, &.
   ‼️ Variable changes, cd, and trap in a subshell don't affect the parent.
   Common trap: loop | while read creates a subshell — variable increments are lost.

Q: How do you read a file line by line safely?
A: while IFS= read -r line; do ... done < file.txt
   IFS= prevents trimming leading/trailing whitespace.
   -r prevents interpreting backslash escape sequences.
   ‼️ Don't use: for line in $(cat file) — breaks on whitespace and globs.

Q: What is the difference between exit and return in Bash?
A: exit — terminate the entire shell/script process with an exit code.
   return — return from a function with an exit code (0-255).
   ‼️ In a sourced script (source ./script.sh), exit exits the parent shell! Use return instead.
```
