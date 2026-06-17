import { Pool } from 'pg'
let pool: Pool | null = null
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}
export async function initDb() {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      brief TEXT, title TEXT, content TEXT,
      hashtags TEXT[], cta TEXT, channel TEXT, channels TEXT[], tags TEXT[],
      layout TEXT DEFAULT 'A', image_url TEXT, image_base64 TEXT, image_style TEXT DEFAULT 'fill',
      status TEXT DEFAULT 'review', compliance_ok BOOLEAN DEFAULT false, compliance_issues TEXT[],
      author TEXT, scheduled_at TIMESTAMPTZ, published_at TIMESTAMPTZ, archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
