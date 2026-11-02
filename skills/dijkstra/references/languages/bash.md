# Bash

Answers to `references/adapting-a-language.md`. Bash code is almost
always a pike script: the 100-line limit, the preflight, `--dry-run`
and the cleanup trap all stay.

### 1. A function over repeated command lines

- **Replaces:** the same command with the same flags, written N times.
- **Pays:** from the second copy.
- **Limit:** the function only forwards and adds the fixed flags.

```bash
#!/usr/bin/env bash
set -euo pipefail
fetch() { curl --fail --silent --show-error --max-time 30 "$@"; }
fetch https://example.com/a >/dev/null
fetch https://example.com/b >/dev/null
```

### 2. A loop over an array over repeated blocks

- **Replaces:** N blocks that differ only in one word.
- **Pays:** from the second block.
- **Limit:** the array is the bound. Never loop over unbounded input
  without a counter.

```bash
#!/usr/bin/env bash
set -euo pipefail
readonly tools=(git curl tar)
for tool in "${tools[@]}"; do
    command -v "$tool" >/dev/null || { printf 'missing %s\n' "$tool" >&2; exit 1; }
done
```

### 3. An associative array over a `case` that maps values

- **Replaces:** a `case` or if-ladder whose arms only set a value.
- **Pays:** from four arms. Below that, `case` is shorter.
- **Limit:** a `case` whose arms run commands stays control flow.

```bash
#!/usr/bin/env bash
set -euo pipefail
declare -rA ext=([zip]=.zip [tar]=.tar.gz [raw]=.bin)
kind=${1:-raw}
printf 'data%s\n' "${ext[$kind]:-.bin}"
```

### 4. Parameter expansion over subshells

- **Replaces:** `basename`, `dirname`, `sed` or `tr` on a single
  string.
- **Pays:** always: one line, no subshell.
- **Limit:** a pattern a reader cannot decode in one look stays a
  named variable with a clear name.

```bash
#!/usr/bin/env bash
set -euo pipefail
path=${1:-/tmp/report.tar.gz}
name=${path##*/}
stem=${name%%.*}
printf '%s %s %s\n' "${path%/*}" "$name" "$stem"
```

### 5. `printf` over loops that print

- **Replaces:** a loop that echoes one item per line.
- **Pays:** always.
- **Limit:** none beyond the shared ones.

```bash
#!/usr/bin/env bash
set -euo pipefail
readonly items=(alpha beta gamma)
printf -- '- %s\n' "${items[@]}"
```

### 6. `case` globs over an if-ladder on patterns

- **Replaces:** a chain of `[[ $x == pattern ]]` tests.
- **Pays:** from three tests.
- **Limit:** none beyond the shared ones.

```bash
#!/usr/bin/env bash
set -euo pipefail
file=${1:-a.tar.gz}
case $file in
    *.tar.gz | *.tgz) printf 'tar\n' ;;
    *.zip) printf 'zip\n' ;;
    *) printf 'raw\n' ;;
esac
```
