export const dynamic = "force-dynamic";

import pool from "@/lib/db";
import { ENTITY_CONFIGS } from "@/lib/entities";
import ReferencesClient from "@/components/ReferencesClient";

export default async function ReferencesPage() {
  const { rows } = await pool.query(`
    SELECT a.id, a.label, a.file_key, a.file_type, a.created_at,
           COALESCE(
             json_agg(
               json_build_object('entity_type', ea.entity_type, 'entity_id', ea.entity_id)
             ) FILTER (WHERE ea.id IS NOT NULL),
             '[]'
           ) AS entities
    FROM attachments a
    LEFT JOIN entity_attachments ea ON ea.attachment_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);

  // Enrich entity stubs with names
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const entities = await Promise.all(
        (row.entities as { entity_type: string; entity_id: string }[]).map(async (e) => {
          const config = ENTITY_CONFIGS.find((c) => c.type === e.entity_type);
          if (!config) return null;
          const { rows: nr } = await pool.query(
            `SELECT id, name FROM ${e.entity_type} WHERE id = $1`,
            [e.entity_id]
          );
          if (!nr[0]) return null;
          return { entity_type: e.entity_type, entity_id: e.entity_id, name: nr[0].name, config };
        })
      );
      return { ...row, entities: entities.filter(Boolean) };
    })
  );

  return <ReferencesClient initialAttachments={enriched} allConfigs={ENTITY_CONFIGS} />;
}
