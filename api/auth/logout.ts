import { route } from "../_lib/http";
import { clearSession } from "../_lib/auth";

export default route({
  POST: async (_req, res) => {
    clearSession(res);
    res.status(200).json({ ok: true });
  },
});
