default: test

test *args:
    bun test {{ if args == "" { "tests/" } else { args } }}

typecheck:
    bun run typecheck

check: typecheck test
