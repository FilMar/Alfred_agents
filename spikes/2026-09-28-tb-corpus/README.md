# tb corpus experiments

Scripts that measured the Third Brain corpus in September 2026. They moved here from `scripts/`. Each script writes next to itself, in `data/` and `reports/`, so keep the three together.

| script | what it measured | output |
|---|---|---|
| `tb_corpus_report.py` | size and shape of the corpus | stdout |
| `tb_paraphrase_set.py` | builds the paraphrase queries | `data/paraphrases.json` |
| `tb_benchmark.py` | embedding models on the paraphrase queries | `reports/fase0_benchmark.json` |
| `tb_threshold.py` | the score curve and its knee | `reports/fase0_threshold.json` |
| `tb_fase0_fields.py` | empty and missing fields in Qdrant | `reports/fase0_repair.json` |
| `tb_related_report.py` | how many related notes pass a cut | `reports/fase1_related.json` |
| `tb_retranslate.ts` | English notes translated to Italian | `data/translations_it.json` |
| `tb_reembed.py` | embeds the whole corpus again | Qdrant |

The wiki decisions that use these results cite them by path:
`memory_embedding_model_follows_the_corpus_language`, `memory_score_cutoffs_belong_to_the_model`, `memory_absence_is_how_qdrant_stores_null`, `memory_related_notes_ranked_not_cut`, `memory_raw_text_lives_in_the_archive_not_the_note`.

`tb_retranslate.ts` reads `data/translations_it.json` from the current directory by default. Run it from this folder, or pass the path.
