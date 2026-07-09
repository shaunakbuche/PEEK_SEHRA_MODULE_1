import { createElement as h } from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReportContent } from "../../src/lib/reportTypes";

const TEAL = "#0F766B";
const TEAL_DARK = "#06403B";
const TEAL_LIGHT = "#E4F2F0";
const INK = "#1B2A2E";
const MUTED = "#5B6B6E";

const INDICATOR_COLORS: Record<string, string> = {
  "Low Potential": "#D8593F",
  "Some Possibilities": "#E6A23C",
  "Good Possibilities": "#4FB07F",
  "High Potential": "#0AA18F",
};

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 52, fontSize: 10.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.5 },
  cover: { backgroundColor: TEAL, color: "#FFFFFF", padding: 56, display: "flex", justifyContent: "space-between" },
  coverKicker: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", marginTop: 14, lineHeight: 1.25 },
  coverMeta: { fontSize: 12, marginTop: 8, opacity: 0.9 },
  coverFooter: { fontSize: 10, opacity: 0.85 },
  dot: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF", opacity: 0.25, marginRight: 8 },
  dots: { flexDirection: "row", marginBottom: 26 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: TEAL_DARK, marginBottom: 8, marginTop: 18 },
  h2: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: TEAL_DARK, marginBottom: 5, marginTop: 12 },
  p: { marginBottom: 6 },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bulletMark: { width: 12, color: TEAL },
  bulletText: { flex: 1 },
  chip: { alignSelf: "flex-start", color: "#FFFFFF", fontSize: 9, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, marginBottom: 6 },
  box: { backgroundColor: TEAL_LIGHT, borderRadius: 8, padding: 14, marginTop: 8, marginBottom: 8 },
  verdict: { fontSize: 13, fontFamily: "Helvetica-Bold", color: TEAL_DARK, marginBottom: 4 },
  footer: { position: "absolute", bottom: 28, left: 52, right: 52, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: MUTED },
  themeCard: { borderLeftWidth: 3, borderLeftColor: TEAL, paddingLeft: 10, marginBottom: 10 },
  themeTitle: { fontFamily: "Helvetica-Bold", color: TEAL_DARK, fontSize: 11, marginBottom: 2 },
  evidence: { fontSize: 9.5, color: MUTED, marginTop: 2 },
});

function bullets(items: string[]) {
  return items.map((t, i) =>
    h(View, { key: i, style: s.bullet }, h(Text, { style: s.bulletMark }, "•"), h(Text, { style: s.bulletText }, t))
  );
}

function footer() {
  return h(
    View,
    { style: s.footer, fixed: true },
    h(Text, null, "School Eye Health Rapid Assessment (SEHRA) Scoping Module · Peek Vision"),
    h(Text, { render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` })
  );
}

export async function renderReportPdf(content: ReportContent, meta: { org: string; country: string }): Promise<Buffer> {
  const doc = h(
    Document,
    { title: content.title, author: "Peek Vision — SEHRA" },

    // Cover
    h(
      Page,
      { size: "A4", style: s.cover },
      h(
        View,
        null,
        h(View, { style: s.dots }, h(View, { style: s.dot }), h(View, { style: { ...s.dot, opacity: 0.5 } }), h(View, { style: { ...s.dot, opacity: 0.85 } })),
        h(Text, { style: s.coverKicker }, "Peek Vision · SEHRA Module 1"),
        h(Text, { style: s.coverTitle }, content.title),
        h(Text, { style: s.coverMeta }, `${meta.org}${meta.country ? " · " + meta.country : ""}`),
        h(Text, { style: s.coverMeta }, new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))
      ),
      h(Text, { style: s.coverFooter }, "School Eye Health Rapid Assessment · Scoping Module (the Minto Method)")
    ),

    // Body
    h(
      Page,
      { size: "A4", style: s.page },
      h(Text, { style: s.h1 }, "Executive summary"),
      h(Text, { style: s.p }, content.executiveSummary),

      h(Text, { style: s.h1 }, "Context"),
      h(Text, { style: s.p }, content.context),

      h(Text, { style: s.h1, break: false }, "Component findings"),
      ...content.components.flatMap((c, i) => [
        h(Text, { key: `t${i}`, style: s.h2 }, `Component ${i + 1}: ${c.name}`),
        h(Text, { key: `c${i}`, style: { ...s.chip, backgroundColor: INDICATOR_COLORS[c.indicatorLevel] || TEAL } }, c.indicatorLevel || "Not set"),
        h(Text, { key: `f${i}`, style: s.p }, c.findings),
        c.challenges.length ? h(Text, { key: `ch${i}`, style: { fontFamily: "Helvetica-Bold", marginBottom: 3 } }, "Challenges") : null,
        ...(c.challenges.length ? bullets(c.challenges) : []),
        c.supports.length ? h(Text, { key: `sh${i}`, style: { fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 3 } }, "Supporting factors") : null,
        ...(c.supports.length ? bullets(c.supports) : []),
      ]),

      h(Text, { style: s.h1, break: true }, "Thematic analysis"),
      ...content.themeAnalysis.map((t, i) =>
        h(
          View,
          { key: i, style: s.themeCard, wrap: false },
          h(Text, { style: s.themeTitle }, t.theme),
          h(Text, null, t.assessment),
          ...t.evidence.map((e, j) => h(Text, { key: j, style: s.evidence }, `Evidence: ${e}`))
        )
      ),

      h(Text, { style: s.h1 }, "Feasibility"),
      h(
        View,
        { style: s.box },
        h(Text, { style: s.verdict }, content.feasibility.verdict),
        h(Text, null, content.feasibility.rationale)
      ),

      h(Text, { style: s.h1 }, "Recommendations"),
      ...bullets(content.recommendations),

      footer()
    )
  );

  return renderToBuffer(doc as any);
}
