import { prisma } from '../src/utils/prisma';

async function main() {
  console.log('--- Initializing Public School Web Tables ---');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PublicSchoolArticle" (
      "id" TEXT PRIMARY KEY,
      "tenant_id" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "excerpt" TEXT,
      "content" TEXT NOT NULL,
      "cover_image" TEXT,
      "category" TEXT NOT NULL DEFAULT 'BERITA',
      "author_name" TEXT NOT NULL DEFAULT 'Humas Sekolah',
      "published_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      "is_published" BOOLEAN NOT NULL DEFAULT TRUE,
      "event_date" TIMESTAMPTZ,
      "views_count" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "fk_public_article_tenant" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_public_article_tenant_slug" ON "PublicSchoolArticle"("tenant_id", "slug");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_public_article_tenant_pub" ON "PublicSchoolArticle"("tenant_id", "is_published", "published_at");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_public_article_tenant_cat" ON "PublicSchoolArticle"("tenant_id", "category");
  `);

  console.log('✅ Table "PublicSchoolArticle" created or verified successfully!');

  // Check count
  const count = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM "PublicSchoolArticle";`);
  console.log('Current article count:', count[0]?.count ?? 0);

  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
