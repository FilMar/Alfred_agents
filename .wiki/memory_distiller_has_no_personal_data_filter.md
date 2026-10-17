---
tags: [memory, distiller, privacy, decision]
sources: [conversation, https://ollama.com/privacy]
---

## Decision

The distiller has no filter for personal data or secrets. A filter in three layers was designed and not built: a session filter before any model call, a pattern check on the candidates, and a critic question.

Sessions that read email are marked as distilled by hand, with the time `1970-01-01T00:00:00.000Z`. The reason is use, not privacy: they give little to remember. They are 9 sessions with 37 exchanges, and 4 debate runs of `th` with 4 exchanges. They have no episodes. Setting `distilled` back to null puts them in the queue again.

The scan had marked 33 sessions. Twenty-four of them were development work with one stray email address, and they are distilled like the rest.

## Why

The memory belongs to one user. A note that is not used fades by trust and leaves the results.

The extractor runs on a cloud model of Ollama. The policy of March 2026 says:

- Prompts are "not stored beyond the time required to fulfill the request".
- "We do not use your inputs or outputs to train any AI models."
- Data goes to "model inference providers" and may be processed in the United States.

The policy does not name those providers.

On 2026-10-16 the queue held 2 925 exchanges. A scan with simple patterns found an email address in 27 exchanges of 18 sessions, an IBAN in 2 exchanges of one session, and the `postino` skill in 3. It found no key, token, phone number or fiscal code. The 798 notes of `tb` held no email, phone or IBAN.

The tools looked at: gitleaks finds secrets and reads text from a pipe. Presidio finds personal data, with the Italian codes checked by their checksum.

Look at it again if a key appears in a note, because the hook injects notes into every project. Look again if data of a client or an employer is under a duty of confidentiality.

## Cross-references

- [memory_hook_injects_only_the_text_the_agent_uses](memory_hook_injects_only_the_text_the_agent_uses) — where notes go
