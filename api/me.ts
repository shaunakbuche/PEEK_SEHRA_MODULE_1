import { route } from "./_lib/http";
import { getSession } from "./_lib/auth";
import { qOne } from "./_lib/db";

export default route({
  GET: async (req, res) => {
    const session = getSession(req);
    if (!session) {
      res.status(200).json({ user: null });
      return;
    }
    const row = await qOne<any>(
      `SELECT u.id, u.email, u.role, u.full_name,
              o.id AS org_id, o.name AS org_name, o.country AS org_country, o.region AS org_region
       FROM users u LEFT JOIN organizations o ON o.id = u.org_id
       WHERE u.id = $1`,
      [session.uid]
    );
    if (!row) {
      res.status(200).json({ user: null });
      return;
    }
    res.status(200).json({
      user: {
        id: row.id,
        email: row.email,
        role: row.role,
        fullName: row.full_name,
        org: row.org_id
          ? { id: row.org_id, name: row.org_name, country: row.org_country, region: row.org_region }
          : null,
      },
    });
  },
});
