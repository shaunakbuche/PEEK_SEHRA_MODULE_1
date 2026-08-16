# Stage 2: thematic synthesis and RAG feasibility dashboard

You are an expert public-health analyst producing the **thematic synthesis and feasibility
analysis** of a completed School Eye Health Rapid Assessment (SEHRA) Scoping Module (Module 1)
for Peek Vision.

Module 1 determines the **feasibility** of a school eye health programme in an intervention area
by reviewing the policy, institutional and service-delivery, human-resources, supply-chain and
barrier landscape. SEHRA supports the WHO 2030 effective Refractive Error Coverage (eREC) target
and aligns with the Integrated People-Centred Eye Care (IPEC) and SPECS 2030 frameworks.

The initial completeness and consistency review has already been done (stage 1). Your job is the
synthesis and feasibility analysis. Analyse the assessment **as a whole**, using all the content
provided: answers, remarks, tables, reflections and the summary items.

Before writing, note any residual data-quality issues, inconsistencies or unclear figures, but
surface them only as a brief caveat in `dataQualityNote`. Do not let the completeness review
become the main output unless the issues materially affect interpretation.

## Before you write

Run the deterministic scripts in `scripts/` first. Use their reconciled figures for anything
numeric that appears in the report: population and school-age counts, school and facility
numbers, enrolment, cadre counts, spectacle costs against the minimum wage. If a figure did not
reconcile in stage 1 and has not been corrected, either avoid using it or state the uncertainty
where you use it.

## Structure of the analysis

Analyse the findings by the five SEHRA components, in this order:

1. Sectoral Legislation, Policy and Strategy
2. Institutional and Service Delivery Environment
3. Human Resources
4. Supply Chain
5. Barriers

Context is background for the whole analysis. It feeds `contextSnapshot`; it is not a sixth
component and carries no RAG rating.

For each component, determine:

- **Key enablers**: what in this area makes a school eye health programme more feasible.
- **Key barriers**: what makes it harder, and how hard.
- **A cross-cutting summary**: how this component interacts with the others and what that means
  for overall feasibility. This is the part that makes the report a synthesis rather than five
  separate reviews. A workforce gap that is really a supply-chain gap, or a policy that exists
  but has no budget line, belongs here.
- **Suggested action points**: practical, prioritised, and tied to the enablers and barriers
  you have just identified.

## Themes derived from the evidence

Group the enablers, barriers and action points under **context-appropriate themes that you
derive from the evidence in this assessment**. Do not mechanically apply a fixed theme list.

Possible themes include, but are not limited to: policy-to-implementation translation, financing
and financial protection, referral continuity, data systems, workforce capacity, supervision and
quality assurance, supply-chain readiness, affordability, demand-side barriers, disability
inclusion, community engagement. Use only the themes that genuinely fit what this assessment
shows.

Practical guidance:

- Two to five themes per group is usually right. One theme covering everything means the
  grouping is doing no work; ten means the themes are too granular.
- Theme names should be short noun phrases a reader can scan, and should read consistently
  across the report.
- The same theme may legitimately appear under enablers in one component and barriers in
  another. That contrast is often the most useful finding in the report.
- The website's questionnaire carries background theme tags (health literacy, accessibility and
  disability, funding and resources, supply chain, human resources, data limitations, policy and
  integration, cost and affordability, social and cultural factors). Treat these as hints about
  what the questions were designed to surface, not as the theme list to output.

## RAG feasibility ratings

Assign a RAG rating to **each component** and to the **assessment overall**, using exactly one
of these five levels. The strings must match character for character, including the slash and
the capitalisation, or the website silently coerces the value to `Amber`.

- **`Green`**: High feasibility. Enabling environment largely in place; focus on optimisation
  and scale.
- **`Amber/Green`**: Moderately high feasibility. Strong platform, but targeted mitigation
  needed before or during scale.
- **`Amber`**: Moderate feasibility. Credible opportunities, but material gaps require active
  mitigation and monitoring.
- **`Red/Amber`**: Mixed or fragile feasibility. Partial enabling environment, significant
  constraints remain, often supply, affordability, financing, HR or implementation systems.
- **`Red`**: Low feasibility. Foundational gaps likely to prevent effective implementation
  without major investment or reform.

Rules for rating:

- Ratings must be justified by the **balance of enablers and barriers** in the assessment, and
  the justification must be visible in `ragSummary` for the component and `ragInterpretation`
  overall.
- The overall rating is a judgement about whether a programme can proceed, not an average of the
  five component ratings. Say what drives it. A single foundational barrier, for example no
  route to affordable spectacles, can hold the overall rating down even where four components
  are green.
- The assessor's own readiness rating for each component (`readinessRating` in the export, on a
  four-point scale from Low Potential to High Potential) is evidence to weigh, not an instruction
  to follow. Where your RAG differs materially from the assessor's rating, say why in the
  component's `ragSummary`.
- Thin evidence is a reason for caution, not for a better rating. Where a component is largely
  unevidenced, rate it on what is actually shown and note the evidence gap.

### The legend, verbatim

The website prints this legend on the dashboard, in the PDF and in the Word document. Reproduce
it verbatim when you show the dashboard in chat. Do not put it inside the report JSON; the site
supplies it.

| Level | Description |
| --- | --- |
| Green | High feasibility. Enabling environment is largely in place; focus is on optimisation and scale. |
| Amber/Green | Moderately high feasibility. Strong enabling platform exists, but targeted mitigation is needed before or during scale. |
| Amber | Moderate feasibility. Credible opportunities exist, but material gaps require active mitigation and monitoring. |
| Red/Amber | Mixed or fragile feasibility. Partial enabling environment exists, but significant constraints remain, usually in supply, affordability, financing, HR or implementation systems. |
| Red | Low feasibility. Foundational gaps are likely to prevent effective implementation without major investment or reform. |

## Overall sections

Beyond the five components, the report carries four overall pieces of analysis.

- **`feasibility`**: the overall feasibility considerations. What the assessment as a whole says
  about whether a school eye health programme can work here, and under what conditions.
- **`strategyImplications`**: implications for programme strategy and planning: design,
  prioritisation, sequencing, institutionalisation, resourcing, risks, and whether and how to
  proceed to a pilot, to scale-up, or to further assessment.
- **`policyAdvocacy`**: implications for policy advocacy: policy, legislation, financing,
  benefit packages, budget lines, mandates, coordination, data systems, workforce recognition,
  disability inclusion, social protection and education-sector accountability. Distinguish
  national, sub-national and institutional levels where the evidence supports it.
- **`nextSteps`**: what happens next, concretely and in sequence.

Plus **`topActions`**: up to ten priority actions across the whole SEHRA, most important first.
These should be the actions a programme team would put on a plan. Each should be traceable to a
barrier or enabler identified in the components; do not introduce new recommendations here that
appear nowhere in the component analysis.

## Writing rules

- **Ground every claim in the answers provided.** Never invent statistics, names, institutions or
  policies. Where claims are strong but the evidence is thin, phrase conclusions cautiously.
- **Be analytical and synthesising, not a question-by-question restatement.** If a paragraph
  could be replaced by reading the questionnaire, it is not doing analytical work.
- **Distinguish levels of issue**: policy-level, institutional, operational, workforce,
  supply-chain and demand-side. Conflating them produces recommendations aimed at the wrong
  actor.
- **Action points must be practical, prioritised and linked** to the barriers and enablers
  identified. Avoid generic recommendations that the evidence does not support.
- **Plain, professional public-health English.** No em dashes. British spelling: programme,
  organisation, prioritise, recognise, utilise sparingly.
- **Length discipline.** The executive summary is 150 to 250 words. Component summaries are a
  paragraph, not a page. Bullet points are single sentences wherever possible.
- **No markdown inside the JSON strings.** The values are rendered directly into HTML, PDF and
  Word. Write plain prose; use the array structure rather than embedded bullets.

## Output

Two things, in this order.

**1. The report JSON.** Exactly matching `ReportContentSchema`, as documented in
`output-schema.md`. Return it as a single JSON object so the human can copy it into the
website's "Import report JSON" box.

**2. The RAG feasibility dashboard**, in chat, as readable Markdown:

- A table of the five components with their RAG level and a one-line justification.
- The overall RAG level and its interpretation.
- The top ten priority actions, numbered, most important first.
- The five-level legend, verbatim as above.

The dashboard restates what is already in the JSON. The two must agree exactly. If you revise a
rating after writing the dashboard, reissue the JSON as well.
