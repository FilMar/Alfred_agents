use rusqlite::{OptionalExtension, params};

use super::{EXTRACTION_COLUMNS, EXTRACTOR_COLUMNS, HistDb, extraction_of, extractor_of};
use crate::hist::{
    Extraction, ExtractionQuery, Extractor, HistError, NewExtraction, NewExtractor, bool_param,
    int_param,
};

const INSERT_EXTRACTION: &str =
    "INSERT INTO extractions (extractor_id, run, exchange_id, kind, body, quote,
       dropped_by, probabilities, verdict, of, saved_id, created)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)";

impl HistDb {
    pub fn insert_extractor(&self, row: &NewExtractor) -> Result<i64, HistError> {
        let conn = self.lock();
        conn.execute(
            "INSERT INTO extractor (parent, why, config, created) VALUES (?1, ?2, ?3, ?4)",
            params![row.parent, row.why, row.config, row.created],
        )?;
        let result: Result<i64, HistError> = Ok(conn.last_insert_rowid());
        debug_assert!(
            result.as_ref().map_or(true, |id| *id > 0),
            "HistDb.insert_extractor: a row id"
        );
        result
    }

    pub fn get_extractor(&self, id: Option<i64>) -> Result<Option<Extractor>, HistError> {
        let sql = match id {
            Some(_) => format!("SELECT {EXTRACTOR_COLUMNS} FROM extractor WHERE id = ?1"),
            None => {
                format!("SELECT {EXTRACTOR_COLUMNS} FROM extractor WHERE active = 1 AND ?1 IS NULL")
            }
        };
        let result: Result<Option<Extractor>, HistError> = Ok(self
            .lock()
            .query_row(&sql, params![id], extractor_of)
            .optional()?);
        debug_assert!(
            result.as_ref().map_or(true, |r| r
                .as_ref()
                .is_none_or(|e| id.map_or(e.active, |id| e.id == id))),
            "HistDb.get_extractor: the row asked, or the active one"
        );
        result
    }

    pub fn set_active_extractor(&self, id: i64) -> Result<bool, HistError> {
        let mut conn = self.lock();
        let tx = conn.transaction()?;
        let exists = tx
            .query_row("SELECT 1 FROM extractor WHERE id = ?1", params![id], |_| {
                Ok(())
            })
            .optional()?
            .is_some();
        if exists {
            tx.execute("UPDATE extractor SET active = 0 WHERE active = 1", [])?;
            tx.execute("UPDATE extractor SET active = 1 WHERE id = ?1", params![id])?;
            tx.commit()?;
        }
        Ok(exists)
    }

    pub fn insert_extractions(&self, rows: &[NewExtraction]) -> Result<usize, HistError> {
        let result = self.write_all(INSERT_EXTRACTION, rows, |stmt, r| {
            stmt.execute(params![
                r.extractor_id,
                r.run,
                r.exchange_id,
                r.kind,
                r.body,
                r.quote,
                r.dropped_by,
                r.probabilities,
                r.verdict,
                r.of,
                r.saved_id,
                r.created
            ])
        });
        debug_assert!(
            result.as_ref().map_or(true, |n| *n == rows.len()),
            "HistDb.insert_extractions: every row written"
        );
        result
    }

    pub fn list_extractions(&self, query: &ExtractionQuery) -> Result<Vec<Extraction>, HistError> {
        let sql = format!(
            "SELECT {EXTRACTION_COLUMNS} FROM extractions
             WHERE (?1 IS NULL OR extractor_id = ?1) AND (?2 IS NULL OR run = ?2)
               AND (?3 IS NULL OR exchange_id = ?3) AND (?4 IS NULL OR (dropped_by IS NULL) = ?4)
             ORDER BY id ASC"
        );
        let extractor_id = int_param(query.extractor_id.as_deref());
        let kept = bool_param(query.kept.as_deref());
        let conn = self.lock();
        let bind = params![extractor_id, query.run, query.exchange_id, kept];
        let rows = conn
            .prepare(&sql)?
            .query_map(bind, extraction_of)?
            .collect::<rusqlite::Result<Vec<_>>>();
        let result: Result<Vec<Extraction>, HistError> = rows.map_err(HistError::from);
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.windows(2).all(|w| w[0].id < w[1].id)),
            "HistDb.list_extractions: ascending ids"
        );
        result
    }
}
