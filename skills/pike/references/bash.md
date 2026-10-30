# Bash

The skeleton. Copy it, then delete what the script does not use.

```bash
#!/usr/bin/env bash
# desc: back up one directory into a dated tar file
# usage: backup.sh --source <dir> --target <dir> [--dry-run]
set -euo pipefail

die() { printf 'backup: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }

source_dir="" target_dir="" dry_run=false
while (($#)); do
    case $1 in
        --source) source_dir=${2:?}; shift 2 ;;
        --target) target_dir=${2:?}; shift 2 ;;
        --dry-run) dry_run=true; shift ;;
        --help) usage ;;
        *) die "unknown flag: $1" 2 ;;
    esac
done

[[ -n $source_dir && -n $target_dir ]] || usage
[[ -d $source_dir ]] || die "no such directory: $source_dir"
[[ -d $target_dir ]] || die "no such directory: $target_dir"
command -v tar >/dev/null || die "tar not found"

archive="$target_dir/$(date +%F).tar.gz"
[[ -e $archive ]] && { printf '%s\n' "$archive"; exit 0; }

if $dry_run; then
    printf 'would write %s\n' "$archive" >&2
    exit 0
fi

tmp=$(mktemp "$archive.XXXXXX")
trap 'rm -f "$tmp"' EXIT
tar --create --gzip --file "$tmp" --directory "$source_dir" .
mv "$tmp" "$archive"
printf '%s\n' "$archive"
```

## Idioms that matter

- Quote every expansion: `"$var"`, `"$@"`. Inside `[[ ]]` the left side
  may stay bare.
- `local` for every variable inside a function. `readonly` for
  constants.
- `$(...)`, never backticks. `[[ ]]`, never `[ ]`.
- Arrays for argument lists: `args=(--quiet); cmd "${args[@]}"`.
- `while IFS= read -r line; do ...; done < <(cmd)` instead of
  `cmd | while`: the pipe runs the loop in a subshell and loses its
  variables.
- `timeout 30 cmd` for any call that can hang.
- `mktemp` makes the file with mode 0600. Run `chmod` before the `mv`
  when other users must read the result.
- `${var:?message}` for a required variable from the environment.
- No `eval`. No parsing of `ls`.
- A loop that polls has a counter and a maximum:
  `for ((i = 0; i < tries_max; i++))`.
