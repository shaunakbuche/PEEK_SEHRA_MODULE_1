import { ASSESS, SCALE_KEY, type Question } from "@/data/sehra";
import { getField, getAll, completionPct } from "@/lib/store";

const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

type Answer =
  | { q: string; a: string; r?: string }
  | { q: string; list: string[]; r?: string }
  | { q: string; challenges: string[]; supports: string[] }
  | null;

function answerFor(q: Question): Answer {
  switch (q.type) {
    case "yn": {
      const a = getField(q.id + "__yn"), r = getField(q.id + "__rem");
      if (!a && !r) return null;
      return { q: q.text, a: a || "—", r };
    }
    case "text":
    case "field": {
      const v = getField(q.id);
      return v && v.trim() ? { q: q.text, a: v } : null;
    }
    case "group": {
      const picked = q.items.map((it, i) => [it, getField(`${q.id}__${i}`)]).filter(([, v]) => v);
      const r = getField(q.id + "__rem");
      if (!picked.length && !r) return null;
      return { q: q.text, list: picked.map(([it, v]) => `${it}: ${v}`), r };
    }
    case "table": {
      const cells: string[] = [];
      q.rows.forEach((row, ri) => q.cols.forEach((col, ci) => {
        const v = getField(`${q.id}__${ri}_${ci}`);
        if (v && v.trim()) cells.push(`${row} — ${col}: ${v}`);
      }));
      return cells.length ? { q: q.text, list: cells } : null;
    }
    case "reflections": {
      const ch = [0, 1, 2].map((i) => getField(`${q.id}__challenge_${i}`)).filter((x) => x && x.trim());
      const su = [0, 1, 2].map((i) => getField(`${q.id}__support_${i}`)).filter((x) => x && x.trim());
      if (!ch.length && !su.length) return null;
      return { q: "Reflections & Implications", challenges: ch, supports: su };
    }
    default:
      return null;
  }
}

export function compileReport(): { text: string; html: string } {
  const meta: Record<string, string> = {
    Country: getField("meta_country"),
    "Province/Governorate": getField("meta_province"),
    "District/County": getField("meta_district"),
    Date: getField("meta_date"),
  };
  const T: string[] = [];
  let H = "";
  T.push("SEHRA SCOPING MODULE — THE MINTO METHOD");
  T.push("=".repeat(48));
  Object.entries(meta).forEach(([k, v]) => T.push(`${k}: ${v || "—"}`));
  T.push(`Overall completion: ${completionPct()}%`);
  T.push("");
  H += `<h1 style="font-family:Georgia,serif;color:#0a766b">SEHRA Scoping Module — The Minto Method</h1>
    <table style="border-collapse:collapse;margin:0 0 18px">${Object.entries(meta)
      .map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;color:#557571">${k}</td><td><b>${esc(v || "—")}</b></td></tr>`)
      .join("")}<tr><td style="padding:2px 14px 2px 0;color:#557571">Completion</td><td><b>${completionPct()}%</b></td></tr></table>`;

  ASSESS.forEach((comp) => {
    const label = comp.id === "context" ? "Context" : `Component ${comp.number}: ${comp.title}`;
    const scale = Number(getField(`${comp.id}__scale`));
    const scaleTxt = scale ? SCALE_KEY.find((s) => s.value === scale)?.label : null;
    T.push("", label.toUpperCase(), "-".repeat(label.length));
    H += `<h2 style="font-family:Georgia,serif;color:#053b37;margin-top:26px;border-bottom:2px solid #16c2ad;padding-bottom:4px">${esc(label)}</h2>`;
    if (scaleTxt) {
      T.push(`Indicator analysis: ${scaleTxt}`);
      H += `<p style="margin:4px 0;color:#0a766b"><b>Indicator analysis:</b> ${esc(scaleTxt)}</p>`;
    }
    comp.subsections.forEach((sub) => {
      const answers = sub.questions.map(answerFor).filter(Boolean) as Exclude<Answer, null>[];
      if (!answers.length) return;
      T.push("", `  ${sub.id} ${sub.title}`);
      H += `<h3 style="margin:16px 0 4px;color:#102b29">${esc(sub.id)} ${esc(sub.title)}</h3>`;
      answers.forEach((a) => {
        if ("challenges" in a) {
          T.push(`    ${a.q}:`);
          H += `<p style="margin:6px 0 2px"><b>${esc(a.q)}</b></p>`;
          if (a.challenges.length) {
            T.push("      Challenges:"); a.challenges.forEach((c) => T.push(`        • ${c}`));
            H += `<div style="color:#ef6a43"><b>Challenges</b><ul>${a.challenges.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
          }
          if (a.supports.length) {
            T.push("      Supports:"); a.supports.forEach((c) => T.push(`        • ${c}`));
            H += `<div style="color:#0a766b"><b>Supports</b><ul>${a.supports.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
          }
        } else if ("list" in a) {
          T.push(`    ${a.q}`); a.list.forEach((l) => T.push(`      • ${l}`)); if (a.r) T.push(`      Remarks: ${a.r}`);
          H += `<p style="margin:6px 0 2px">${esc(a.q)}</p><ul>${a.list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>${a.r ? `<p style="color:#557571"><i>Remarks: ${esc(a.r)}</i></p>` : ""}`;
        } else {
          T.push(`    ${a.q}`, `      ${a.a}${a.r ? " | Remarks: " + a.r : ""}`);
          H += `<p style="margin:6px 0 2px">${esc(a.q)}<br><b>${esc(a.a)}</b>${a.r ? ` <span style="color:#557571">— ${esc(a.r)}</span>` : ""}</p>`;
        }
      });
    });
  });

  const extras: [string, string][] = [
    ["sum_gaps", "Evidence gaps / research questions"],
    ["sum_groups", "Additional groups / associations"],
    ["sum_unserved", "Groups with no screening service"],
  ];
  const exFilled = extras.filter(([id]) => getField(id).trim());
  if (exFilled.length) {
    T.push("", "ADDITIONAL ITEMS");
    H += `<h2 style="font-family:Georgia,serif;color:#053b37;margin-top:26px">Additional items</h2>`;
    exFilled.forEach(([id, lab]) => { T.push(`  ${lab}: ${getField(id)}`); H += `<p>${esc(lab)}: <b>${esc(getField(id))}</b></p>`; });
  }
  return { text: T.join("\n"), html: H };
}

export function subjectLine(): string {
  return `SEHRA Scoping Module — ${getField("meta_country") || "—"} (${completionPct()}% complete)`;
}

/** Default destination — the Peek SEHRA team, per the module. */
export const DEFAULT_RECIPIENTS = "priya@peekvision.org, sehra@peekvision.org";

export async function sendOnline(recipientsRaw: string, fromName: string): Promise<{ ok: boolean; primary: string; message?: string }> {
  const recipients = recipientsRaw.split(/[,;\s]+/).filter(Boolean);
  const primary = recipients[0];
  const { text } = compileReport();
  const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(primary), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: subjectLine(),
      Name: fromName || "SEHRA Scoping Module",
      "Copy to": recipients.slice(1).join(", ") || "(none)",
      Report: text,
    }),
  });
  const data = await res.json().catch(() => ({} as any));
  const ok = res.ok && (data.success === "true" || data.success === true);
  return { ok, primary, message: data.message };
}

export function sendMailto(recipientsRaw: string) {
  const recipients = recipientsRaw.split(/[,;\s]+/).filter(Boolean).join(",");
  const { text } = compileReport();
  const body = encodeURIComponent(
    text.slice(0, 1800) + (text.length > 1800 ? "\n\n[Report truncated for email — full version is in the downloaded file.]" : "")
  );
  downloadReport(true);
  window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subjectLine())}&body=${body}`;
}

export function downloadReport(silent = false) {
  const { html } = compileReport();
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(subjectLine())}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#102b29;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.55}ul{margin:4px 0}</style>
    </head><body>${html}<hr style="margin-top:30px;border:none;border-top:1px solid #d2e2dc"><p style="color:#557571;font-size:.85em">Generated from the SEHRA Scoping Module · peekvision.org</p></body></html>`;
  const blob = new Blob([doc], { type: "text/html" });
  const a = document.createElement("a");
  const country = (getField("meta_country") || "SEHRA").replace(/[^a-z0-9]/gi, "_");
  a.href = URL.createObjectURL(blob);
  a.download = `SEHRA_Report_${country}_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  void silent;
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(getAll(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SEHRA_data_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}
