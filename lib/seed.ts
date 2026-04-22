import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Supplements
    const suppIds: Record<string, string> = {};
    const supplements = [
      {
        name: "GABA",
        description: "Gamma-aminobutyric acid, the primary inhibitory neurotransmitter in the brain.",
        mechanism_of_action: "Binds to GABA-A and GABA-B receptors, reducing neuronal excitability throughout the nervous system.",
        dosage: "250–750mg",
        forms: ["capsule", "powder", "sublingual"],
        recommended_brands: "Thorne, Pure Encapsulations, Designs for Health",
        when_to_take: "Evening or as needed for acute anxiety. Avoid driving.",
        how_long_to_take: "4–8 weeks, then reassess",
        prn_usage: "100–250mg for acute anxiety or sleep onset difficulty",
        adverse_effects: "Tingling, flushing, shortness of breath at high doses",
        contraindications: "Caution with benzodiazepines and other CNS depressants",
        testing: "Organic acids test (OAT), plasma amino acids",
        notes: "Peripheral GABA may not cross BBB well; phenibut and picamilon are more CNS-active but higher risk",
      },
      {
        name: "Magnesium Glycinate",
        description: "Highly bioavailable form of magnesium bound to glycine, supporting relaxation and sleep.",
        mechanism_of_action: "Cofactor in 300+ enzymatic reactions; modulates NMDA receptors and supports HPA axis regulation.",
        dosage: "200–400mg elemental magnesium",
        forms: ["capsule", "powder"],
        recommended_brands: "Thorne Magnesium Bisglycinate, Pure Encapsulations Magnesium Glycinate",
        when_to_take: "Evening with food",
        how_long_to_take: "Ongoing for most deficient patients",
        prn_usage: "Extra 200mg for acute muscle cramping or pre-menstrual tension",
        adverse_effects: "Loose stools at high doses (less than oxide form)",
        contraindications: "Renal insufficiency — use caution",
        testing: "RBC magnesium (serum magnesium is unreliable)",
        notes: "Magnesium oxide is poorly absorbed; avoid as therapeutic form",
      },
      {
        name: "Vitamin D3 + K2",
        description: "Fat-soluble vitamin with hormone-like action, co-administered with K2 to direct calcium appropriately.",
        mechanism_of_action: "Binds vitamin D receptor (VDR) affecting 5% of the genome; K2 (MK-7) activates osteocalcin and matrix GLA protein.",
        dosage: "2000–5000 IU D3 with 90–180mcg K2 (MK-7)",
        forms: ["capsule", "softgel", "liquid drops"],
        recommended_brands: "Thorne D3/K2, Pure Encapsulations D3/K2",
        when_to_take: "With largest meal of the day (fat-soluble)",
        how_long_to_take: "Ongoing; retest 25-OH-D in 3 months",
        prn_usage: null,
        adverse_effects: "Hypercalcemia at very high doses (>10,000 IU long-term without monitoring)",
        contraindications: "Sarcoidosis, granulomatous disease, hypercalcemia",
        testing: "25-OH Vitamin D — target 50–80 ng/mL",
        notes: "Always pair with K2 when dosing >2000 IU to prevent arterial calcification",
      },
      {
        name: "L-Theanine",
        description: "Amino acid found in green tea that promotes calm alertness without sedation.",
        mechanism_of_action: "Increases alpha brain wave activity; modulates GABA, dopamine, and serotonin; antagonizes glutamate at NMDA receptors.",
        dosage: "100–400mg",
        forms: ["capsule", "powder"],
        recommended_brands: "Pure Encapsulations, Jarrow, Suntheanine brand preferred",
        when_to_take: "Morning with caffeine for focus; evening for sleep support",
        how_long_to_take: "As needed or ongoing",
        prn_usage: "200mg for acute stress or pre-sleep",
        adverse_effects: "Rare: headache at high doses",
        contraindications: "None established",
        testing: "Plasma amino acids if broad amino acid balance is in question",
        notes: "Synergistic with caffeine 2:1 ratio (200mg theanine : 100mg caffeine) for focused calm",
      },
      {
        name: "Zinc Picolinate",
        description: "Highly absorbable form of zinc essential for immune function, hormone synthesis, and neurotransmitter production.",
        mechanism_of_action: "Cofactor for 300+ enzymes; required for B6 activation, serotonin synthesis, testosterone production, and immune T-cell function.",
        dosage: "15–30mg",
        forms: ["capsule", "lozenge"],
        recommended_brands: "Thorne Zinc Picolinate, Pure Encapsulations",
        when_to_take: "With food to reduce nausea; evening preferred",
        how_long_to_take: "3–6 months then retest; long-term use requires copper monitoring",
        prn_usage: "Lozenges for acute immune support",
        adverse_effects: "Nausea on empty stomach; copper depletion with long-term high dosing",
        contraindications: "Concurrent copper-deficiency anemia without copper co-supplementation",
        testing: "Serum zinc, plasma zinc; also consider RBC zinc",
        notes: "Balance with copper 15:1 ratio (zinc:copper) for long-term use",
      },
    ];

    for (const s of supplements) {
      const { rows } = await client.query(
        `INSERT INTO supplements (name, description, mechanism_of_action, dosage, forms, recommended_brands, when_to_take, how_long_to_take, prn_usage, adverse_effects, contraindications, testing, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [s.name, s.description, s.mechanism_of_action, s.dosage, s.forms, s.recommended_brands, s.when_to_take, s.how_long_to_take, s.prn_usage, s.adverse_effects, s.contraindications, s.testing, s.notes]
      );
      suppIds[s.name] = rows[0].id;
    }

    // Symptoms
    const symIds: Record<string, string> = {};
    const symptoms = [
      { name: "Anxiety", description: "Persistent worry, restlessness, or sense of impending doom disproportionate to circumstances.", related_biochemistry: "Low GABA, low serotonin, low magnesium, elevated cortisol, HPA dysregulation, glutamate excess", notes: "Distinguish generalized anxiety from situational; assess caffeine, sleep, and thyroid first" },
      { name: "Insomnia", description: "Difficulty initiating or maintaining sleep, or non-restorative sleep.", related_biochemistry: "Low melatonin, low GABA, elevated cortisol (especially PM cortisol), low magnesium, low serotonin precursors", notes: "Assess sleep hygiene, light exposure, and cortisol rhythm before supplementing" },
      { name: "Fatigue", description: "Persistent low energy not relieved by rest.", related_biochemistry: "Low iron/ferritin, low B12, low D3, hypothyroidism, adrenal insufficiency, mitochondrial dysfunction, low CoQ10", notes: "Most common presenting complaint; requires systematic lab workup before treatment" },
      { name: "Brain Fog", description: "Difficulty concentrating, poor memory, mental sluggishness.", related_biochemistry: "Neuroinflammation, low omega-3, gut dysbiosis (leaky gut → systemic inflammation), blood sugar dysregulation, hypothyroidism, low B12", notes: "Gut-brain axis often overlooked; GI workup warranted if persistent" },
      { name: "Muscle Cramps", description: "Involuntary painful muscle contractions, often nocturnal.", related_biochemistry: "Low magnesium, low potassium, low calcium, dehydration, low vitamin D", notes: "Nocturnal leg cramps respond well to magnesium glycinate; rule out peripheral vascular disease in older patients" },
    ];

    for (const s of symptoms) {
      const { rows } = await client.query(
        `INSERT INTO symptoms (name, description, related_biochemistry, notes) VALUES ($1,$2,$3,$4) RETURNING id`,
        [s.name, s.description, s.related_biochemistry, s.notes]
      );
      symIds[s.name] = rows[0].id;
    }

    // Diagnoses
    const dxIds: Record<string, string> = {};
    const diagnoses = [
      { name: "Generalized Anxiety Disorder", description: "Chronic, excessive worry about multiple domains lasting ≥6 months, with associated physical symptoms.", notes: "Functional approach: assess GABA, serotonin, cortisol, thyroid, nutrient status before or alongside conventional treatment" },
      { name: "Hypothyroidism", description: "Underactive thyroid gland resulting in reduced metabolism, fatigue, weight gain, cold intolerance.", notes: "Functional range for TSH: 1.0–2.5 mIU/L; conventional lab ranges may miss subclinical cases. Always test Free T3, Free T4, and TPO antibodies." },
      { name: "Adrenal Dysfunction", description: "HPA axis dysregulation resulting in abnormal cortisol patterns — often called adrenal fatigue in functional medicine.", notes: "4-point salivary cortisol is preferred over serum. Pattern (flat, high-evening, low-morning) guides treatment more than single values." },
      { name: "Leaky Gut Syndrome", description: "Increased intestinal permeability allowing microbial products and undigested food particles to enter systemic circulation.", notes: "Not a conventional diagnosis; correlates with systemic inflammation, autoimmunity, and neurological symptoms. Lactulose/mannitol ratio test or zonulin for assessment." },
      { name: "Pyroluria", description: "Metabolic condition involving excess production of hydroxyhemopyrrolin-2-one (HPL), depleting zinc and B6.", notes: "Controversial in conventional medicine; diagnosed via urine kryptopyrrole. Treatment: zinc + B6 (P5P form). Common in anxiety, ADHD, depression." },
    ];

    for (const d of diagnoses) {
      const { rows } = await client.query(
        `INSERT INTO diagnoses (name, description, notes) VALUES ($1,$2,$3) RETURNING id`,
        [d.name, d.description, d.notes]
      );
      dxIds[d.name] = rows[0].id;
    }

    // Labs
    const labIds: Record<string, string> = {};
    const labs = [
      { name: "Comprehensive Metabolic Panel (CMP)", description: "Standard panel assessing kidney function, liver function, electrolytes, and blood glucose.", what_it_measures: "Glucose, BUN, creatinine, eGFR, sodium, potassium, CO2, chloride, calcium, total protein, albumin, AST, ALT, ALP, bilirubin", normal_range: "See individual markers", low_interpretation: "Low albumin: malnutrition or liver disease. Low calcium: magnesium deficiency, hypoparathyroidism.", high_interpretation: "Elevated AST/ALT: liver stress. Elevated creatinine: renal impairment.", collection_type: "Serum (fasted)", notes: "Order fasted for accurate glucose. Functional ranges differ from lab ranges." },
      { name: "Thyroid Panel (Full)", description: "Comprehensive thyroid assessment beyond standard TSH.", what_it_measures: "TSH, Free T4, Free T3, Reverse T3, TPO antibodies, thyroglobulin antibodies", normal_range: "TSH: 0.5–4.5 (functional: 1.0–2.5); Free T4: 0.8–1.8; Free T3: 2.3–4.2", low_interpretation: "Low Free T3 with normal TSH: peripheral conversion problem. Consider selenium deficiency.", high_interpretation: "Elevated TPO antibodies: Hashimoto's thyroiditis — autoimmune process.", collection_type: "Serum (morning, fasted)", notes: "Standard TSH-only testing misses many functional thyroid issues. Always include Free T3." },
      { name: "25-OH Vitamin D", description: "Storage form of vitamin D; best marker of overall D status.", what_it_measures: "Serum 25-hydroxyvitamin D", normal_range: "Lab normal: 30–100 ng/mL. Functional target: 50–80 ng/mL.", low_interpretation: "Below 30: frank deficiency — immune suppression, bone loss, mood disorders, muscle weakness.", high_interpretation: "Above 100: toxicity risk — hypercalcemia, kidney stones. Rare with food/sun; possible with high-dose supplementation.", collection_type: "Serum", notes: "Retest 3 months after starting supplementation. Always pair high-dose supplementation with K2." },
      { name: "RBC Magnesium", description: "Intracellular magnesium status — far more accurate than serum magnesium.", what_it_measures: "Magnesium concentration inside red blood cells", normal_range: "4.2–6.8 mg/dL (functional target upper half of range)", low_interpretation: "Anxiety, insomnia, muscle cramps, constipation, palpitations, insulin resistance", high_interpretation: "Rare; possible with renal insufficiency or excessive supplementation", collection_type: "Whole blood (EDTA tube)", notes: "Serum magnesium is the last thing to drop — RBC magnesium reflects tissue stores much earlier. Most patients with symptoms are in lower half of range." },
      { name: "Urine Kryptopyrrole", description: "Assesses HPL (hydroxyhemopyrrolin-2-one) levels to evaluate for pyroluria.", what_it_measures: "HPL in a first-morning urine sample", normal_range: "< 10 mcg/dL normal; 10–20 borderline; > 20 positive", low_interpretation: "No significance", high_interpretation: "> 20: pyroluria — significantly depletes zinc and vitamin B6, leading to anxiety, poor stress tolerance, mood disorders", collection_type: "First-morning urine (protect from light)", notes: "Sample must be frozen immediately and protected from light — HPL degrades rapidly. Use only labs that specialize in this test." },
    ];

    for (const l of labs) {
      const { rows } = await client.query(
        `INSERT INTO labs (name, description, what_it_measures, normal_range, low_interpretation, high_interpretation, collection_type, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [l.name, l.description, l.what_it_measures, l.normal_range, l.low_interpretation, l.high_interpretation, l.collection_type, l.notes]
      );
      labIds[l.name] = rows[0].id;
    }

    // Medications
    const medIds: Record<string, string> = {};
    const medications = [
      { name: "Levothyroxine (Synthroid)", description: "Synthetic T4 thyroid hormone replacement.", drug_class: "Thyroid hormone", dosage: "25–200mcg daily, titrated by TSH and symptoms", mechanism_of_action: "Replaces endogenous T4; converted peripherally to active T3", side_effects: "Palpitations, anxiety, insomnia, bone loss (over-treatment); fatigue, weight gain (under-treatment)", contraindications: "Uncorrected adrenal insufficiency; thyrotoxicosis", interactions: "Calcium and iron reduce absorption — take 4 hours apart. Biotin supplements can falsely alter thyroid lab values.", notes: "Many patients do better on combination T4/T3 (e.g., Nature-Throid) or desiccated thyroid if T4-to-T3 conversion is impaired" },
      { name: "SSRIs (Sertraline/Zoloft)", description: "First-line pharmaceutical treatment for depression and anxiety disorders.", drug_class: "Selective Serotonin Reuptake Inhibitor", dosage: "25–200mg daily (sertraline); start low, titrate slowly", mechanism_of_action: "Blocks serotonin reuptake transporter (SERT), increasing synaptic serotonin availability", side_effects: "GI upset, sexual dysfunction, sleep changes, emotional blunting, weight gain (long-term)", contraindications: "MAOIs within 14 days; serotonin syndrome risk with tryptophan or 5-HTP combination", interactions: "St. John's Wort — serotonin syndrome risk. NSAIDs — increased GI bleeding risk.", notes: "Nutrient depletions: folate, CoQ10. Consider methylfolate supplementation alongside SSRIs, especially in MTHFR variants." },
      { name: "Metformin", description: "First-line medication for type 2 diabetes; also used for insulin resistance and PCOS.", drug_class: "Biguanide", dosage: "500–2000mg daily with food, divided doses", mechanism_of_action: "Activates AMPK, reducing hepatic glucose production and improving insulin sensitivity", side_effects: "GI upset (take with food), lactic acidosis (rare), B12 depletion", contraindications: "eGFR < 30, contrast dye procedures, excessive alcohol", interactions: "Iodinated contrast — hold 48h before/after. Alcohol increases lactic acidosis risk.", notes: "Depletes vitamin B12 — monitor annually and supplement as needed. Associated with microbiome changes." },
      { name: "Low-Dose Naltrexone (LDN)", description: "Off-label use of very low dose naltrexone for immune modulation and neuroinflammation.", drug_class: "Opioid antagonist (ultra-low dose)", dosage: "1.5–4.5mg nightly (compounded)", mechanism_of_action: "Brief opioid receptor blockade triggers upregulation of endorphin production; modulates microglial activation and TLR4 signaling to reduce neuroinflammation", side_effects: "Vivid dreams initially (usually resolves), mild GI upset at start", contraindications: "Concurrent opioid medications (must be off opioids ≥7 days)", interactions: "Do not combine with opioid pain medications or opioid-containing cough suppressants", notes: "Must be compounded — standard 50mg tablets cannot be split accurately to therapeutic LDN doses. Requires knowledgeable prescriber." },
      { name: "Bioidentical Progesterone (Prometrium)", description: "Bioidentical micronized progesterone for hormone balance, sleep, and anxiety in perimenopausal women.", drug_class: "Bioidentical hormone", dosage: "100–200mg nightly (oral); lower doses transdermally", mechanism_of_action: "Binds progesterone receptors; metabolizes to allopregnanolone which is a potent GABA-A receptor positive allosteric modulator", side_effects: "Drowsiness (beneficial at night), dizziness, breast tenderness", contraindications: "Progesterone-sensitive cancers, undiagnosed vaginal bleeding", interactions: "Additive CNS depression with benzodiazepines and alcohol", notes: "Oral route preferred for sleep/anxiety (higher allopregnanolone conversion). Transdermal preferred for systemic hormone balance." },
    ];

    for (const m of medications) {
      const { rows } = await client.query(
        `INSERT INTO medications (name, description, drug_class, dosage, mechanism_of_action, side_effects, contraindications, interactions, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [m.name, m.description, m.drug_class, m.dosage, m.mechanism_of_action, m.side_effects, m.contraindications, m.interactions, m.notes]
      );
      medIds[m.name] = rows[0].id;
    }

    // Biochemical Markers
    const markerIds: Record<string, string> = {};
    const markers = [
      { name: "Cortisol (Salivary)", description: "Free cortisol measured at 4 points throughout the day via saliva — reflects HPA axis rhythm.", normal_range: "Morning: 13–24 nM; Noon: 3–7 nM; Evening: 1–4 nM; Night: 0.5–2 nM", low_interpretation: "Flat or low-morning cortisol: adrenal insufficiency, burnout phase of chronic stress, HPA downregulation", high_interpretation: "Elevated evening cortisol: anxiety, insomnia, inability to wind down, chronic perceived stress", notes: "4-point salivary test (morning/noon/evening/night) required to see full rhythm. Single serum cortisol is insufficient for functional assessment." },
      { name: "Serotonin (Whole Blood)", description: "Measure of serotonin levels, primarily reflecting platelet serotonin (not CNS levels directly).", normal_range: "50–220 ng/mL (whole blood)", low_interpretation: "Depression, anxiety, obsessive thinking, pain sensitivity, poor sleep, carbohydrate cravings", high_interpretation: "Serotonin syndrome marker; elevated in carcinoid tumors; some patients on SSRIs", notes: "Whole blood serotonin reflects peripheral production (gut), not CNS. Urine 5-HIAA provides complementary information on serotonin metabolism." },
      { name: "Homocysteine", description: "Amino acid metabolite that accumulates when methylation pathways are impaired.", normal_range: "< 7 mcmol/L (functional); lab may report < 15 as normal", low_interpretation: "No clinical significance", high_interpretation: "Elevated homocysteine indicates B12, B6, or folate deficiency, or MTHFR polymorphism impairing methylation. Associated with cardiovascular risk, neurodegeneration, depression.", notes: "One of the most important markers for methylation status. Responds well to methylfolate, methylcobalamin, and P5P supplementation." },
      { name: "hs-CRP (High-Sensitivity CRP)", description: "Highly sensitive marker of systemic inflammation.", normal_range: "< 1.0 mg/L (optimal); < 3.0 mg/L (conventional normal)", low_interpretation: "No significance", high_interpretation: "> 1.0: chronic low-grade inflammation — gut permeability, insulin resistance, autoimmunity, cardiovascular risk. > 3.0: significant inflammation.", notes: "Useful for tracking response to anti-inflammatory interventions. Confounded by acute illness — retest if patient recently sick." },
      { name: "Fasting Insulin", description: "Direct measure of insulin levels in fasting state — detects insulin resistance earlier than glucose.", normal_range: "2–5 mIU/L (functional optimal); lab normal often up to 25", low_interpretation: "< 2: possible pancreatic insufficiency or type 1 diabetes", high_interpretation: "> 5–7: early insulin resistance even with normal fasting glucose and HbA1c. > 15: significant insulin resistance.", notes: "Fasting insulin is the best early marker of insulin resistance. Most conventional workups miss this by relying on glucose and HbA1c alone." },
    ];

    for (const m of markers) {
      const { rows } = await client.query(
        `INSERT INTO biochemical_markers (name, description, normal_range, low_interpretation, high_interpretation, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [m.name, m.description, m.normal_range, m.low_interpretation, m.high_interpretation, m.notes]
      );
      markerIds[m.name] = rows[0].id;
    }

    // Protocols
    const protoIds: Record<string, string> = {};
    const protocols = [
      { name: "Anxiety & Sleep Reset", description: "4-week foundational protocol for patients presenting with anxiety, insomnia, and nervous system dysregulation.", steps: "Week 1: Baseline labs (RBC Mg, 25-OH-D, thyroid panel, salivary cortisol). Start magnesium glycinate 400mg nightly.\nWeek 2: Add L-theanine 200mg morning + 200mg evening. Review cortisol results — if high-evening, add phosphatidylserine 400mg with dinner.\nWeek 3: If GABA suspected low (OAT or clinical picture), add GABA 250mg sublingual before bed. Address caffeine — cut off by noon.\nWeek 4: Reassess sleep diary and anxiety scale. Adjust doses. Order follow-up RBC Mg.", duration: "4 weeks initial, reassess monthly", notes: "Address light hygiene and screen curfew in parallel — no supplements compensate for blue light at 11pm" },
      { name: "Thyroid Optimization Protocol", description: "Systematic approach to optimizing thyroid function functionally, including nutrient support and medication considerations.", steps: "Step 1: Full thyroid panel (TSH, Free T3, Free T4, Reverse T3, TPO Ab, thyroglobulin Ab) + nutrient cofactors (selenium, zinc, iodine, iron/ferritin).\nStep 2: Correct deficiencies — selenium 200mcg, zinc picolinate 30mg, iron if ferritin < 70.\nStep 3: If TSH > 2.5 with symptoms and nutrients corrected, discuss with prescribing physician re: low-dose thyroid support.\nStep 4: Retest full panel at 6–8 weeks. Target TSH 1.0–2.0, Free T3 upper third of range.", duration: "3–6 months", notes: "Selenium is critical for T4-to-T3 conversion and TPO antibody reduction. Many Hashimoto's patients improve significantly on selenium alone." },
      { name: "Leaky Gut Repair (4R Protocol)", description: "Remove, Replace, Re-inoculate, Repair — foundational gut restoration protocol.", steps: "Remove: Eliminate gluten, dairy, sugar, alcohol, NSAIDs for minimum 8 weeks. Address SIBO or candida if present.\nReplace: Add digestive enzymes with meals, HCl (if low stomach acid confirmed).\nRe-inoculate: Introduce diverse probiotic (multi-strain, 25–50B CFU) + prebiotic fiber (chicory, green banana, cooked/cooled rice).\nRepair: L-glutamine 5g twice daily, zinc carnosine 75mg twice daily, collagen peptides 10–20g daily, deglycyrrhizinated licorice (DGL) before meals.", duration: "8–12 weeks minimum", notes: "Sequence matters — don't add probiotics before removing inflammatory triggers. Retesting zonulin or lactulose/mannitol ratio at 12 weeks helps objectively assess progress." },
      { name: "Pyroluria Treatment Protocol", description: "Targeted zinc and B6 repletion protocol for confirmed pyroluria (urine kryptopyrrole > 20 mcg/dL).", steps: "Baseline: Confirm with urine kryptopyrrole. Also measure serum zinc, plasma zinc, whole blood histamine.\nFoundation: Zinc picolinate 30mg with dinner + P5P (active B6) 50–100mg with breakfast. Never take P5P at night (activating).\nSupport: Add evening primrose oil 2–4g daily (GLA for delta-6-desaturase support). Magnesium glycinate 200–400mg nightly.\nMonitoring: Retest kryptopyrrole and zinc at 3 months. Reduce zinc dose once kryptopyrroles normalize.", duration: "3–6 months, then maintenance", notes: "P5P (not pyridoxine) is required — pyrolurics often cannot convert pyridoxine to P5P. Start low (25mg) and increase slowly — detox reactions possible at high doses." },
      { name: "Vitamin D Repletion Protocol", description: "Structured repletion for patients with 25-OH-D below 30 ng/mL.", steps: "Deficient (< 20 ng/mL): 5000 IU D3 + 180mcg K2 (MK-7) daily with largest meal for 12 weeks, then retest.\nInsufficient (20–30 ng/mL): 2000–3000 IU D3 + K2 daily for 12 weeks, then retest.\nMaintenance (once > 50 ng/mL): 1000–2000 IU daily with periodic monitoring.\nTarget: 50–80 ng/mL. Above 80 consider reducing dose.", duration: "12 weeks to repletion, then maintenance", notes: "Retest at exactly 12 weeks — don't wait 6 months. Cofactors for D metabolism: magnesium (required for D conversion), vitamin A (balance), boron." },
    ];

    for (const p of protocols) {
      const { rows } = await client.query(
        `INSERT INTO protocols (name, description, steps, duration, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [p.name, p.description, p.steps, p.duration, p.notes]
      );
      protoIds[p.name] = rows[0].id;
    }

    // Seed some relationships
    const rels = [
      // GABA ↔ Anxiety
      { a_type: "supplements", a_id: suppIds["GABA"], b_type: "symptoms", b_id: symIds["Anxiety"] },
      { a_type: "supplements", a_id: suppIds["GABA"], b_type: "symptoms", b_id: symIds["Insomnia"] },
      { a_type: "supplements", a_id: suppIds["GABA"], b_type: "diagnoses", b_id: dxIds["Generalized Anxiety Disorder"] },
      { a_type: "supplements", a_id: suppIds["GABA"], b_type: "diagnoses", b_id: dxIds["Pyroluria"] },
      // Magnesium ↔ various
      { a_type: "supplements", a_id: suppIds["Magnesium Glycinate"], b_type: "symptoms", b_id: symIds["Anxiety"] },
      { a_type: "supplements", a_id: suppIds["Magnesium Glycinate"], b_type: "symptoms", b_id: symIds["Insomnia"] },
      { a_type: "supplements", a_id: suppIds["Magnesium Glycinate"], b_type: "symptoms", b_id: symIds["Muscle Cramps"] },
      { a_type: "supplements", a_id: suppIds["Magnesium Glycinate"], b_type: "labs", b_id: labIds["RBC Magnesium"] },
      { a_type: "supplements", a_id: suppIds["Magnesium Glycinate"], b_type: "protocols", b_id: protoIds["Anxiety & Sleep Reset"] },
      // Vitamin D ↔ labs/symptoms
      { a_type: "supplements", a_id: suppIds["Vitamin D3 + K2"], b_type: "symptoms", b_id: symIds["Fatigue"] },
      { a_type: "supplements", a_id: suppIds["Vitamin D3 + K2"], b_type: "labs", b_id: labIds["25-OH Vitamin D"] },
      { a_type: "supplements", a_id: suppIds["Vitamin D3 + K2"], b_type: "protocols", b_id: protoIds["Vitamin D Repletion Protocol"] },
      // L-Theanine ↔ GABA (related supplements)
      { a_type: "supplements", a_id: suppIds["L-Theanine"], b_type: "supplements", b_id: suppIds["GABA"] },
      { a_type: "supplements", a_id: suppIds["L-Theanine"], b_type: "symptoms", b_id: symIds["Anxiety"] },
      { a_type: "supplements", a_id: suppIds["L-Theanine"], b_type: "symptoms", b_id: symIds["Brain Fog"] },
      // Zinc ↔ diagnoses/labs
      { a_type: "supplements", a_id: suppIds["Zinc Picolinate"], b_type: "diagnoses", b_id: dxIds["Pyroluria"] },
      { a_type: "supplements", a_id: suppIds["Zinc Picolinate"], b_type: "labs", b_id: labIds["Urine Kryptopyrrole"] },
      { a_type: "supplements", a_id: suppIds["Zinc Picolinate"], b_type: "protocols", b_id: protoIds["Pyroluria Treatment Protocol"] },
      // Symptoms ↔ diagnoses
      { a_type: "symptoms", a_id: symIds["Anxiety"], b_type: "diagnoses", b_id: dxIds["Generalized Anxiety Disorder"] },
      { a_type: "symptoms", a_id: symIds["Anxiety"], b_type: "diagnoses", b_id: dxIds["Adrenal Dysfunction"] },
      { a_type: "symptoms", a_id: symIds["Fatigue"], b_type: "diagnoses", b_id: dxIds["Hypothyroidism"] },
      { a_type: "symptoms", a_id: symIds["Fatigue"], b_type: "diagnoses", b_id: dxIds["Adrenal Dysfunction"] },
      { a_type: "symptoms", a_id: symIds["Brain Fog"], b_type: "diagnoses", b_id: dxIds["Leaky Gut Syndrome"] },
      { a_type: "symptoms", a_id: symIds["Brain Fog"], b_type: "diagnoses", b_id: dxIds["Hypothyroidism"] },
      // Labs ↔ diagnoses
      { a_type: "labs", a_id: labIds["Thyroid Panel (Full)"], b_type: "diagnoses", b_id: dxIds["Hypothyroidism"] },
      { a_type: "labs", a_id: labIds["Urine Kryptopyrrole"], b_type: "diagnoses", b_id: dxIds["Pyroluria"] },
      // Markers ↔ symptoms/diagnoses
      { a_type: "biochemical_markers", a_id: markerIds["Cortisol (Salivary)"], b_type: "symptoms", b_id: symIds["Anxiety"] },
      { a_type: "biochemical_markers", a_id: markerIds["Cortisol (Salivary)"], b_type: "symptoms", b_id: symIds["Insomnia"] },
      { a_type: "biochemical_markers", a_id: markerIds["Cortisol (Salivary)"], b_type: "diagnoses", b_id: dxIds["Adrenal Dysfunction"] },
      { a_type: "biochemical_markers", a_id: markerIds["Homocysteine"], b_type: "diagnoses", b_id: dxIds["Leaky Gut Syndrome"] },
      { a_type: "biochemical_markers", a_id: markerIds["hs-CRP (High-Sensitivity CRP)"], b_type: "diagnoses", b_id: dxIds["Leaky Gut Syndrome"] },
      // Medications ↔ diagnoses
      { a_type: "medications", a_id: medIds["Levothyroxine (Synthroid)"], b_type: "diagnoses", b_id: dxIds["Hypothyroidism"] },
      { a_type: "medications", a_id: medIds["SSRIs (Sertraline/Zoloft)"], b_type: "diagnoses", b_id: dxIds["Generalized Anxiety Disorder"] },
      { a_type: "medications", a_id: medIds["Bioidentical Progesterone (Prometrium)"], b_type: "symptoms", b_id: symIds["Anxiety"] },
      { a_type: "medications", a_id: medIds["Bioidentical Progesterone (Prometrium)"], b_type: "symptoms", b_id: symIds["Insomnia"] },
      // Protocols ↔ diagnoses/labs
      { a_type: "protocols", a_id: protoIds["Anxiety & Sleep Reset"], b_type: "diagnoses", b_id: dxIds["Generalized Anxiety Disorder"] },
      { a_type: "protocols", a_id: protoIds["Thyroid Optimization Protocol"], b_type: "diagnoses", b_id: dxIds["Hypothyroidism"] },
      { a_type: "protocols", a_id: protoIds["Thyroid Optimization Protocol"], b_type: "labs", b_id: labIds["Thyroid Panel (Full)"] },
      { a_type: "protocols", a_id: protoIds["Leaky Gut Repair (4R Protocol)"], b_type: "diagnoses", b_id: dxIds["Leaky Gut Syndrome"] },
      { a_type: "protocols", a_id: protoIds["Pyroluria Treatment Protocol"], b_type: "diagnoses", b_id: dxIds["Pyroluria"] },
    ];

    for (const r of rels) {
      await client.query(
        `INSERT INTO entity_relationships (entity_type_a, entity_id_a, entity_type_b, entity_id_b)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [r.a_type, r.a_id, r.b_type, r.b_id]
      );
    }

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
