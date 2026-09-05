import { DurableObject } from 'cloudflare:workers';

// One coordinator per clinic/month; aggregate counts and temporary consent receipts, never chat or IP.
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
    if (action === 'accept') {
      // No name, IP, symptoms or conversation: a short-lived server acknowledgement only.
      if (sql.exec('SELECT COUNT(*) AS n FROM consent_sessions').one().n >= 2000) return null;
      const expires = now + 30 * 60000;
      sql.exec('INSERT INTO consent_sessions (id, version, accepted_at, expires_at) VALUES (?, ?, ?, ?)', id, version, now, expires);
      const scheduled = await this.ctx.storage.getAlarm();
      if (!scheduled || scheduled > expires + 60000) await this.ctx.storage.setAlarm(expires + 60000);
      return { id, version, acceptedAt: now, expires };
    }
    if (action === 'withdraw') {
      sql.exec('DELETE FROM consent_sessions WHERE id = ?', id);
      return true;
    }
    return Boolean(sql.exec('SELECT id FROM consent_sessions WHERE id = ? AND version = ? AND expires_at > ?', id, version, now).toArray().length);
  }
  async alarm() {
    this.ctx.storage.sql.exec('DELETE FROM consent_sessions WHERE expires_at <= ?', Date.now());
    const next = this.ctx.storage.sql.exec('SELECT MIN(expires_at) AS n FROM consent_sessions').one().n;
    if (next) await this.ctx.storage.setAlarm(next + 60000);
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
