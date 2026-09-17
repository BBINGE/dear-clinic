-- 디숭이 대화 로그
-- 개인 식별 정보는 워커의 maskSensitive()가 저장 전에 가린다.
-- session은 동의 토큰/세션값의 해시 앞 16자리이며 방문자를 식별하지 않고 같은 대화만 묶는다.
CREATE TABLE IF NOT EXISTS chat_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session       TEXT    NOT NULL,
  turn          INTEGER NOT NULL,
  ts            TEXT    NOT NULL,
  lang          TEXT,
  page          TEXT,
  user_text     TEXT,
  reply_text    TEXT,
  action        TEXT,
  booking_route TEXT,
  topic         TEXT,
  recommended   TEXT
);

CREATE INDEX IF NOT EXISTS chat_log_ts      ON chat_log (ts);
CREATE INDEX IF NOT EXISTS chat_log_session ON chat_log (session, turn);
CREATE INDEX IF NOT EXISTS chat_log_topic   ON chat_log (topic);
