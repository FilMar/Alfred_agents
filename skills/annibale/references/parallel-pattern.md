# Parallel execution pattern

Use this when perspectives must be independent — no member reads another
member's output before all of them finish.

`--detach` runs a member in the background. It prints no output to the
terminal. It returns JSON with the `out`, `log`, and `status` paths.

`th wait` blocks until every job finishes. It never hangs on a failed job.
It exits non-zero if any job did not reach `done`.

```bash
P1=$(th run --member <name-hat1> --task "<task>" --detach)
P2=$(th run --member <name-hat2> --task "<task>" --detach)
P3=$(th run --member <name-hat3> --task "<task>" --detach)

if ! th wait \
     "$(echo "$P1" | jq -r '.status')" \
     "$(echo "$P2" | jq -r '.status')" \
     "$(echo "$P3" | jq -r '.status')"; then
  echo "A member failed — inspect its .status/.log before continuing." >&2
  # surface the failure to the user; do not synthesise partial output silently
fi

OUT1=$(cat "$(echo "$P1" | jq -r '.out')")
OUT2=$(cat "$(echo "$P2" | jq -r '.out')")
OUT3=$(cat "$(echo "$P3" | jq -r '.out')")

FINAL=$(th run --member <name-blue> --task "<task>

Perspective 1:
$OUT1

Perspective 2:
$OUT2

Perspective 3:
$OUT3")
```

For deep reasoning add `--thinking medium` or `--thinking high` to `th run`.
