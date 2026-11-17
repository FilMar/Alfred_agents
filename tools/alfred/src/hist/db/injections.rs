use rusqlite::params;

use super::HistDb;
use crate::hist::{HistError, Injection};

const UPSERT_INJECTION: &str =
    "INSERT INTO injections (exchange_id, kind, ref, text) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (exchange_id, kind, ref) DO UPDATE SET text = ?4";

impl HistDb {
    pub fn upsert_injections(&self, rows: &[Injection]) -> Result<usize, HistError> {
        let result: Result<usize, HistError> = self.write_all(UPSERT_INJECTION, rows, |stmt, r| {
            stmt.execute(params![r.exchange_id, r.kind, r.reference, r.text])
        });
        debug_assert!(
            result.as_ref().map_or(true, |count| *count == rows.len()),
            "HistDb.upsert_injections: one write per row"
        );
        debug_assert!(
            result.is_err() || rows.iter().all(|row| self.has_injection(row)),
            "HistDb.upsert_injections: every row is in the table"
        );
        result
    }

    pub fn has_injection(&self, row: &Injection) -> bool {
        self.lock()
            .query_row(
                "SELECT text FROM injections WHERE exchange_id = ?1 AND kind = ?2 AND ref = ?3",
                params![row.exchange_id, row.kind, row.reference],
                |mapped| mapped.get::<_, String>(0),
            )
            .is_ok_and(|text| text == row.text)
    }
}
