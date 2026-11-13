use rusqlite::{OptionalExtension, params};

use super::{EXCHANGE_COLUMNS, HistDb, SESSION_COLUMNS, exchange_of, session_of};
use crate::hist::{Contents, Exchange, ExchangeQuery, HistError, Session};

const UPSERT_SESSION: &str =
    "INSERT INTO sessions (id, started, harness, host, path) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (id) DO UPDATE SET started = ?2, harness = ?3, host = ?4, path = ?5";

const UPSERT_EXCHANGE: &str = "INSERT INTO exchanges (id, session, parent, timestamp, kind, actor, model,
       tokens_in, tokens_out, tokens_cache_read, tokens_cache_write, distilled, meta)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
     ON CONFLICT (id) DO UPDATE SET session = ?2, parent = ?3, timestamp = ?4, kind = ?5, actor = ?6, model = ?7,
       tokens_in = ?8, tokens_out = ?9, tokens_cache_read = ?10, tokens_cache_write = ?11, meta = ?13";

const UPSERT_CONTENTS: &str =
    "INSERT INTO contents (exchange_id, input, output, tools) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (exchange_id) DO UPDATE SET input = ?2, output = ?3, tools = ?4";

impl HistDb {
    pub fn upsert_sessions(&self, rows: &[Session]) -> Result<usize, HistError> {
        let result = self.write_all(UPSERT_SESSION, rows, |stmt, r| {
            stmt.execute(params![r.id, r.started, r.harness, r.host, r.path])
        });
        debug_assert!(
            result.as_ref().map_or(true, |n| *n == rows.len()),
            "HistDb.upsert_sessions: every row written"
        );
        result
    }

    pub fn upsert_exchanges(&self, rows: &[Exchange]) -> Result<usize, HistError> {
        let result = self.write_all(UPSERT_EXCHANGE, rows, |stmt, r| {
            let meta = r.meta.as_ref().map(ToString::to_string);
            stmt.execute(params![
                r.id,
                r.session,
                r.parent,
                r.timestamp,
                r.kind,
                r.actor,
                r.model,
                r.tokens_in,
                r.tokens_out,
                r.tokens_cache_read,
                r.tokens_cache_write,
                r.distilled,
                meta
            ])
        });
        debug_assert!(
            result.as_ref().map_or(true, |n| *n == rows.len()),
            "HistDb.upsert_exchanges: every row written"
        );
        result
    }

    pub fn upsert_contents(&self, rows: &[Contents]) -> Result<usize, HistError> {
        let result = self.write_all(UPSERT_CONTENTS, rows, |stmt, r| {
            stmt.execute(params![r.exchange_id, r.input, r.output, r.tools])
        });
        debug_assert!(
            result.as_ref().map_or(true, |n| *n == rows.len()),
            "HistDb.upsert_contents: every row written"
        );
        result
    }

    pub fn set_distilled(&self, id: &str, distilled: Option<&str>) -> Result<bool, HistError> {
        let changed = self.lock().execute(
            "UPDATE exchanges SET distilled = ?1 WHERE id = ?2",
            params![distilled, id],
        )?;
        let result: Result<bool, HistError> = Ok(changed > 0);
        result
    }

    pub fn list_sessions(
        &self,
        harness: Option<&str>,
        limit: i64,
    ) -> Result<Vec<Session>, HistError> {
        let sql = format!(
            "SELECT {SESSION_COLUMNS} FROM sessions WHERE (?1 IS NULL OR harness = ?1) ORDER BY started DESC LIMIT ?2"
        );
        let conn = self.lock();
        let rows = conn
            .prepare(&sql)?
            .query_map(params![harness, limit], session_of)?
            .collect::<rusqlite::Result<Vec<_>>>();
        let result: Result<Vec<Session>, HistError> = rows.map_err(HistError::from);
        debug_assert!(
            result.as_ref().map_or(true, |r| limit < 0
                || i64::try_from(r.len()).unwrap_or(i64::MAX) <= limit),
            "HistDb.list_sessions: at most limit rows"
        );
        result
    }

    pub fn list_exchanges(
        &self,
        query: &ExchangeQuery,
        distilled: Option<bool>,
        limit: i64,
    ) -> Result<Vec<Exchange>, HistError> {
        let sql = format!(
            "SELECT {EXCHANGE_COLUMNS} FROM exchanges
             WHERE (?1 IS NULL OR session = ?1) AND (?2 IS NULL OR kind = ?2)
               AND (?3 IS NULL OR timestamp >= ?3) AND (?4 IS NULL OR timestamp <= ?4)
               AND (?5 IS NULL OR (distilled IS NOT NULL) = ?5)
             ORDER BY timestamp DESC LIMIT ?6"
        );
        let conn = self.lock();
        let bind = params![
            query.session,
            query.kind,
            query.since,
            query.until,
            distilled,
            limit
        ];
        let rows = conn
            .prepare(&sql)?
            .query_map(bind, exchange_of)?
            .collect::<rusqlite::Result<Vec<_>>>();
        let result: Result<Vec<Exchange>, HistError> = rows.map_err(HistError::from);
        debug_assert!(
            result.as_ref().map_or(true, |r| limit < 0
                || i64::try_from(r.len()).unwrap_or(i64::MAX) <= limit),
            "HistDb.list_exchanges: at most limit rows"
        );
        result
    }

    pub fn get_exchange(&self, id: &str) -> Result<Option<Exchange>, HistError> {
        let sql = format!("SELECT {EXCHANGE_COLUMNS} FROM exchanges WHERE id = ?1");
        let result: Result<Option<Exchange>, HistError> = Ok(self
            .lock()
            .query_row(&sql, params![id], exchange_of)
            .optional()?);
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.as_ref().is_none_or(|e| e.id == id)),
            "HistDb.get_exchange: the row asked"
        );
        result
    }

    pub fn get_contents(&self, id: &str, with_tools: bool) -> Result<Option<Contents>, HistError> {
        let sql = "SELECT exchange_id, input, output, tools FROM contents WHERE exchange_id = ?1";
        let found = self.lock().query_row(sql, params![id], |row| {
            let tools: Option<String> = row.get(3)?;
            Ok(Contents {
                exchange_id: row.get(0)?,
                input: row.get(1)?,
                output: row.get(2)?,
                tools: tools.filter(|_| with_tools),
            })
        });
        let result: Result<Option<Contents>, HistError> = Ok(found.optional()?);
        debug_assert!(
            result.as_ref().map_or(true, |r| r
                .as_ref()
                .is_none_or(|c| with_tools || c.tools.is_none())),
            "HistDb.get_contents: tools only when asked"
        );
        result
    }

    pub fn chat_inputs(
        &self,
        since: Option<&str>,
        until: Option<&str>,
        limit: i64,
    ) -> Result<Vec<(Exchange, String)>, HistError> {
        let sql = format!(
            "SELECT {EXCHANGE_COLUMNS}, input FROM exchanges
             JOIN contents ON contents.exchange_id = exchanges.id
             WHERE kind = 'chat' AND (?1 IS NULL OR timestamp >= ?1) AND (?2 IS NULL OR timestamp <= ?2)
             ORDER BY timestamp, id LIMIT ?3"
        );
        let conn = self.lock();
        let rows = conn
            .prepare(&sql)?
            .query_map(params![since, until, limit], |row| {
                Ok((exchange_of(row)?, row.get(13)?))
            })?
            .collect::<rusqlite::Result<Vec<_>>>();
        let result: Result<Vec<(Exchange, String)>, HistError> = rows.map_err(HistError::from);
        debug_assert!(
            result
                .as_ref()
                .map_or(true, |r| r.iter().all(|(e, _)| e.kind == "chat")),
            "HistDb.chat_inputs: only chat exchanges"
        );
        result
    }
}
