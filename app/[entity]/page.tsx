export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import pool from "@/lib/db";
import { getEntityConfig, ENTITY_TYPES } from "@/lib/entities";
import EntityListClient from "@/components/EntityListClient";

type Props = { params: Promise<{ entity: string }> };

export async function generateStaticParams() {
  return ENTITY_TYPES.map((type) => ({ entity: type }));
}

export default async function EntityListPage({ params }: Props) {
  const { entity } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const { rows } = await pool.query(
    `SELECT id, name, description FROM ${entity} ORDER BY name ASC`
  );

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">
            {config.labelPlural}
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {rows.length} {rows.length === 1 ? config.label.toLowerCase() : config.labelPlural.toLowerCase()}
          </p>
        </div>
        <Link
          href={`/${entity}/new`}
          className="px-4 py-2 bg-[var(--color-sidebar)] text-white text-sm rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
        >
          + New {config.label}
        </Link>
      </div>

      <EntityListClient
        rows={rows}
        entity={entity}
        label={config.label}
        labelPlural={config.labelPlural}
        color={config.color}
      />
    </div>
  );
}
