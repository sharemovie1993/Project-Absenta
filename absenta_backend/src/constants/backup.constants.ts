import { Prisma } from '@prisma/client';

/**
 * Dynamically discovers all models in Prisma schema that contain a tenant reference
 * (e.g. tenant_id or actor_tenant_id) and orders them by relational dependency graph
 * (parent models first, child dependent models last).
 * 
 * Fully dynamic: Whenever schema.prisma is updated with new models/fields,
 * this function automatically incorporates them into the backup/restore engine!
 */
export function getDynamicTenantModels(): string[] {
  const dmmfModels = Prisma.dmmf.datamodel.models;
  const ignoreModels = new Set(['Tenant', 'TenantBackup']);

  // Find all models that have tenant_id or actor_tenant_id or restored_to_tenant_id
  const tenantModelNames = new Set<string>();

  for (const m of dmmfModels) {
    if (ignoreModels.has(m.name)) continue;
    const hasTenantField = m.fields.some(
      f => f.name === 'tenant_id' || f.name === 'actor_tenant_id' || f.name === 'restored_to_tenant_id'
    );
    if (hasTenantField) {
      tenantModelNames.add(m.name);
    }
  }

  // Topological sort based on relational dependencies
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: string[] = [];

  function visit(modelName: string) {
    if (visited.has(modelName)) return;
    if (visiting.has(modelName)) return; // Prevent circular dependency deadlock

    visiting.add(modelName);

    const modelMeta = dmmfModels.find(m => m.name === modelName);
    if (modelMeta) {
      for (const field of modelMeta.fields) {
        // If field is a relation (pointing to another object model)
        if (field.kind === 'object' && field.type && tenantModelNames.has(field.type)) {
          // If this field owns the relation foreign keys (is relationFromFields owner)
          if (field.relationFromFields && field.relationFromFields.length > 0 && field.type !== modelName) {
            visit(field.type);
          }
        }
      }
    }

    visiting.delete(modelName);
    visited.add(modelName);
    sorted.push(modelName);
  }

  for (const modelName of tenantModelNames) {
    visit(modelName);
  }

  return sorted;
}

// Fallback static list for legacy type assertions if needed
export const TENANT_MODELS = getDynamicTenantModels();
