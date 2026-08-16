# Report JSON output contract

The stage 2 synthesis must emit **one JSON object** that validates against `ReportContentSchema`
in `src/lib/reportTypes.ts` on the SEHRA website. A human copies that object into the website's
**"Import report JSON"** box on the report tab, reviews and edits it in the report editor, then
publishes it as a PDF and Word document for the partner.

If the object does not validate, the website rejects it with "Invalid report content" and nothing
is saved. Getting this exactly right is what makes the loop work without an API key.

## Rules that follow from the schema

- Return **only** the JSON object. No markdown fences, no commentary before or after, no
  trailing explanation. If the user wants commentary, put it in a separate message.
- **Emit every key listed below.** There are no optional fields. Where there is nothing to say,
  use an empty string `""` for a string field or an empty array `[]` for an array field, never
  `null`. The website's import box repairs some near-misses on the way in (a missing string
  becomes `""`), but a repaired field is a silently empty section in the published PDF, so do not
  rely on it. `title`, `executiveSummary` and a non-empty `components` array are rejected
  outright if absent, as is any component without a `name`.
- **Do not paste the assessment export back.** The import box recognises a `sehraExport` object
  and rejects it. What goes in is the synthesis output, not the input.
- **Unknown keys are silently dropped.** Do not add fields such as `assessmentId`, `generatedAt`
  or `sources` expecting them to survive. Provenance belongs in the chat, not in the report.
- **All values are plain text.** No markdown, no HTML, no em dashes. The strings are rendered
  directly into the web view, the PDF and the Word document.
- **`components` must contain exactly five entries, in order**, one per SEHRA component. The
  schema itself accepts any array length, so this will not be caught by validation; it is a
  contract requirement and a reviewer will notice.
- **`rag` values must be one of** `Green`, `Amber/Green`, `Amber`, `Red/Amber`, `Red`. The schema
  types these as plain strings so an odd value never breaks parsing, but the website normalises
  anything unrecognised to `Amber` without warning. A typo therefore changes the rating silently.
- **`topActions` holds up to ten strings**, most important first, each a single sentence.
- **`dataQualityNote`** is `""` when there is nothing material to flag. Do not write "None" or
  "No issues identified"; the site hides the section when the string is empty.

## Field reference

| Field | Type | Contents |
| --- | --- | --- |
| `title` | string | Report title, for example "SEHRA Module 1 Scoping Report: Makueni County, Kenya" |
| `executiveSummary` | string | 150 to 250 words. The whole report in one passage |
| `background` | string | Background to SEHRA and the method used for this assessment |
| `contextSnapshot` | string | Concise snapshot of the implementation area, drawn from the Context section |
| `dataQualityNote` | string | Brief caveats about data quality, or `""` if none are material |
| `components` | array | Exactly five entries, in component order 1 to 5 |
| `components[].name` | string | Component name, for example "Human Resources" |
| `components[].summary` | string | Analytical summary of the component |
| `components[].enablers` | array | Theme groups: `{ "theme": string, "points": string[] }` |
| `components[].barriers` | array | Theme groups, same shape |
| `components[].crossCutting` | string | How this component interacts with the others |
| `components[].actionPoints` | array | Theme groups, same shape |
| `components[].rag` | string | One of the five RAG levels |
| `components[].ragSummary` | string | Short feasibility justification for this component |
| `overall.feasibility` | string | Overall feasibility considerations |
| `overall.strategyImplications` | string | Implications for programme strategy and planning |
| `overall.policyAdvocacy` | string | Implications for policy advocacy |
| `overall.nextSteps` | string | Concrete next steps, in sequence |
| `overall.rag` | string | Overall RAG level, one of the five |
| `overall.ragInterpretation` | string | What the overall rating means for this site |
| `topActions` | array of strings | Up to ten priority actions, most important first |

A **theme group** is always exactly `{ "theme": "...", "points": ["...", "..."] }`. Both keys are
required. `points` may be empty but the key must be present. Do not nest theme groups.

The RAG legend is **not** part of this JSON. The website holds it as a constant and prints it on
the dashboard, in the PDF and in the Word document.

## Worked example

This is a complete, minimal object that validates. Real reports carry substantially more content
in every string and more points per theme; the shape is what matters here. The figures are
illustrative only.

```json
{
  "title": "SEHRA Module 1 Scoping Report: Example District, Example Country",
  "executiveSummary": "This assessment reviewed the feasibility of a school eye health programme in Example District, covering a population of 620,000 with roughly 99,000 children of school-going age. The policy environment is supportive in principle: school health is named in the national health strategy and a school health policy exists, but neither carries a dedicated budget line for eye health. Service delivery is concentrated at secondary level, with one district hospital providing refraction and no refraction capacity at primary level. The education workforce is large and well distributed, which offers a credible screening platform, but no teacher training curriculum on eye health exists. The principal constraint is the supply chain: children's frames are not stocked locally, spectacles are not on the essential supplies list, and no insurance mechanism covers spectacle costs for children. Demand-side barriers reported by the assessor centre on cost and on limited awareness among parents. Overall feasibility is mixed. A programme is credible if it is designed around a secondary-level refraction hub, an explicit spectacle supply route and a teacher training component, and if advocacy runs in parallel to secure a budget line and benefit-package cover. Proceeding directly to district-wide scale is not advised on current evidence.",
  "background": "The School Eye Health Rapid Assessment (SEHRA) Scoping Module (Module 1) establishes whether a school eye health programme is feasible in an intervention area. It reviews sectoral legislation and policy, the institutional and service delivery environment, human resources, the supply chain and barriers. This report synthesises the completed Module 1 assessment for Example District, submitted through the Peek Vision SEHRA platform. An initial completeness and consistency review was carried out first, and the findings below are drawn from the corrected assessment. SEHRA supports the WHO 2030 effective Refractive Error Coverage target and aligns with the Integrated People-Centred Eye Care and SPECS 2030 frameworks.",
  "contextSnapshot": "Example District has a population of 620,000, of whom approximately 99,000 are aged 5 to 19. There are 412 schools, 340 of them public. Public sector enrolment is reported at 74,500 with an attendance rate of 88 per cent. No standalone school eye health programme operates in the district. A school deworming programme runs annually and reaches all public primary schools. No local prevalence study for refractive error was available; the assessor cited a national estimate.",
  "dataQualityNote": "Prevalence figures are national rather than district-level and should be treated as indicative. The private-sector enrolment figures were left blank and the private school contribution is therefore not quantified.",
  "components": [
    {
      "name": "Sectoral Legislation, Policy and Strategy",
      "summary": "School health has clear policy recognition but eye health sits outside the financed core. The national school health policy names vision screening as an expected service, and the health sector strategic plan references child eye health, yet neither is matched by a budget line or an implementation directive to districts. Coordination between the health and education ministries exists on paper through a joint school health committee that has not met in the current year.",
      "enablers": [
        {
          "theme": "Policy recognition",
          "points": [
            "The national school health policy names vision screening among expected school health services.",
            "A joint health and education school health committee exists in structure."
          ]
        }
      ],
      "barriers": [
        {
          "theme": "Policy-to-implementation translation",
          "points": [
            "No implementation guidance or directive has reached district level.",
            "The joint committee has not convened in the current year."
          ]
        },
        {
          "theme": "Financing",
          "points": [
            "No dedicated budget line exists for school eye health at national or district level."
          ]
        }
      ],
      "crossCutting": "The absence of a budget line is the link between this component and the supply chain and human resources components: policy recognition without financing leaves both spectacle procurement and teacher training dependent on partner funding, which limits how far a programme can be institutionalised.",
      "actionPoints": [
        {
          "theme": "Financing",
          "points": [
            "Seek an explicit school eye health budget line in the next district health planning cycle.",
            "Document the cost per child screened to support that request."
          ]
        },
        {
          "theme": "Coordination",
          "points": [
            "Reconvene the joint school health committee and place school eye health on its agenda."
          ]
        }
      ],
      "rag": "Amber",
      "ragSummary": "Policy recognition is genuine and provides a mandate to work from, but with no budget line and no implementation guidance the enabling environment is declaratory rather than operational."
    },
    {
      "name": "Institutional and Service Delivery Environment",
      "summary": "Eye care capacity is concentrated at the district hospital. Refraction is available at secondary level only, with no primary-level refraction cadre and no formal link between primary eye care and school health. A referral pathway exists from school to the health system in principle, but the assessor described it only for the school to primary link, and neither the education nor the health routine data system carries an eye health indicator.",
      "enablers": [
        {
          "theme": "Service platform",
          "points": [
            "Secondary eye care with refraction is available at the district hospital.",
            "An established school deworming programme reaches all public primary schools and demonstrates a working school-based delivery route."
          ]
        }
      ],
      "barriers": [
        {
          "theme": "Referral continuity",
          "points": [
            "The referral pathway is described only for the school to primary link; onward links were not evidenced.",
            "Primary eye care is not linked with school health."
          ]
        },
        {
          "theme": "Data systems",
          "points": [
            "Neither the education nor the health routine data system carries an eye health indicator.",
            "No data sharing arrangement exists between the two sectors on children's health."
          ]
        }
      ],
      "crossCutting": "The single secondary-level refraction point sets the practical ceiling on programme throughput and connects directly to the human resources picture. Without an eye health indicator in either routine data system, neither coverage nor referral completion can be monitored, which weakens the case for the budget line sought under Component 1.",
      "actionPoints": [
        {
          "theme": "Referral continuity",
          "points": [
            "Map and document the full referral chain from school to secondary care, naming the responsible actor at each step.",
            "Use the deworming programme's school reach as the delivery template for screening."
          ]
        },
        {
          "theme": "Data systems",
          "points": [
            "Propose a minimum eye health indicator set for the education management information system."
          ]
        }
      ],
      "rag": "Red/Amber",
      "ragSummary": "A working school delivery platform exists, but refraction capacity at a single secondary site and an incomplete referral chain leave service delivery fragile."
    },
    {
      "name": "Human Resources",
      "summary": "The education workforce is the strongest asset in this assessment: teachers are present in every school and the assessor judged them available to support screening. The health-side eye care workforce is thin, with refraction concentrated in two staff at the district hospital and no primary-level refraction cadre. No teacher or nurse training curriculum covering eye health exists, and no supportive supervision system covers school health.",
      "enablers": [
        {
          "theme": "Workforce reach",
          "points": [
            "Teachers and head teachers are present across all 340 public schools and were judged available for screening roles."
          ]
        }
      ],
      "barriers": [
        {
          "theme": "Workforce capacity",
          "points": [
            "Refraction capacity is limited to two staff at the district hospital.",
            "No primary-level cadre can provide refraction to school-age children."
          ]
        },
        {
          "theme": "Training and supervision",
          "points": [
            "No pre-service or in-service curriculum on eye health exists for teachers or nurses.",
            "No supportive supervision system covers school health."
          ]
        }
      ],
      "crossCutting": "Teacher availability only converts into screening capacity if the training gap is closed, and screening only converts into corrected vision if the refraction bottleneck identified in Component 2 is addressed. Sequencing training ahead of, or alongside, refraction capacity is therefore a design decision rather than a detail.",
      "actionPoints": [
        {
          "theme": "Training and supervision",
          "points": [
            "Develop an in-service teacher training module on vision screening and referral.",
            "Define a supervision route for screening quality before any pilot begins."
          ]
        },
        {
          "theme": "Workforce capacity",
          "points": [
            "Assess whether primary-level staff can be trained to provide basic refraction."
          ]
        }
      ],
      "rag": "Amber",
      "ragSummary": "A large and well distributed education workforce offers a credible screening platform, offset by minimal refraction capacity and the absence of any training or supervision system."
    },
    {
      "name": "Supply Chain",
      "summary": "This is the binding constraint. Spectacles are not on the essential supplies list or the essential assistive technologies list, and are not in the government supply chain. Children's frames are not stocked locally and lenses are imported. Custom prescription spectacles in the private sector cost a substantial share of the reported monthly minimum wage, and no insurance or government mechanism covers spectacle costs for children, although consultation and refraction are covered for adults.",
      "enablers": [
        {
          "theme": "Private supply",
          "points": [
            "Two private optical outlets operate in the district and can dispense spectacles."
          ]
        }
      ],
      "barriers": [
        {
          "theme": "Supply-chain readiness",
          "points": [
            "Spectacles are absent from the essential supplies list and from the government supply chain.",
            "Children's frames are not stocked locally and lenses are imported."
          ]
        },
        {
          "theme": "Affordability and financial protection",
          "points": [
            "Insurance covers consultation and refraction for adults but not spectacles, and not for school-age children.",
            "Private custom spectacle prices are high relative to the reported minimum wage."
          ]
        }
      ],
      "crossCutting": "Every gain made in screening coverage under Components 2 and 3 stops here unless a spectacle route exists. This component is the main reason the overall rating cannot rise above the level of the weakest link, and it is the strongest argument for the benefit-package advocacy set out under Component 1.",
      "actionPoints": [
        {
          "theme": "Supply-chain readiness",
          "points": [
            "Identify and cost a reliable route for children's frames and lenses before any pilot commits to correction.",
            "Seek inclusion of spectacles on the essential supplies list."
          ]
        },
        {
          "theme": "Affordability and financial protection",
          "points": [
            "Advocate for spectacle cover for school-age children within the existing insurance mechanism."
          ]
        }
      ],
      "rag": "Red",
      "ragSummary": "No public supply route, no local stock of children's frames and no financial protection for spectacles together represent a foundational gap that would prevent correction reaching children."
    },
    {
      "name": "Barriers",
      "summary": "Reported barriers cluster on cost and on awareness. The assessor identified the price of spectacles, the cost of travel to the district hospital and limited parental awareness of children's vision problems as the main demand-side obstacles, alongside concerns about how spectacle wear is perceived among peers. On the delivery side, staffing shortages and the absence of dedicated financing were identified as the principal system constraints.",
      "enablers": [
        {
          "theme": "Community engagement",
          "points": [
            "Parent-teacher associations are active in the majority of public schools and were identified as a route to parents."
          ]
        }
      ],
      "barriers": [
        {
          "theme": "Cost and access",
          "points": [
            "Spectacle prices and travel costs to the district hospital were both identified as deterrents.",
            "No group was identified as having a subsidised route to correction."
          ]
        },
        {
          "theme": "Demand and awareness",
          "points": [
            "Parental awareness of children's vision problems was reported as limited.",
            "Perceptions of spectacle wear among peers were raised as a factor in uptake."
          ]
        }
      ],
      "crossCutting": "The demand-side barriers reinforce the supply-side ones: cost deters families whose route to spectacles is already unfunded, and low awareness reduces the referral completion that the weak data systems in Component 2 would in any case fail to detect. Active parent-teacher associations are the most usable lever identified anywhere in this assessment for addressing them.",
      "actionPoints": [
        {
          "theme": "Community engagement",
          "points": [
            "Work through parent-teacher associations to build awareness ahead of any screening round."
          ]
        },
        {
          "theme": "Cost and access",
          "points": [
            "Model the family cost of a completed referral, including travel, and design mitigation into the pilot."
          ]
        }
      ],
      "rag": "Red/Amber",
      "ragSummary": "Demand-side barriers are addressable through active community structures, but they compound rather than offset the affordability constraint and cannot be resolved without it."
    }
  ],
  "overall": {
    "feasibility": "A school eye health programme in Example District is feasible in a targeted form but not at district-wide scale on current evidence. The enabling conditions for screening are largely present: a mandate in policy, a demonstrated school-based delivery route through the deworming programme, and a teacher workforce that reaches every public school. The conditions for correction are not. Refraction sits at a single secondary site, spectacles have no public supply route, and no financial protection exists for children. Feasibility therefore depends less on whether children can be screened than on whether a spectacle route can be secured before screening begins.",
    "strategyImplications": "Design around a secondary-level refraction hub rather than assuming primary-level capacity. Sequence teacher training before the first screening round, and secure a costed spectacle supply route before committing to correction, so that screening does not generate referrals the system cannot complete. A single-sub-district pilot with full referral tracking would test the referral chain and produce the cost-per-child evidence needed for the budget-line request. Institutionalisation should be treated as a second-phase objective, contingent on the pilot producing usable coverage and cost data.",
    "policyAdvocacy": "Two national-level asks matter most: inclusion of spectacles on the essential supplies list and on the essential assistive technologies list, and extension of insurance cover to spectacles for school-age children. At sub-national level, seek a school eye health budget line in the district health plan and the reactivation of the joint school health committee. At institutional level, propose a minimum eye health indicator set for the education management information system, since without it neither coverage nor referral completion can be demonstrated to the actors being asked to fund the programme.",
    "nextSteps": "First, confirm a costed spectacle supply route for children's frames and lenses. Second, develop and deliver the in-service teacher training module. Third, map and formalise the full referral chain with named responsible actors. Fourth, run a single-sub-district pilot with referral tracking. Fifth, use the pilot's cost and coverage data to support the budget-line and benefit-package requests.",
    "rag": "Red/Amber",
    "ragInterpretation": "The enabling environment for screening is partly in place and the education platform is strong, but supply-chain and affordability constraints are foundational and unresolved. A targeted pilot is justified; district-wide implementation is not, until a spectacle route and some form of financial protection are secured."
  },
  "topActions": [
    "Identify and cost a reliable supply route for children's frames and lenses before committing to correction.",
    "Develop and deliver an in-service teacher training module on vision screening and referral.",
    "Map and formalise the full referral chain from school to secondary care, naming responsible actors.",
    "Advocate for spectacle cover for school-age children within the existing insurance mechanism.",
    "Seek a dedicated school eye health budget line in the next district health planning cycle.",
    "Run a single-sub-district pilot with full referral tracking to generate coverage and cost data.",
    "Propose a minimum eye health indicator set for the education management information system.",
    "Reconvene the joint school health committee and place school eye health on its agenda.",
    "Work through parent-teacher associations to build parental awareness ahead of screening.",
    "Assess whether primary-level staff can be trained to provide basic refraction."
  ]
}
```

## Checklist before you return the JSON

- [ ] Exactly five components, named and ordered 1 to 5.
- [ ] Every `rag` and `overall.rag` is one of the five levels, spelled exactly.
- [ ] Every theme group has both `theme` and `points`.
- [ ] No key is missing; empty values are `""` or `[]`, never `null`.
- [ ] `executiveSummary` is 150 to 250 words.
- [ ] `topActions` has no more than ten entries, ordered by priority.
- [ ] No markdown, no em dashes, British spelling throughout.
- [ ] Every figure in the text appears in the assessment JSON or in a script's output.
- [ ] The object is valid JSON and is the only thing in the message.
