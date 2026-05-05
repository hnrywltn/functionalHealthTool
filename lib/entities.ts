export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "array" | "file";
};

export type EntityConfig = {
  type: string;
  label: string;
  labelPlural: string;
  color: string;       // Tailwind bg class for dot + badge bg
  textColor: string;   // Tailwind text class for badge
  hex: string;         // raw hex for inline use
  fields: FieldDef[];
};

export const ENTITY_CONFIGS: EntityConfig[] = [
  {
    type: "supplements",
    label: "Supplement",
    labelPlural: "Supplements",
    color: "bg-[#F4E9CD]",
    textColor: "text-[#272727]",
    hex: "#F4E9CD",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "indications", label: "Indications", type: "textarea" },
      { key: "mechanism_of_action", label: "Mechanism of Action", type: "textarea" },
      { key: "dosage", label: "Dosage", type: "text" },
      { key: "forms", label: "Forms", type: "array" },
      { key: "recommended_brands", label: "Recommended Brands", type: "textarea" },
      { key: "when_to_take", label: "When to Take", type: "text" },
      { key: "how_long_to_take", label: "How Long to Take", type: "text" },
      { key: "prn_usage", label: "PRN Usage", type: "textarea" },
      { key: "adverse_effects", label: "Adverse Effects", type: "textarea" },
      { key: "contraindications", label: "Contraindications", type: "textarea" },
      { key: "testing", label: "Testing", type: "textarea" },
      { key: "documents", label: "Documents", type: "file" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "symptoms",
    label: "Symptom",
    labelPlural: "Symptoms",
    color: "bg-[#9DBEBB]",
    textColor: "text-[#272727]",
    hex: "#9DBEBB",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "related_biochemistry", label: "Related Biochemistry", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "diagnoses",
    label: "Diagnosis",
    labelPlural: "Diagnoses",
    color: "bg-[#77ACA2]",
    textColor: "text-[#272727]",
    hex: "#77ACA2",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "icd10_codes", label: "ICD-10 Code(s)", type: "array" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "labs",
    label: "Lab",
    labelPlural: "Labs",
    color: "bg-[#468189]",
    textColor: "text-[#FEFEFA]",
    hex: "#468189",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "what_it_measures", label: "What It Measures", type: "textarea" },
      { key: "normal_range", label: "Normal Range", type: "text" },
      { key: "low_interpretation", label: "Low Interpretation", type: "textarea" },
      { key: "high_interpretation", label: "High Interpretation", type: "textarea" },
      { key: "collection_type", label: "Collection Type", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "medications",
    label: "Medication",
    labelPlural: "Medications",
    color: "bg-[#031926]",
    textColor: "text-[#FEFEFA]",
    hex: "#031926",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "prescription", label: "Prescription (Rx)", type: "text" },
      { key: "drug_class", label: "Drug Class", type: "text" },
      { key: "dosage", label: "Dosage", type: "text" },
      { key: "cost", label: "Cost", type: "text" },
      { key: "mechanism_of_action", label: "Mechanism of Action", type: "textarea" },
      { key: "side_effects", label: "Side Effects", type: "textarea" },
      { key: "contraindications", label: "Contraindications", type: "textarea" },
      { key: "interactions", label: "Interactions", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "biochemical_markers",
    label: "Biomarker",
    labelPlural: "Biomarkers",
    color: "bg-[#272727]",
    textColor: "text-[#FEFEFA]",
    hex: "#272727",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "normal_range", label: "Normal Range", type: "text" },
      { key: "low_interpretation", label: "Low Interpretation", type: "textarea" },
      { key: "high_interpretation", label: "High Interpretation", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "protocols",
    label: "Protocol",
    labelPlural: "Protocols",
    color: "bg-[#77ACA2]",
    textColor: "text-[#272727]",
    hex: "#77ACA2",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "steps", label: "Steps", type: "textarea" },
      { key: "formula", label: "Formula", type: "textarea" },
      { key: "duration", label: "Duration", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "amino_acids",
    label: "Amino Acid",
    labelPlural: "Amino Acids",
    color: "bg-[#C4A882]",
    textColor: "text-[#272727]",
    hex: "#C4A882",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "role", label: "Role / Function", type: "textarea" },
      { key: "food_sources", label: "Food Sources", type: "textarea" },
      { key: "deficiency_signs", label: "Deficiency Signs", type: "textarea" },
      { key: "normal_range", label: "Normal Range", type: "text" },
      { key: "dosage", label: "Supplemental Dosage", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "genetics",
    label: "Genetic Marker",
    labelPlural: "Genetics",
    color: "bg-[#6B8CAE]",
    textColor: "text-[#FEFEFA]",
    hex: "#6B8CAE",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "gene", label: "Gene", type: "text" },
      { key: "variant", label: "Variant / SNP", type: "text" },
      { key: "clinical_significance", label: "Clinical Significance", type: "textarea" },
      { key: "related_conditions", label: "Related Conditions", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    type: "vendors",
    label: "Vendor / Pharmacy",
    labelPlural: "Vendors & Pharmacies",
    color: "bg-[#9DBEBB]",
    textColor: "text-[#272727]",
    hex: "#9DBEBB",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      { key: "website", label: "Website", type: "text" },
      { key: "vendor_type", label: "Type", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

export const ENTITY_TYPES = ENTITY_CONFIGS.map((e) => e.type);

export function getEntityConfig(type: string): EntityConfig | undefined {
  return ENTITY_CONFIGS.find((e) => e.type === type);
}
