import { Pool } from "pg";

/**
 * Standard node-postgres pool, not the Neon-specific @vercel/postgres client.
 * Works against any Postgres provider (Supabase, Neon, RDS, etc.) since it
 * speaks plain wire-protocol Postgres over TCP+SSL rather than a proprietary
 * HTTP/WebSocket gateway.
 */
/**
 * Strip sslmode from the URL so pg-connection-string doesn't apply its own
 * mode-based TLS logic (recent versions treat "require"/"prefer" as aliases
 * for "verify-full", which rejects Supabase's certificate chain). SSL is
 * controlled explicitly via the `ssl` option below instead.
 */
function stripSslMode(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return raw;
  }
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const raw = process.env.POSTGRES_URL;
    if (!raw) {
      throw new Error("POSTGRES_URL is not set. Create a Postgres store in the Vercel dashboard and redeploy.");
    }
    pool = new Pool({
      connectionString: stripSslMode(raw),
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

/** Parametrized query helper. */
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params as any[]);
  return res.rows as T[];
}

export async function qOne<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('school','admin')),
  full_name text NOT NULL DEFAULT '',
  token_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','in_review','approved','returned')),
  answers jsonb NOT NULL DEFAULT '{}',
  return_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS assessments_org_unique ON assessments(org_id);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated','edited','approved')),
  content jsonb NOT NULL,
  ai_model text NOT NULL DEFAULT '',
  pdf_url text,
  docx_url text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reports_assessment_unique ON reports(assessment_id);
CREATE TABLE IF NOT EXISTS report_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  editor_id uuid NOT NULL REFERENCES users(id),
  diff jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('school','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_org_idx ON messages(org_id, created_at);
`;

export async function ensureSchema() {
  await getPool().query(SCHEMA_SQL);
}
