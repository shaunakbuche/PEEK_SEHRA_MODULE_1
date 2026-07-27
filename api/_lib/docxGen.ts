import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, Footer, PageNumber,
} from "docx";
import type { ReportContent, ThemeGroup } from "../../src/lib/reportTypes.js";
import { RAG_LEGEND, toRag } from "../../src/lib/reportTypes.js";

// Peek brand palette (Visual Identity Guidelines, March 2023).
const TEAL = "194E55"; // Grey Green
const TEAL_DARK = "002730"; // Charcoal Black
const TEAL_LIGHT = "EAF6F5"; // light Teal tint

// RAG scale fills (semantic, not brand).
const RAG_FILLS: Record<string, string> = {
  Green: "DCEFE4",
  "Amber/Green": "E3F0DA",
  Amber: "FAEBD4",
  "Red/Amber": "FADFC9",
  Red: "F8DDD6",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCDDDB" };
const borders = { top: border, bottom: border, left: border, right: border };

function para(text: string, opts: { spacingAfter?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 160 },
    children: [new TextRun(text)],
  });
}

function bulletList(items: string[]) {
  return items.map(
    (t) =>
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 60 },
        children: [new TextRun(t)],
      })
  );
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

/** Enablers / barriers / action points grouped under their themes. */
function themeGroups(groups: ThemeGroup[]) {
  return groups.flatMap((g) => [
    new Paragraph({ spacing: { before: 100, after: 40 }, children: [new TextRun({ text: g.theme || "General", bold: true })] }),
    ...bulletList(g.points),
  ]);
}

export async function renderReportDocx(content: ReportContent, meta: { org: string; country: string }): Promise<Buffer> {
  const componentRows = content.components.map(
    (c, i) =>
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 5860, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: `Component ${i + 1}: ${c.name}` })] })],
          }),
          new TableCell({
            borders,
            width: { size: 3500, type: WidthType.DXA },
            shading: { fill: RAG_FILLS[toRag(c.rag)] || TEAL_LIGHT, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: toRag(c.rag), bold: true })] })],
          }),
        ],
      })
  );

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Public Sans", size: 22 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal",
          run: { size: 52, bold: true, font: "Domine", color: TEAL_DARK },
          paragraph: { spacing: { before: 0, after: 200 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Public Sans", color: TEAL_DARK },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 25, bold: true, font: "Public Sans", color: TEAL },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "recs",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1300, bottom: 1440, left: 1300 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "SEHRA Scoping Module · Peek Vision · Page ", size: 17, color: "6B7B7E" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "6B7B7E" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ style: "Title", children: [new TextRun(content.title)] }),
          new Paragraph({
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: `${meta.org}${meta.country ? " · " + meta.country : ""} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
                color: "5B6B6E",
              }),
            ],
          }),

          heading("Executive summary"),
          para(content.executiveSummary),

          heading("Background and method"),
          para(content.background),

          heading("Context snapshot"),
          para(content.contextSnapshot),

          ...(content.dataQualityNote?.trim()
            ? [new Paragraph({
                shading: { fill: "FFF7E6", type: ShadingType.CLEAR },
                spacing: { before: 80, after: 120 },
                children: [new TextRun({ text: "Data-quality note. ", bold: true }), new TextRun(content.dataQualityNote)],
              })]
            : []),

          heading("Component-by-component analysis"),
          ...content.components.flatMap((c, i) => [
            heading(`Component ${i + 1}: ${c.name} (${toRag(c.rag)})`, HeadingLevel.HEADING_2),
            para(c.summary),
            ...(c.enablers.length
              ? [new Paragraph({ children: [new TextRun({ text: "Enablers", bold: true })], spacing: { before: 80, after: 40 } }), ...themeGroups(c.enablers)]
              : []),
            ...(c.barriers.length
              ? [new Paragraph({ children: [new TextRun({ text: "Barriers", bold: true })], spacing: { before: 120, after: 40 } }), ...themeGroups(c.barriers)]
              : []),
            ...(c.crossCutting?.trim()
              ? [new Paragraph({ shading: { fill: TEAL_LIGHT, type: ShadingType.CLEAR }, spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Cross-cutting: ", bold: true }), new TextRun(c.crossCutting)] })]
              : []),
            ...(c.actionPoints.length
              ? [new Paragraph({ children: [new TextRun({ text: "Action points", bold: true })], spacing: { before: 120, after: 40 } }), ...themeGroups(c.actionPoints)]
              : []),
          ]),

          heading("Overall feasibility and implications"),
          ...([
            ["Feasibility considerations", content.overall.feasibility],
            ["Programme strategy implications", content.overall.strategyImplications],
            ["Policy advocacy priorities", content.overall.policyAdvocacy],
            ["Recommended next steps", content.overall.nextSteps],
          ] as const).flatMap(([label, body]) =>
            body?.trim() ? [heading(label, HeadingLevel.HEADING_2), para(body)] : []
          ),

          // ---- RAG feasibility dashboard (new page) ----
          new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("RAG feasibility dashboard")] }),
          new Paragraph({
            shading: { fill: TEAL_LIGHT, type: ShadingType.CLEAR },
            spacing: { after: 120 },
            children: [new TextRun({ text: `Overall: ${toRag(content.overall.rag)}. `, bold: true, color: TEAL_DARK }), new TextRun(content.overall.ragInterpretation)],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [5860, 3500],
            rows: componentRows,
          }),
          para("", { spacingAfter: 120 }),
          ...content.components.flatMap((c) =>
            c.ragSummary?.trim() ? [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${c.name}: `, bold: true }), new TextRun(c.ragSummary)] })] : []
          ),

          ...(content.topActions.length
            ? [heading("Top priority actions", HeadingLevel.HEADING_2),
               ...content.topActions.map((r) => new Paragraph({ numbering: { reference: "recs", level: 0 }, spacing: { after: 80 }, children: [new TextRun(r)] }))]
            : []),

          heading("RAG legend", HeadingLevel.HEADING_2),
          ...RAG_LEGEND.map((r) =>
            new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${r.level}: `, bold: true }), new TextRun(r.description)] })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
