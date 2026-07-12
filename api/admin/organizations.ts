import { z } from "zod";
import { route, body, ApiError } from "../_lib/http.js";
import { requireAuth, hashPassword } from "../_lib/auth.js";
import { q, qOne } from "../_lib/db.js";

const CreateBody = z.object({
  name: z.string().min(2).max(120),
  country: z.string().min(2).max(80),
  region: z.string().max(120).optional().default(""),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().max(120).optional().default(""),
});

export default route({
  /** List every organization with assessment + report status for the dashboard. */
  GET: async (req, res) => {
    await requireAuth(req, "admin");
    const rows = await q<any>(
      `SELECT o.id, o.name, o.country, o.region, o.created_at,
              u.email AS school_email,
              a.id AS assessment_id, a.status AS assessment_status,
              a.submitted_at, a.updated_at,
              r.id AS report_id, r.status AS report_status
       FROM organizations o
       LEFT JOIN users u ON u.org_id = o.id AND u.role = 'school'
       LEFT JOIN assessments a ON a.org_id = o.id
       LEFT JOIN reports r ON r.assessment_id = a.id
       ORDER BY o.created_at DESC`
    );
    res.status(200).json({
      organizations: rows.map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country,
        region: r.region,
        schoolEmail: r.school_email,
        assessmentId: r.assessment_id,
        assessmentStatus: r.assessment_status ?? "draft",
        submittedAt: r.submitted_at,
        updatedAt: r.updated_at,
        reportId: r.report_id,
        reportStatus: r.report_status,
      })),
    });
  },

  /** Create an organization plus its school login, and its empty assessment. */
  POST: async (req, res) => {
    await requireAuth(req, "admin");
    const parsed = CreateBody.safeParse(body(req));
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid input");
    }
    const { name, country, region, email, password, fullName } = parsed.data;
    const emailNorm = email.trim().toLowerCase();

    const taken = await qOne(`SELECT id FROM users WHERE email = $1`, [emailNorm]);
    if (taken) throw new ApiError(409, "That email already has a login");

    const org: any = await qOne(
      `INSERT INTO organizations (name, country, region) VALUES ($1,$2,$3) RETURNING *`,
      [name, country, region]
    );
    await q(
      `INSERT INTO users (org_id, email, password_hash, role, full_name)
       VALUES ($1,$2,$3,'school',$4)`,
      [org.id, emailNorm, await hashPassword(password), fullName]
    );
    await q(`INSERT INTO assessments (org_id) VALUES ($1) ON CONFLICT (org_id) DO NOTHING`, [org.id]);

    res.status(201).json({
      organization: { id: org.id, name: org.name, country: org.country, region: org.region },
      login: { email: emailNorm },
    });
  },
});
