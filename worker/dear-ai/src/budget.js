import { DurableObject } from 'cloudflare:workers';

const persistentVersion = '20260907-persistent-1';
const legacyVersion = '20260906-public-1';
const persistentExpiry = Number.MAX_SAFE_INTEGER;
// One coordinator per clinic/month; aggregate counts and consent receipts, never chat or IP.
export class ChatBudget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT PRIMARY KEY, requests INTEGER NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS consent_sessions (id TEXT PRIMARY KEY, version TEXT NOT NULL, accepted_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
  }
  async consent(action, id, version) {
    const sql = this.ctx.storage.sql;
    const now = Date.now();
    sql.exec('DELETE FROM consent_sessions WHERE expires_at <= ?', now);
    sql.exec('DELETE FROM consent_sessions WHERE version NOT IN (?, ?)', persistentVersion, legacyVersion);
    if (action === 'accept') {
      if (![persistentVersion, legacyVersion].includes(version)) return null;
      // Only the new notice permits persistent receipts; old clients keep 30-minute consent.
      if (sql.exec('SELECT COUNT(*) AS n FROM consent_sessions').one().n >= 2000) return null;
      const persistent = version === persistentVersion;
      const expires = persistent ? persistentExpiry : now + 30 * 60000;
      sql.exec('INSERT INTO consent_sessions (id, version, accepted_at, expires_at) VALUES (?, ?, ?, ?)', id, version, now, expires);
      const scheduled = await this.ctx.storage.getAlarm();
      const cleanupAt = Math.min(expires + 60000, now + 86400000);
      if (!scheduled || scheduled > cleanupAt) await this.ctx.storage.setAlarm(cleanupAt);
      return { id, version, acceptedAt: now, expires: persistent ? null : expires };
    }
    if (action === 'withdraw') {
      sql.exec('DELETE FROM consent_sessions WHERE id = ?', id);
      return true;
    }
    return Boolean(sql.exec('SELECT id FROM consent_sessions WHERE id = ? AND version = ? AND expires_at > ?', id, version, now).toArray().length);
  }
  async alarm() {
    this.ctx.storage.sql.exec('DELETE FROM consent_sessions WHERE expires_at <= ?', Date.now());
    this.ctx.storage.sql.exec('DELETE FROM consent_sessions WHERE version NOT IN (?, ?)', persistentVersion, legacyVersion);
    const next = this.ctx.storage.sql.exec('SELECT MIN(expires_at) AS n FROM consent_sessions').one().n;
    if (next) await this.ctx.storage.setAlarm(Math.min(next + 60000, Date.now() + 86400000));
  }
  reserve() {
    const dailyLimit = Number(this.env.DAILY_REQUEST_LIMIT ?? 200);
    const monthlyLimit = Number(this.env.MONTHLY_REQUEST_LIMIT ?? 2000);
    if (![dailyLimit, monthlyLimit].every(value => Number.isSafeInteger(value) && value > 0)) return false;
    const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const sql = this.ctx.storage.sql;
    const total = sql.exec('SELECT COALESCE(SUM(requests), 0) AS n FROM counts').one().n;
    const today = sql.exec('SELECT requests FROM counts WHERE day = ?', day).toArray()[0]?.requests || 0;
    if (total >= monthlyLimit || today >= dailyLimit) return false;
    sql.exec('INSERT INTO counts (day, requests) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET requests = requests + 1', day);
    return true;
  }
}
