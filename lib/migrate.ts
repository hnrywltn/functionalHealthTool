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
      "ingredients TEXT",
      "source TEXT",
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

    // Rename labs → lab_tests (idempotent)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'labs'
        ) THEN
          ALTER TABLE labs RENAME TO lab_tests;
        END IF;
      END $$
    `);

    // Update entity type strings in join tables after rename
    await client.query(`UPDATE entity_relationships SET entity_type_a = 'lab_tests' WHERE entity_type_a = 'labs'`);
    await client.query(`UPDATE entity_relationships SET entity_type_b = 'lab_tests' WHERE entity_type_b = 'labs'`);
    await client.query(`UPDATE entity_tags SET entity_type = 'lab_tests' WHERE entity_type = 'labs'`);
    await client.query(`UPDATE entity_attachments SET entity_type = 'lab_tests' WHERE entity_type = 'labs'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        what_it_measures TEXT,
        normal_range TEXT,
        low_interpretation TEXT,
        high_interpretation TEXT,
        collection_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS laboratories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        website TEXT,
        phone TEXT,
        address TEXT,
        specialties TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS email TEXT`);

    for (const col of [
      "indications TEXT",
      "ranges TEXT",
      "source TEXT",
      "cost TEXT",
      "instructions TEXT",
      "faqs TEXT",
    ]) {
      const [name, ...rest] = col.split(" ");
      await client.query(`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ${name} ${rest.join(" ")}`);
    }

    await client.query(`ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS icd10_codes TEXT[]`);
    await client.query(`ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT`);
    await client.query(`ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS dsm_v TEXT`);

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
      CREATE TABLE IF NOT EXISTS nutrition (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        nutrient_class TEXT,
        food_sources TEXT,
        functions TEXT,
        deficiency_signs TEXT,
        excess_signs TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        brand TEXT,
        product_type TEXT,
        where_to_buy TEXT,
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
      CREATE TABLE IF NOT EXISTS anatomy_physiology (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        body_system TEXT,
        structures TEXT,
        function TEXT,
        clinical_relevance TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ce (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        topic TEXT,
        source TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE ce ADD COLUMN IF NOT EXISTS description TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        classification TEXT,
        description TEXT,
        brand TEXT,
        source TEXT,
        instructions TEXT,
        accessories TEXT[],
        maintenance TEXT,
        contact TEXT,
        cost TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        clinical_identifiers TEXT,
        review_date TEXT,
        cost TEXT,
        source TEXT,
        benefits TEXT,
        links TEXT,
        education TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        form_type TEXT,
        purpose TEXT,
        policy_and_procedure TEXT,
        review_date TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS description TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        assessment_type TEXT,
        purpose TEXT,
        links TEXT,
        citations TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
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
