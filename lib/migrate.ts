import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS supplements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        mechanism_of_action TEXT,
        dosage TEXT,
        forms TEXT[],
        recommended_brands TEXT,
        when_to_take TEXT,
        how_long_to_take TEXT,
        prn_usage TEXT,
        adverse_effects TEXT,
        contraindications TEXT,
        indications TEXT,
        vendors_pharmacies TEXT[],
        documents TEXT[],
        testing TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add new supplements columns to existing installs
    for (const col of [
      "indications TEXT",
      "vendors_pharmacies TEXT[]",
      "documents TEXT[]",
    ]) {
      const [name, ...rest] = col.split(" ");
      await client.query(`ALTER TABLE supplements ADD COLUMN IF NOT EXISTS ${name} ${rest.join(" ")}`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS symptoms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        related_biochemistry TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        icd10_codes TEXT[],
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS labs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        what_it_measures TEXT,
        normal_range TEXT,
        low_interpretation TEXT,
        high_interpretation TEXT,
        collection_type TEXT,
        lab_company TEXT,
        lab_company_url TEXT,
        instructions_url TEXT,
        sample_report_url TEXT,
        cost TEXT,
        turnaround_time TEXT,
        indications TEXT,
        lab_requisition_url TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add new labs columns to existing installs
    for (const col of [
      "lab_company TEXT",
      "lab_company_url TEXT",
      "instructions_url TEXT",
      "sample_report_url TEXT",
      "cost TEXT",
      "turnaround_time TEXT",
      "indications TEXT",
      "lab_requisition_url TEXT",
    ]) {
      const [name, type] = col.split(" ");
      await client.query(`ALTER TABLE labs ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }

    await client.query(`ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS icd10_codes TEXT[]`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        prescription TEXT,
        drug_class TEXT,
        dosage TEXT,
        cost TEXT,
        mechanism_of_action TEXT,
        side_effects TEXT,
        contraindications TEXT,
        interactions TEXT,
        vendors_pharmacies TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const col of ["prescription TEXT", "cost TEXT", "vendors_pharmacies TEXT"]) {
      const [name, ...rest] = col.split(" ");
      await client.query(`ALTER TABLE medications ADD COLUMN IF NOT EXISTS ${name} ${rest.join(" ")}`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS biochemical_markers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        normal_range TEXT,
        low_interpretation TEXT,
        high_interpretation TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS protocols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        steps TEXT,
        formula TEXT,
        duration TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE protocols ADD COLUMN IF NOT EXISTS formula TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS amino_acids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        role TEXT,
        food_sources TEXT,
        deficiency_signs TEXT,
        normal_range TEXT,
        dosage TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS genetics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        gene TEXT,
        variant TEXT,
        clinical_significance TEXT,
        related_conditions TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        website TEXT,
        vendor_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT NOT NULL,
        file_key TEXT NOT NULL UNIQUE,
        file_type TEXT NOT NULL DEFAULT 'other',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS entity_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        attachment_id UUID NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_type, entity_id, attachment_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_attachments_entity
        ON entity_attachments(entity_type, entity_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_attachments_attachment
        ON entity_attachments(attachment_id)
    `);

    // Migrate existing supplement documents into attachments
    await client.query(`
      INSERT INTO attachments (label, file_key, file_type)
      SELECT DISTINCT
        split_part(file_key, '/', array_length(string_to_array(file_key, '/'), 1)),
        file_key,
        CASE
          WHEN file_key ~* '\\.(pdf)$' THEN 'pdf'
          WHEN file_key ~* '\\.(png|jpe?g|webp|gif)$' THEN 'image'
          ELSE 'other'
        END
      FROM (
        SELECT unnest(documents) AS file_key
        FROM supplements
        WHERE documents IS NOT NULL AND cardinality(documents) > 0
      ) docs
      ON CONFLICT (file_key) DO NOTHING
    `);

    await client.query(`
      INSERT INTO entity_attachments (entity_type, entity_id, attachment_id)
      SELECT 'supplements', s.id, a.id
      FROM supplements s
      CROSS JOIN LATERAL unnest(s.documents) AS fk
      JOIN attachments a ON a.file_key = fk
      WHERE s.documents IS NOT NULL AND cardinality(s.documents) > 0
      ON CONFLICT DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS entity_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_type, entity_id, tag_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_tags_entity
        ON entity_tags(entity_type, entity_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_tags_tag
        ON entity_tags(tag_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS entity_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type_a TEXT NOT NULL,
        entity_id_a UUID NOT NULL,
        entity_type_b TEXT NOT NULL,
        entity_id_b UUID NOT NULL,
        relationship_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(entity_type_a, entity_id_a, entity_type_b, entity_id_b)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_a
        ON entity_relationships(entity_type_a, entity_id_a)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_b
        ON entity_relationships(entity_type_b, entity_id_b)
    `);

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
