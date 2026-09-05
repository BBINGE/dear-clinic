import { DurableObject } from 'cloudflare:workers';

// One coordinator per clinic/month; stores aggregate counts only, never chat or IP.
export class ChatBudget extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT PRIMARY KEY, requests INTEGER NOT NULL)');
  }
  reserve() {
    const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const sql = this.ctx.storage.sql;
    const total = sql.exec('SELECT COALESCE(SUM(requests), 0) AS n FROM counts').one().n;
    const today = sql.exec('SELECT requests FROM counts WHERE day = ?', day).toArray()[0]?.requests || 0;
    if (total >= Number(this.env.MONTHLY_REQUEST_LIMIT || 2000) || today >= Number(this.env.DAILY_REQUEST_LIMIT || 200)) return false;
    sql.exec('INSERT INTO counts (day, requests) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET requests = requests + 1', day);
    return true;
  }
}
