/* ============================================================
   SEHRA Scoping Module / content model (TypeScript)
   Drives every form so the Summary self-generates, exactly as
   the printed Minto Method module describes.
   ============================================================ */

export type ScaleKey = { value: number; label: string; desc: string };

export const SCALE_KEY: ScaleKey[] = [
  { value: 1, label: "Low Potential", desc: "The indicator under consideration is not conducive for a school eye health programme." },
  { value: 2, label: "Some Possibilities", desc: "The indicator has some possibilities but there are still many challenges for a school eye health programme." },
  { value: 3, label: "Good Possibilities", desc: "The indicator has some challenges but also good opportunities for a school eye health programme." },
  { value: 4, label: "High Potential", desc: "The indicator under consideration is conducive for a school eye health programme." },
];

/** The nine cross-cutting analysis themes used to structure SEHRA reports. */
export const THEMES = [
  "Health Literacy",
  "Accessibility & Disability",
  "Funding & Resources",
  "Supply Chain",
  "Human Resources",
  "Data Limitations",
  "Policy & Integration",
  "Cost & Affordability",
  "Social & Cultural Factors",
] as const;
export type Theme = (typeof THEMES)[number];

export type Question =
  | { type: "yn"; id: string; text: string; lines?: string[]; noOption?: string; thirdOption?: string; help?: string }
  | { type: "text"; id: string; text: string; max?: number; help?: string }
  | { type: "field"; id: string; text: string; help?: string }
  | { type: "group"; id: string; text: string; items: string[]; lines?: string[]; help?: string }
  | { type: "table"; id: string; text: string; cols: string[]; rows: string[]; help?: string }
  | { type: "note"; text: string }
  | { type: "reflections"; id: string };

export interface SubSection { id: string; title: string; themes?: Theme[]; questions: Question[]; }
export interface Component {
  id: string; number: number | string; title: string; purpose: string; subsections: SubSection[];
}

const yn = (id: string, text: string, opts: Partial<Question> = {}): Question => ({ type: "yn", id, text, ...opts } as Question);
const txt = (id: string, text: string, opts: Partial<Question> = {}): Question => ({ type: "text", id, text, ...opts } as Question);
const field = (id: string, text: string, opts: Partial<Question> = {}): Question => ({ type: "field", id, text, ...opts } as Question);
const group = (id: string, text: string, items: string[], opts: Partial<Question> = {}): Question => ({ type: "group", id, text, items, ...opts } as Question);
const table = (id: string, text: string, cols: string[], rows: string[], opts: Partial<Question> = {}): Question => ({ type: "table", id, text, cols, rows, ...opts } as Question);
const note = (text: string): Question => ({ type: "note", text });
const reflections = (id: string): Question => ({ type: "reflections", id });

const SECTORS = ["Public Sector", "NGO Sector", "Charity", "Faith-based", "Private Sector"];

/* ---------------- Narrative ---------------- */
export const NARRATIVE = {
  background: {
    body: [
      "School eye health programmes are not new and have been implemented for decades globally. However, they can all vary / from how they are implemented, to the different methods of monitoring and evaluation, to who is involved.",
      "What holds true for all regions is that effective school eye health programmes are a critical part of any health system. Addressing eye health problems in childhood can have a powerful positive effect on an individual's chance of educational success, prosperity and well-being.",
      "While the well-established RAAB survey methodology lets health services estimate eye-health problems in people aged 50 and over, no comparable tool exists for school-going children. The School Eye Health Rapid Assessment (SEHRA) tool fills that gap.",
      "SEHRA uses rapid sampling to reveal the proportion and type of eye-health problems in school children / so programmes, campaigns and funding can be planned efficiently.",
    ],
    pillars: [
      "Students and teachers with good vision and healthy eyes",
      "Eye health education in the curriculum",
      "Detect, treat / refer visually impairing conditions",
      "Child-to-child and child-to-family",
      "Eye health promoting school environment",
      "Detect, treat / refer non-visually impairing conditions",
    ],
  },
  vision:
    "A future where all children, everywhere, are given the opportunity to receive high quality, comprehensive eye care to prevent avoidable sight loss.",
  mission:
    "To lead in school eye health rapid assessment methodologies; establishing new, disruptive approaches to school-based surveys and programme planning.",
  goals: [
    "Establish a new and innovative school eye health screening and planning method.",
    "Develop and implement a rapid assessment survey methodology to understand regional eye health needs.",
    "Implement a high quality and efficient school eye health planning tool.",
    "Use Peek software to automate the survey / saving time and money with bespoke data management.",
    "Enable real-time data collection with quality-assurance feedback via a web dashboard.",
    "Track each child's journey from screening to referral so no one is lost to follow-up.",
  ],
  steps: [
    ["Endorsement", "Obtain willingness from the National Eye Health Coordinator and National Committee for Eye Health."],
    ["Identify a lead person & team", "Local, familiar with policy and service delivery; experienced in desk reviews, KIIs and FGDs."],
    ["Secure financial support", "Obtain prior willingness of national and international eye health partners."],
    ["Identify key stakeholders", "Health and education authorities, eye/school health resource persons, optical sector, NGOs."],
    ["Desk review", "Explore policy, strategy and service delivery; note what to explore further through KIIs and FGDs."],
    ["Supplementary tools", "Develop additional KII/FGD questions identified during the desk review."],
    ["Workplan & timeline", "The module is designed to be completed within four to five days (max one working week)."],
  ],
};

/* ---------------- CONTEXT ---------------- */
export const CONTEXT: Component = {
  id: "context", number: "C", title: "Context",
  purpose: "An overview of the implementation area and the status of any existing school eye health programme. Complete the following for the Implementation Area.",
  subsections: [
    {
      id: "c.1", title: "Population & demographics", themes: ["Data Limitations"],
      questions: [
        field("ctx_pop", "Total population"),
        table("ctx_children", "Number of children in the following age groups", ["1 – 4 years", "5 – 9 years", "10 – 14 years", "15 – 19 years"], ["Number of children"]),
        table("ctx_schools", "Number of schools by level and school type", ["Pre-Primary", "Primary", "Middle Secondary", "Secondary", "Higher Secondary", "Total"], ["Public", "Private", "NGO or Faith-based"]),
        table("ctx_enrol", "School enrolment by school type and gender (or Net Enrolment Rate)", ["Public / M", "Public / F", "Public / Total", "NGO/Faith / M", "NGO/Faith / F", "NGO/Faith / Total", "Private / M", "Private / F", "Private / Total"], ["Enrolment"]),
        table("ctx_attend", "School attendance rate by school type and gender", ["Public / M", "Public / F", "Public / Total", "NGO/Faith / M", "NGO/Faith / F", "NGO/Faith / Total", "Private / M", "Private / F", "Private / Total"], ["Attendance"]),
        table("ctx_dates", "Important school dates", ["School Year (start & end)", "Exam Periods", "Seasonality considerations"], ["Dates"]),
        txt("ctx_ethnic", "Primary ethnic groups (please list)"),
      ],
    },
    {
      id: "c.2", title: "Existing school eye health programme", themes: ["Policy & Integration", "Human Resources"],
      questions: [
        yn("ctx_seh_prog", "Are there any standalone school eye health programmes or initiatives within the intervention area (not part of another school-based health programme)?", { help: "Standalone means a programme focused on eyes specifically, not eye checks inside a broader school health programme.", lines: ["Who is the implementer (MoH, MoE, NGO)? Who is the funder?", "Scope: location/area, type of schools, classes/grades screened, age range", "Eye health promotion / conditions included? Teachers' eye health?", "Who screens? Referral mechanism? Where are children referred?", "Who does refraction? Where are glasses obtained? Who pays?"] }),
        yn("ctx_teacher_curr", "Does a curriculum for teacher training exist for school health and/or eye health?", { lines: ["Pre-service or in-service? Scope & content?", "Teaching/learning materials? Performance criteria indicators?"] }),
        yn("ctx_nurse_curr", "Does a curriculum for nursing training exist for school health and/or eye health?", { lines: ["Pre-service or in-service? Scope & content?", "Teaching/learning materials? Performance criteria indicators?"] }),
        yn("ctx_limit_screen", "Do any policies or regulations limit vision screening by teachers?"),
        txt("ctx_teachers_trained", "How many teachers have been trained on school health or school eye health in the intervention area?"),
      ],
    },
    {
      id: "c.3", title: "Prevalence & service availability", themes: ["Accessibility & Disability", "Data Limitations"],
      questions: [
        field("ctx_prev_area", "Prevalence of refractive errors / specify area"),
        table("ctx_prev", "Prevalence of refractive errors in children of school-going age", ["Myopia", "Hypermetropia", "Astigmatism", "Specialised / complex refraction"], ["Males and females", "Males", "Females"], { help: "Use published studies or programme data if available. Leave blank if unknown and list your sources below." }),
        txt("ctx_prev_ref", "References (please list and provide a web link if available)"),
        group("ctx_drops", "Are eye drops or eye ointment available at the following levels?", ["School nurse", "Community health level", "Primary health level", "Secondary health level", "Tertiary health level", "Private pharmacies"]),
        txt("ctx_counsel", "Availability or access to eye health counselling and advice"),
        yn("ctx_referral", "Does a referral pathway exist for school health / school eye health?", { help: "A referral pathway is the agreed route a child follows from being spotted at school to being seen by an eye care service.", lines: ["If 'Yes', please describe"] }),
        txt("ctx_med", "Availability of medical treatment for child eye conditions"),
        txt("ctx_surg", "Availability of surgical treatment for child eye conditions"),
        txt("ctx_lowvision", "Low vision care"),
        txt("ctx_othercare", "Other care or cross-referral for children"),
        yn("ctx_nhi", "Coverage of children for eye health in National Health Insurance", { help: "For example, whether a national insurance scheme pays for children's eye tests or spectacles." }),
      ],
    },
  ],
};

/* ---------------- COMPONENTS 1–5 ---------------- */
export const COMPONENTS: Component[] = [
  {
    id: "c1", number: 1, title: "Sectoral Legislation, Policy and Strategy",
    purpose: "To ascertain the degree to which the sectoral policy and strategy environment is conducive for a school eye health programme.",
    subsections: [
      { id: "1.1", title: "Legislation", themes: ["Policy & Integration"], questions: [
        yn("c1_leg", "Is school health included in national legislation frameworks?", { help: "Legislation means laws passed by parliament. Ministry policies and plans come in the next section.", lines: ["What is the context and how does it relate to sector policies?", "What are the implementation frameworks, if any?", "What key factors limit or impede their implementation?"] }),
      ]},
      { id: "1.2", title: "Policies, Sector Strategies and Plans", themes: ["Policy & Integration"], questions: [
        note("Determine the status of school health / school eye health in these policies, sector strategies and plans:"),
        yn("c1_natedu", "Is school health / school eye health included in the National Education Policy?", { noOption: "No policy exists" }),
        yn("c1_edusector", "Is school health / school eye health included in the Education Sector Plan?", { noOption: "No Sector Plan" }),
        yn("c1_dedicated", "Is there a dedicated school health policy or plan?", { lines: ["If 'Yes', does it include school eye health?"] }),
        yn("c1_nathealth", "Is school health / school eye health included in the national health policy?", { noOption: "No policy exists" }),
        yn("c1_healthstrat", "Is school health / school eye health included in the national health strategic plan?", { noOption: "No Sector Plan" }),
        yn("c1_eyepolicy", "Is school health included in the Eye Health Policy or Strategic Plan?", { noOption: "No Eye Health Policy exists" }),
        yn("c1_ipec", "Is school health included in the Integrated People-Centred Eye Care (IPEC) Plan?", { help: "IPEC is the WHO's Integrated People-Centred Eye Care framework. If you have not heard of a national IPEC plan, it likely does not exist.", noOption: "No IPEC Plan exists" }),
        group("c1_otherpolicies", "Is school health included in any of the following policies, strategies or plans?", ["Primary health care", "Community health", "Non-Communicable Diseases", "Neglected Tropical Diseases", "Ear and Hearing Care", "Human Resources for Health", "Mother and child health", "Sexual and Reproductive Health", "Nutrition", "Social behavioural change and communication", "Water, Sanitation and Hygiene for Schools", "Other (e.g. Gender and Equity)"], { lines: ["If 'Yes' for any option, please explain briefly"] }),
        yn("c1_disability", "Is school health / school eye health included in the Disability Policy / Strategy / Plan?", { noOption: "Does not exist" }),
        yn("c1_rehab", "Is school health / school eye health included in the Rehabilitation Policy / Strategy / Plan?", { noOption: "Does not exist" }),
        yn("c1_at", "Is school health / school eye health included in the Assistive Technology Policy / Strategy / Plan?", { noOption: "Does not exist" }),
        yn("c1_special", "Is school health / school eye health included in the Special Needs / Special Education Policy / Strategy / Plan?", { noOption: "Does not exist" }),
        yn("c1_socprot", "Is school health / school eye health included in the Social Protection Policy / Strategy / Plan?", { noOption: "Does not exist" }),
        txt("c1_notes", "Any additional notes (200 words maximum)", { max: 200 }),
      ]},
      { id: "1.3", title: "Finance", themes: ["Funding & Resources", "Cost & Affordability"], questions: [
        yn("c1_budget_sh", "Is there an allocated budget for school health / school eye health?", { lines: ["Which ministry / ministries?", "What is the annual public expenditure?"] }),
        yn("c1_budget_ap", "Is there an allocated budget for assistive products?", { lines: ["Which ministry / ministries?", "What is the annual public expenditure?"] }),
        yn("c1_budget_eye", "Is there an allocated budget for eye health?", { lines: ["Which ministry / ministries?", "What is the annual public expenditure?"] }),
        txt("c1_health_fin", "What are the major health financing mechanisms? Name them and describe if/how school health, eye health, disability and special needs is included."),
        txt("c1_edu_fin", "What are the major education financing mechanisms? Name them and describe if/how school health, eye health, disability and special needs is included."),
        yn("c1_insurance", "Are eye health or eyeglasses included in a national health or social protection insurance scheme?", { lines: ["Which scheme?", "Level of coverage and criteria for enrolment"] }),
      ]},
      { id: "1.4", title: "Key Stakeholders and Coordination", themes: ["Policy & Integration"], questions: [
        yn("c1_ministry", "Which ministry/ministries is/are responsible for school health and/or school eye health?", { lines: ["If multiple, is there a primary or lead Ministry?"] }),
        yn("c1_unit", "Is there a designated unit or officer for school health / school eye health within the ministry structure?", { lines: ["If yes, who and which unit?"] }),
        yn("c1_coord", "Is there a mechanism for coordination between the ministries of health and education?", { lines: ["If yes, describe the mechanisms", "If no, what is the broader coordination mechanism?"] }),
      ]},
      { id: "1.5", title: "Reflections and Implications", questions: [reflections("c1")] },
    ],
  },
  {
    id: "c2", number: 2, title: "Institutional and Service Delivery Environment",
    purpose: "To describe the situation in the proposed intervention area.",
    subsections: [
      { id: "2.1", title: "Stakeholders", themes: ["Policy & Integration"], questions: [
        table("c2_stake", "Main stakeholders / organisational structure in health and education within the intervention area", ["Policy level", "Planning level", "Operational level", "Role"], ["Stakeholders"]),
        table("c2_org_health", "Organisational structure in health in the public sector", ["Central / Federal", "Regional / Provincial", "District", "Sub-district", "Community"], ["Health structure"]),
        table("c2_org_edu", "Organisational structure in education in the public sector", ["Central / Federal", "Regional / Provincial", "District", "Sub-district", "Community"], ["Education structure"]),
        yn("c2_coord", "Is there a coordination mechanism for school health / school eye health within the intervention area?", { lines: ["If yes, please describe the mechanism"] }),
      ]},
      { id: "2.2", title: "Infrastructure", themes: ["Accessibility & Disability"], questions: [
        table("c2_inf_edu", "Education Sector Infrastructure / Number of Facilities", ["Pre-Primary", "Primary", "Middle Secondary", "Secondary"], ["Public Sector", "NGO", "Private", "Charity", "Faith-based"]),
        table("c2_inf_health", "Health Sector Infrastructure / Number of Facilities", ["Community HC", "Primary HC", "Secondary HC", "Tertiary HC"], ["Public Sector", "NGO", "Private", "Charity", "Faith-based"]),
      ]},
      { id: "2.3", title: "School-based Health programme", themes: ["Policy & Integration"], questions: [
        yn("c2_shp", "Are there any school-based specific health programmes within the intervention area? (deworming, NTDs, WASH, NCDs, nutrition)", { lines: ["Does the programme include school eye health?", "Implementer & funder?", "Scope: schools, grades, age range, eye conditions?", "Promotion, teachers' eye health, screening, referral?", "Refraction, eyeglasses, who pays?"] }),
      ]},
      { id: "2.4", title: "Community level", themes: ["Accessibility & Disability", "Human Resources"], questions: [
        yn("c2_pec", "Is primary eye care available in the intervention area?"),
        yn("c2_pec_promo", "Does primary eye care include eye health promotion and prevention for school-age (5–18) and pre-school (1–4) children?"),
        yn("c2_pec_refr", "Is there a cadre at primary level able to provide refraction to school-age children?", { lines: ["Who are they?"] }),
        yn("c2_pec_detect", "Is there a cadre at primary level able to detect other eye conditions in school-age children?", { lines: ["Who are they?"] }),
        yn("c2_pec_link", "Are primary eye care services linked with school health?"),
        yn("c2_comm_screen", "Are health screening programmes being undertaken in the community (outside schools)?", { lines: ["Do any include school-age children?"] }),
        yn("c2_student_screen", "Are there screening activities for school health by senior / junior students?"),
        yn("c2_comm_coord", "Is there coordination between community health screening for school-age children and education services?"),
      ]},
      { id: "2.5", title: "Secondary level", themes: ["Accessibility & Disability"], questions: [
        yn("c2_sec", "Is secondary eye care available in the intervention area?", { lines: ["Main cadres providing eye health?", "Refraction available? Cadre for school-age children?", "Linked with school health? How many facilities?", "Services for myopia, hypermetropia, astigmatism, aphakia?"] }),
      ]},
      { id: "2.6", title: "Tertiary level", themes: ["Accessibility & Disability"], questions: [
        yn("c2_ter", "Is tertiary eye care available in the intervention area?", { lines: ["Main cadres? Refraction available?", "Cadre for school-age refraction / specialised paediatric care?", "Linked with school health? How many facilities?", "Services for myopia, hypermetropia, astigmatism, aphakia?", "If 'No': where are complex cases referred? Links with special education / rehab?"] }),
      ]},
      { id: "2.7", title: "Referral Pathways", themes: ["Accessibility & Disability"], questions: [
        group("c2_referral", "Does a referral pathway exist from the following? (describe in remarks)", ["School to health system", "Community to primary HC", "Primary to secondary HC", "Secondary to tertiary HC"]),
        yn("c2_enablers", "Are there known factors (enablers) that facilitate referral uptake for children with eye conditions?", { lines: ["If 'Yes', please describe"] }),
      ]},
      { id: "2.8", title: "Data", themes: ["Data Limitations"], questions: [
        yn("c2_emis", "Are there indicators related to the health of children within the EMIS?", { help: "EMIS is the education sector's routine data system, where schools report enrolment and other indicators.", thirdOption: "This does not exist", lines: ["Indicators linked to school eye health?", "Information flow schools › education authorities?"] }),
        yn("c2_hmis", "Are there indicators related to eye health within the HMIS / DHIS?", { help: "HMIS or DHIS is the health sector's routine data system, often DHIS2.", thirdOption: "This does not exist", lines: ["Indicators linked to school eye health?", "Information flow schools › health authorities?"] }),
        yn("c2_datashare", "Is there coordination or data sharing between education and health authorities on school children's health?", { thirdOption: "This does not exist" }),
        yn("c2_me", "Does a monitoring, evaluation and/or supportive supervision framework exist in the intervention area?", { thirdOption: "This does not exist" }),
      ]},
      { id: "2.9", title: "Reflections and Implications", questions: [reflections("c2")] },
    ],
  },
  {
    id: "c3", number: 3, title: "Human Resources",
    purpose: "To find out if the right people, with the right skills, in the right place, are in enough numbers to operationalise a school eye health programme.",
    subsections: [
      { id: "3.1", title: "Type of Cadres / Health", themes: ["Human Resources"], questions: [
        yn("c3_h_avail", "Are essential health human resources available to implement school health / school eye health?"),
        yn("c3_h_curr", "Does a curriculum exist to train them / are they trained on school eye health?"),
        table("c3_h_count", "Type and number of essential health human resources in the intervention area", SECTORS, ["Community health workers", "Primary eye care workers", "Mid-level eye care personnel", "Nurses / school nurses", "Refractionists / Optometrists", "Optical personnel (dispensing)", "Ophthalmologists", "Paediatric ophthalmologists & squint specialists", "Programme managers"], { help: "Approximate counts are fine. Leave cells blank where a cadre does not exist." }),
        txt("c3_h_capdev", "What additional capacity development needs are likely required?"),
        txt("c3_h_opp", "Opportunities to enhance their knowledge, skills and competencies?"),
      ]},
      { id: "3.2", title: "Type of Cadres / Education", themes: ["Human Resources"], questions: [
        yn("c3_e_avail", "Are essential education human resources available to implement school health / school eye health?"),
        yn("c3_e_curr", "Does a curriculum exist to train them / are they trained on school eye health?"),
        table("c3_e_count", "Type and number of essential education human resources in the intervention area", SECTORS, ["Head teachers", "Class & contact teachers", "Special education teachers"]),
        txt("c3_e_capdev", "What additional capacity development needs are likely required?"),
        txt("c3_e_opp", "Opportunities to enhance their knowledge, skills and competencies?"),
      ]},
      { id: "3.3", title: "Capacity Needs", themes: ["Human Resources"], questions: [
        yn("c3_cap_health", "Capacity development needs of local health administration personnel?", { lines: ["If 'Yes', what are they?"] }),
        yn("c3_cap_edu", "Capacity development needs of local education administration personnel?", { lines: ["If 'Yes', what are they?"] }),
        yn("c3_supervision", "Does a supportive supervision system exist for school health / school eye health?", { lines: ["Areas to strengthen?"] }),
      ]},
      { id: "3.4", title: "Reflections and Implications", questions: [reflections("c3")] },
    ],
  },
  {
    id: "c4", number: 4, title: "Supply Chain",
    purpose: "To describe the availability and flow of glasses, consumables and equipment required in a school eye health programme.",
    subsections: [
      { id: "4.1", title: "Eyeglasses", themes: ["Supply Chain", "Policy & Integration"], questions: [
        yn("c4_policy", "Any policy/regulations that guide import, production, procurement or sale of spectacle frames and lenses?", { lines: ["If 'Yes', what are they?"] }),
        yn("c4_essential", "Are eyeglasses on the MoH Essential Supplies List or Essential List of Assistive Technologies?", { help: "Essential lists are the Ministry of Health's official lists of supplies the public system is expected to stock." }),
        yn("c4_gov_supply", "Are eyeglasses already included in the government supply chain?", { lines: ["Who oversees procurement, distribution, quantification?", "Flow of product from import to end-user?"] }),
        yn("c4_other_supply", "Are there other supply chains for optical products (wholesaler to retail)?", { lines: ["Who oversees procurement, distribution, quantification?", "Flow of product from import to end-user?"] }),
      ]},
      { id: "4.2", title: "Availability of optical services", themes: ["Supply Chain"], questions: [
        table("c4_optical", "Availability of optical services within the intervention area", ["Public", "Private", "NGO / FBO / other", "Notes"], ["Pharmacies & last-mile retailers", "Stand-alone optical / vision centre", "Hospital-based optical / vision centre", "Hospital-based optical lab", "Other optical lab in country"]),
      ]},
      { id: "4.3", title: "Availability of eyeglasses", themes: ["Supply Chain"], questions: [
        table("c4_glasses", "Availability of eyeglasses within the intervention area", ["Available?", "Local / imported / both", "Local distributor?", "Customs duties & VAT", "Notes"], ["Children's frames", "Spherical lenses", "Cylindrical lenses", "Ready-made distance eyeglasses", "Ready-to-clip lenses and frames"]),
        yn("c4_ethnic_frames", "Are frame sizes adapted to local ethnic facial features available?"),
      ]},
      { id: "4.4", title: "Costing of eyeglasses (local currency)", themes: ["Cost & Affordability"], questions: [
        field("c4_minwage", "What is the minimum wage in local currency?", { help: "A reference point for judging whether spectacle prices are affordable locally." }),
        table("c4_costing", "Average retail cost / Simple (≤±2D), High-power (>±5D), Complex (astigmatism)", ["Simple / Public", "Simple / Private", "High / Public", "High / Private", "Complex / Public", "Complex / Private", "Remarks"], ["Custom prescription glasses", "Ready-made distance glasses", "Ready-made reading glasses", "Ready-to-clip lenses and frames"], { help: "Use local currency and rough averages. Simple means up to plus or minus 2D, high-power over 5D, complex means any astigmatism." }),
      ]},
      { id: "4.5", title: "Capacity to pay", themes: ["Cost & Affordability", "Funding & Resources"], questions: [
        yn("c4_wtp", "Information on willingness or capacity to pay for eyeglasses?", { help: "Any study, survey or programme record showing what families can or will pay for spectacles.", lines: ["What is the capacity to pay?"] }),
        yn("c4_ins_screen", "Does insurance / government mechanism cover vision screening / refraction?", { lines: ["Coverage for adults?", "Coverage for school-age children?"] }),
        yn("c4_ins_glasses", "Does insurance / government mechanism cover the cost of eyeglasses?", { lines: ["Coverage for adults?", "Coverage for school-age children?"] }),
      ]},
      { id: "4.6", title: "Consumables", themes: ["Supply Chain"], questions: [
        yn("c4_cons_list", "Are anti-biotic eyedrops / ointment on the MoH Essential Medicines List?"),
        yn("c4_cons_primary", "Available in the public sector at primary health care level?"),
        yn("c4_cons_secondary", "Available in the public sector at secondary health care level?"),
        yn("c4_cons_tertiary", "Available in the public sector at tertiary health care level?"),
      ]},
      { id: "4.7", title: "Equipment", themes: ["Supply Chain"], questions: [
        note("Is there a standard list of ophthalmic equipment used by the MoH to detect / diagnose and treat school-age children?"),
        yn("c4_eq_school", "To detect / diagnose and treat school-age children at school level?"),
        yn("c4_eq_community", "To detect eye conditions at community health care level?"),
        yn("c4_eq_primary", "To detect and manage simple eye conditions at primary level?"),
        yn("c4_eq_secondary", "To diagnose and manage eye conditions at secondary level?"),
        yn("c4_eq_tertiary", "To diagnose and manage eye conditions at tertiary level?"),
      ]},
      { id: "4.8", title: "Reflections and Implications", questions: [reflections("c4")] },
    ],
  },
  {
    id: "c5", number: 5, title: "Barriers",
    purpose: "A cross-cutting component: to explore barriers that would hinder delivery of child eye health services through a school eye health programme.",
    subsections: [
      { id: "5.1", title: "Cultural perceptions", themes: ["Social & Cultural Factors"], questions: [
        yn("c5_child", "Evidence that the health of children is not prioritised in the intervention area?"),
        yn("c5_girls", "Evidence that the health needs of girls are not prioritised?"),
        yn("c5_ethnic", "Evidence that the health needs of specific ethnic groups are not prioritised?"),
      ]},
      { id: "5.2", title: "Barriers to wearing eyeglasses / parents & children", themes: ["Social & Cultural Factors", "Health Literacy", "Cost & Affordability", "Accessibility & Disability"], questions: [
        yn("c5_info", "Is information available on barriers that limit spectacle wear among children, applicable to the intervention area?"),
        group("c5_perception", "Barriers / perception & awareness", ["Fears about wearing eyeglasses", "Unacceptable colour, style or quality", "Low literacy levels of parents", "Lack of information about screening and use of eyeglasses", "No felt need by parents", "Misinformation and misconceptions about eyeglasses", "Cultural beliefs and practices about eye health and use of eyeglasses", "Traditional / religious beliefs prevent or delay treatment of children who need eyeglasses", "Child's vision affected by witchcraft", "Bullying and teasing", "Other stigma", "Lack of clear messaging on the benefits of eyeglasses", "Lack of clear communication on the processes involved in a school eye health programme"]),
        group("c5_costs", "Barriers / costs", ["Fear of loss of earnings / daily wages by parents to access eyeglasses", "Limited availability of financial resources in family to procure eyeglasses", "Travel cost to point of referral", "Cost of eyeglasses", "Cost of eye care treatment"]),
        group("c5_access", "Barriers / access & accessibility", ["Long distance to point of referral to obtain eyeglasses", "Long distance to point of referral for eye care treatment", "Delay in dispensing of eyeglasses", "Lack of person to accompany child to referral centre for eyeglasses or eye care treatment", "Waiting time between screening and eye care treatment or provision of eyeglasses", "Seasonal variation that limits access to eye health services", "Lack of trust by parents in personnel conducting screening", "Lack of trust by parents in eye care service provider at referral centre", "Children with disabilities cannot access screening", "Children with disabilities cannot access referral centre", "Other"]),
      ]},
      { id: "5.3", title: "Barriers to the delivery of programmes", themes: ["Human Resources", "Supply Chain", "Funding & Resources", "Accessibility & Disability"], questions: [
        yn("c5_system", "Barriers within the health or education system preventing uptake by school-age children?"),
        group("c5_hr", "Barriers / Human Resources", ["Screeners (e.g. teachers or nurses) inadequately trained", "Teachers do not have time to screen", "Lack of eye care professionals to receive and attend to referrals", "Poor attitude / behaviours of education personnel at the point of screening", "Poor attitude and behaviours of eye health personnel at referral centres"]),
        group("c5_supply", "Barriers / Supply Chain", ["No eyeglasses suitable for children available within the intervention area"]),
        group("c5_finance", "Barriers / Financing", ["Inadequate state investment in school health services", "Eyeglasses not included in health insurance or other state financing mechanism"]),
        group("c5_service", "Barriers / Service Delivery", ["Poor integration of school eye health in other health screening programmes", "Lack of support services for children with vision impairment", "Inadequate referral pathway between schools and eye health services", "Delays in providing eyeglasses", "Other"]),
      ]},
      { id: "5.4", title: "Reflections and Implications", questions: [reflections("c5")] },
    ],
  },
];

export const COMPONENT_TITLES: Record<string, string> = {
  c1: "Sectoral Legislation, Policy and Strategy",
  c2: "Institutional and Service Delivery Environment",
  c3: "Human Resources",
  c4: "Supply Chain",
  c5: "Barriers",
};

export const ASSESS: Component[] = [CONTEXT, ...COMPONENTS];

export function keysForQuestions(questions: Question[]): string[] {
  const keys: string[] = [];
  questions.forEach((q) => {
    if (q.type === "yn") keys.push(q.id + "__yn");
    else if (q.type === "text" || q.type === "field") keys.push(q.id);
    else if (q.type === "group") q.items.forEach((_, i) => keys.push(`${q.id}__${i}`));
    else if (q.type === "table") q.rows.forEach((_, ri) => q.cols.forEach((_, ci) => keys.push(`${q.id}__${ri}_${ci}`)));
    else if (q.type === "reflections") [0, 1, 2].forEach((i) => { keys.push(`${q.id}__challenge_${i}`); keys.push(`${q.id}__support_${i}`); });
  });
  return keys;
}
