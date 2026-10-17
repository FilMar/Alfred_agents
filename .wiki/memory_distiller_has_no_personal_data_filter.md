---
tags: [memory, distiller, privacy, decision]
sources: [conversation, https://ollama.com/privacy]
---

## Decision

The distiller has no filter for personal data or secrets. A filter in three layers was designed and not built: a session filter before any model call, a pattern check on the candidates, and a critic question.

For the first batches, sessions that read email are held back by hand. The reason is use, not privacy: they give little to remember.

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
