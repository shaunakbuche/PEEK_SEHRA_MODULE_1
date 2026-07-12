import { z } from "zod";
import { route, body, ApiError } from "../_lib/http.js";
import { qOne } from "../_lib/db.js";
import { setSession, verifyPassword } from "../_lib/auth.js";

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default route({
  POST: async (req, res) => {
    const parsed = LoginBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Enter a valid email and password");
    const { email, password } = parsed.data;

    const user = await qOne<{
      id: string; org_id: string | null; email: string; password_hash: string;
      role: "school" | "admin"; full_name: string;
    }>(`SELECT * FROM users WHERE email = $1`, [email.trim().toLowerCase()]);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new ApiError(401, "Incorrect email or password");
    }

    setSession(res, { uid: user.id, role: user.role, orgId: user.org_id });
    res.status(200).json({
      user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    });
  },
});
