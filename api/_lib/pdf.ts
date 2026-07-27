import { createElement as h } from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReportContent, ThemeGroup } from "../../src/lib/reportTypes.js";
import { RAG_LEGEND, toRag } from "../../src/lib/reportTypes.js";

// Peek brand palette (Visual Identity Guidelines, March 2023).
const TEAL = "#194E55"; // Grey Green
const TEAL_DARK = "#002730"; // Charcoal Black
const TEAL_LIGHT = "#EAF6F5"; // light Teal tint
const INK = "#002730"; // Charcoal Black
const MUTED = "#5B6B6E";

// RAG scale (semantic, not brand).
const RAG_COLORS: Record<string, string> = {
  Green: "#2e7d5b",
  "Amber/Green": "#6ba368",
  Amber: "#d99a2b",
  "Red/Amber": "#d9722b",
  Red: "#c0392b",
};
const ragColor = (v: string) => RAG_COLORS[toRag(v)];

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
  h3: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: INK, marginTop: 5, marginBottom: 2 },
  label: { fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 2 },
  p: { marginBottom: 6 },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bulletMark: { width: 12, color: TEAL },
  bulletText: { flex: 1 },
  chip: { alignSelf: "flex-start", color: "#FFFFFF", fontSize: 9, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, marginBottom: 6 },
  box: { backgroundColor: TEAL_LIGHT, borderRadius: 8, padding: 14, marginTop: 8, marginBottom: 8 },
  note: { backgroundColor: "#FFF7E6", borderRadius: 8, padding: 12, marginTop: 6, marginBottom: 8, fontSize: 9.5 },
  footer: { position: "absolute", bottom: 28, left: 52, right: 52, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: MUTED },
  ragRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#DCE6E5", paddingVertical: 6 },
  legendRow: { flexDirection: "row", marginBottom: 5 },
});

function bullets(items: string[], keyPrefix = "b") {
  return items.map((t, i) =>
    h(View, { key: `${keyPrefix}${i}`, style: s.bullet }, h(Text, { style: s.bulletMark }, "•"), h(Text, { style: s.bulletText }, t))
  );
}

function themeGroups(groups: ThemeGroup[], keyPrefix: string) {
  return groups.flatMap((g, i) => [
    h(Text, { key: `${keyPrefix}-th${i}`, style: s.h3 }, g.theme || "General"),
    ...bullets(g.points, `${keyPrefix}-p${i}-`),
  ]);
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
      h(Text, { style: s.coverFooter }, "Synthesis & feasibility analysis · Scoping Module (the Minto Method)")
    ),

    // Synthesis report
    h(
      Page,
      { size: "A4", style: s.page },
      h(Text, { style: s.h1 }, "Executive summary"),
      h(Text, { style: s.p }, content.executiveSummary),

      h(Text, { style: s.h1 }, "Background and method"),
      h(Text, { style: s.p }, content.background),

      h(Text, { style: s.h1 }, "Context snapshot"),
      h(Text, { style: s.p }, content.contextSnapshot),

      content.dataQualityNote?.trim()
        ? h(View, { style: s.note }, h(Text, { style: { fontFamily: "Helvetica-Bold", marginBottom: 2 } }, "Data-quality note"), h(Text, null, content.dataQualityNote))
        : null,

      h(Text, { style: s.h1 }, "Component-by-component analysis"),
      ...content.components.flatMap((c, i) => [
        h(Text, { key: `t${i}`, style: s.h2 }, `Component ${i + 1}: ${c.name}`),
        h(Text, { key: `r${i}`, style: { ...s.chip, backgroundColor: ragColor(c.rag) } }, toRag(c.rag)),
        h(Text, { key: `sm${i}`, style: s.p }, c.summary),
        c.enablers.length ? h(Text, { key: `el${i}`, style: s.label }, "Enablers") : null,
        ...themeGroups(c.enablers, `en${i}`),
        c.barriers.length ? h(Text, { key: `bl${i}`, style: s.label }, "Barriers") : null,
        ...themeGroups(c.barriers, `ba${i}`),
        c.crossCutting?.trim() ? h(View, { key: `cc${i}`, style: s.box }, h(Text, { style: { fontFamily: "Helvetica-Bold", marginBottom: 2 } }, "Cross-cutting summary"), h(Text, null, c.crossCutting)) : null,
        c.actionPoints.length ? h(Text, { key: `al${i}`, style: s.label }, "Action points") : null,
        ...themeGroups(c.actionPoints, `ap${i}`),
      ]),

      h(Text, { style: s.h1, break: true }, "Overall feasibility and implications"),
      ...([
        ["Feasibility considerations", content.overall.feasibility],
        ["Programme strategy implications", content.overall.strategyImplications],
        ["Policy advocacy priorities", content.overall.policyAdvocacy],
        ["Recommended next steps", content.overall.nextSteps],
      ] as const).flatMap(([label, body], i) =>
        body?.trim() ? [h(Text, { key: `ov${i}`, style: s.h2 }, label), h(Text, { key: `ovp${i}`, style: s.p }, body)] : []
      ),

      footer()
    ),

    // RAG feasibility dashboard
    h(
      Page,
      { size: "A4", style: s.page },
      h(Text, { style: s.h1 }, "RAG feasibility dashboard"),
      h(
        View,
        { style: { ...s.box, flexDirection: "column" } },
        h(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 4 } },
          h(Text, { style: { fontFamily: "Helvetica-Bold", marginRight: 8 } }, "Overall"),
          h(Text, { style: { ...s.chip, backgroundColor: ragColor(content.overall.rag), marginBottom: 0 } }, toRag(content.overall.rag))),
        h(Text, null, content.overall.ragInterpretation)
      ),

      h(Text, { style: s.h2 }, "By component"),
      ...content.components.map((c, i) =>
        h(View, { key: `rr${i}`, style: s.ragRow, wrap: false },
          h(Text, { style: { flex: 1 } }, `C${i + 1} · ${c.name}`),
          h(Text, { style: { ...s.chip, backgroundColor: ragColor(c.rag), marginBottom: 0 } }, toRag(c.rag)))
      ),
      ...content.components.flatMap((c, i) =>
        c.ragSummary?.trim() ? [h(Text, { key: `rs${i}`, style: { fontSize: 9.5, color: MUTED, marginTop: 3 } }, `C${i + 1}: ${c.ragSummary}`)] : []
      ),

      content.topActions.length ? h(Text, { style: s.h2 }, "Top priority actions") : null,
      ...bullets(content.topActions, "ta"),

      h(Text, { style: s.h2 }, "RAG legend"),
      ...RAG_LEGEND.map((r, i) =>
        h(View, { key: `lg${i}`, style: s.legendRow, wrap: false },
          h(Text, { style: { ...s.chip, backgroundColor: ragColor(r.level), marginBottom: 0, marginRight: 8, width: 68, textAlign: "center" } }, r.level),
          h(Text, { style: { flex: 1, fontSize: 9.5 } }, r.description))
      ),

      footer()
    )
  );

  return renderToBuffer(doc as any);
}
