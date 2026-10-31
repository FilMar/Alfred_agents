# Adapting a language

One sheet per language in `references/languages/<language>.md`. When a
script needs a language without a sheet, answer the seven questions
below, write the sheet, add the language to `scripts/check_script.sh`,
present the sheet to the user, and only then write the script.

A script carries no tests and no per-function contracts. In a file this
small they would outweigh the code. The preflight is the only contract.
The real run is the only test. The questions ask only for what a
script needs.

## The seven questions

1. **Run.** What shebang runs the file with no build step and no
   setup? How does the file declare a third-party package inline?
2. **Fail fast.** What makes the first unhandled failure stop the
   script with a non-zero exit code?
3. **Flags.** How are long flags parsed, so that a wrong or unknown
   flag exits with code 2 and `--help` prints the `usage:` line?
4. **Die.** What is the `die` helper: a message on stderr, then exit
   with code 1 by default?
5. **Subprocess.** How is another program called with an argument
   list (never a shell string), a timeout, and a checked exit code?
6. **Files.** How is a file written atomically (temp file, then
   rename), with the temp file removed on any exit?
7. **Gate.** Which commands lint, type-check and format-check one file
   at the strictest useful level? This is the line that goes into
   `scripts/check_script.sh`.

If the answer to question 1 is "there is none", the language is not a
script language on this machine. Say so, and propose one that is.

## The sheet template

The sheet answers the seven questions with a short code shape each.
Then it gives one full skeleton that passes `scripts/check_script.sh`
and runs. Then a short list of the idioms that matter. Keep the sheet
under 100 lines. Code shapes only, no essays. Test the skeleton
before you present the sheet.
