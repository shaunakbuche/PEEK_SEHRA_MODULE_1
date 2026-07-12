import { route } from "../_lib/http.js";
import { clearSession } from "../_lib/auth.js";

export default route({
  POST: async (_req, res) => {
    clearSession(res);
    res.status(200).json({ ok: true });
  },
});
