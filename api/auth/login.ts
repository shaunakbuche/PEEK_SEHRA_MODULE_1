import { z } from "zod";
import { route, body, ApiError } from "../_lib/http.js";
import { qOne } from "../_lib/db.js";
import { setSession, verifyPassword } from "../_lib/auth.js";
import { checkRateLimit, recordFailure, clearFailures, clientIp } from "../_lib/rateLimit.js";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default route({
  POST: async (req, res) => {
    const parsed = LoginBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Enter a valid email and password");
    const { email, password } = parsed.data;
    const emailNorm = email.trim().toLowerCase();
    const limitKey = `${clientIp(req)}:${emailNorm}`;

    const limit = checkRateLimit(limitKey);
    if (limit.blocked) {
      const mins = Math.max(1, Math.ceil((limit.retryAfterSec ?? 60) / 60));
      throw new ApiError(429, `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
    }

    const user = await qOne<{
      id: string; org_id: string | null; email: string; password_hash: string;
      role: "school" | "admin"; full_name: string; token_version: number;
    }>(`SELECT * FROM users WHERE email = $1`, [emailNorm]);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      recordFailure(limitKey);
      throw new ApiError(401, "Incorrect email or password");
    }
    clearFailures(limitKey);

    setSession(res, { uid: user.id, role: user.role, orgId: user.org_id, tv: user.token_version });
    res.status(200).json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    });
  },
});
