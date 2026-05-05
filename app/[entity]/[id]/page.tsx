export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import pool from "@/lib/db";
import { getEntityConfig, ENTITY_CONFIGS, ENTITY_TYPES } from "@/lib/entities";
import EntityDetailClient from "@/components/EntityDetailClient";

type Props = { params: Promise<{ entity: string; id: string }> };

export default async function EntityDetailPage({ params }: Props) {
  const { entity, id } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const isNew = id === "new";

  if (isNew) {
    return (
      <EntityDetailClient
        config={config}
        record={null}
        relationships={[]}
        initialTags={[]}
        allConfigs={ENTITY_CONFIGS}
      />
    );
  }

  const { rows } = await pool.query(`SELECT * FROM ${entity} WHERE id = $1`, [id]);
  if (!rows[0]) notFound();

  // Fetch all relationships for this entity
  const { rows: relRows } = await pool.query(
    `SELECT * FROM entity_relationships
     WHERE (entity_type_a = $1 AND entity_id_a = $2)
        OR (entity_type_b = $1 AND entity_id_b = $2)`,
    [entity, id]
  );

  // Fetch tags for this record
  const { rows: tagRows } = await pool.query(
    `SELECT t.id, t.name FROM tags t
     JOIN entity_tags et ON et.tag_id = t.id
     WHERE et.entity_type = $1 AND et.entity_id = $2
     ORDER BY t.name ASC`,
    [entity, id]
  );

  // Enrich with names
  const relationships = await Promise.all(
    relRows.map(async (rel) => {
      const isA = rel.entity_type_a === entity && rel.entity_id_a === id;
      const relatedType = isA ? rel.entity_type_b : rel.entity_type_a;
      const relatedId = isA ? rel.entity_id_b : rel.entity_id_a;
      const { rows: nameRows } = await pool.query(
        `SELECT id, name FROM ${relatedType} WHERE id = $1`,
        [relatedId]
      );
      return {
        relationship_id: rel.id,
        entity_type: relatedType,
        entity_id: relatedId,
        name: nameRows[0]?.name ?? "Unknown",
        relationship_type: rel.relationship_type ?? null,
        notes: rel.notes ?? null,
      };
    })
  );

  return (
    <EntityDetailClient
      config={config}
      record={rows[0]}
      relationships={relationships}
      initialTags={tagRows}
      allConfigs={ENTITY_CONFIGS}
    />
  );
}
