BEGIN;

CREATE TABLE "OrganizationalPosition" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "unit_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationalAssignment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kelas_id" TEXT,
    "unit_id" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationalCapability" (
    "id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationalPosition_tenant_id_code_key" ON "OrganizationalPosition"("tenant_id", "code");
CREATE INDEX "OrganizationalPosition_tenant_id_idx" ON "OrganizationalPosition"("tenant_id");
CREATE INDEX "OrganizationalPosition_code_idx" ON "OrganizationalPosition"("code");

CREATE UNIQUE INDEX "OrganizationalAssignment_user_id_position_id_kelas_id_key" ON "OrganizationalAssignment"("user_id", "position_id", "kelas_id");
CREATE INDEX "OrganizationalAssignment_tenant_id_idx" ON "OrganizationalAssignment"("tenant_id");
CREATE INDEX "OrganizationalAssignment_user_id_idx" ON "OrganizationalAssignment"("user_id");
CREATE INDEX "OrganizationalAssignment_position_id_idx" ON "OrganizationalAssignment"("position_id");
CREATE INDEX "OrganizationalAssignment_kelas_id_idx" ON "OrganizationalAssignment"("kelas_id");

CREATE UNIQUE INDEX "OrganizationalCapability_position_id_permission_id_key" ON "OrganizationalCapability"("position_id", "permission_id");
CREATE INDEX "OrganizationalCapability_position_id_idx" ON "OrganizationalCapability"("position_id");
CREATE INDEX "OrganizationalCapability_permission_id_idx" ON "OrganizationalCapability"("permission_id");

ALTER TABLE "OrganizationalPosition" ADD CONSTRAINT "OrganizationalPosition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationalAssignment" ADD CONSTRAINT "OrganizationalAssignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationalAssignment" ADD CONSTRAINT "OrganizationalAssignment_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "OrganizationalPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationalAssignment" ADD CONSTRAINT "OrganizationalAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationalAssignment" ADD CONSTRAINT "OrganizationalAssignment_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrganizationalCapability" ADD CONSTRAINT "OrganizationalCapability_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "OrganizationalPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationalCapability" ADD CONSTRAINT "OrganizationalCapability_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration (legacy StrukturOrganisasi -> new Organizational*)

WITH position_seed AS (
  SELECT
    tenant_id,
    kode AS code,
    (ARRAY_AGG(id ORDER BY (kelas_id IS NULL) DESC, created_at ASC))[1] AS id,
    (ARRAY_AGG(nama ORDER BY (kelas_id IS NULL) DESC, created_at ASC))[1] AS name,
    (ARRAY_AGG(scope ORDER BY (kelas_id IS NULL) DESC, created_at ASC))[1] AS scope_type,
    BOOL_OR(kelas_id IS NOT NULL) AS has_kelas,
    BOOL_OR(is_active) AS is_active,
    MIN(created_at) AS created_at,
    MAX(updated_at) AS updated_at
  FROM "StrukturOrganisasi"
  GROUP BY tenant_id, kode
)
INSERT INTO "OrganizationalPosition" ("id", "tenant_id", "code", "name", "scope_type", "unit_type", "is_active", "created_at", "updated_at")
SELECT
  id,
  tenant_id,
  code,
  name,
  scope_type,
  CASE WHEN has_kelas THEN 'kelas' ELSE NULL END AS unit_type,
  is_active,
  created_at,
  updated_at
FROM position_seed
ON CONFLICT ("tenant_id", "code") DO NOTHING;

INSERT INTO "OrganizationalCapability" ("id", "position_id", "permission_id", "conditions", "created_at")
SELECT
  sp.id,
  op.id,
  sp.permission_id,
  sp.conditions,
  sp.created_at
FROM "StrukturPermission" sp
JOIN "StrukturOrganisasi" so ON so.id = sp.struktur_organisasi_id
JOIN "OrganizationalPosition" op ON op.tenant_id = so.tenant_id AND op.code = so.kode
ON CONFLICT ("position_id", "permission_id") DO NOTHING;

INSERT INTO "OrganizationalAssignment" ("id", "tenant_id", "position_id", "user_id", "kelas_id", "unit_id", "start_date", "end_date", "is_active", "created_at", "updated_at")
SELECT
  gso.id,
  gso.tenant_id,
  op.id,
  g.user_id,
  so.kelas_id,
  NULL,
  gso.start_date,
  gso.end_date,
  gso.is_active,
  gso.created_at,
  gso.updated_at
FROM "GuruStrukturOrganisasi" gso
JOIN "Guru" g ON g.id = gso.guru_id
JOIN "StrukturOrganisasi" so ON so.id = gso.struktur_organisasi_id
JOIN "OrganizationalPosition" op ON op.tenant_id = so.tenant_id AND op.code = so.kode
ON CONFLICT ("user_id", "position_id", "kelas_id") DO NOTHING;

INSERT INTO "OrganizationalAssignment" ("id", "tenant_id", "position_id", "user_id", "kelas_id", "unit_id", "start_date", "end_date", "is_active", "created_at", "updated_at")
SELECT
  sso.id,
  sso.tenant_id,
  op.id,
  s.user_id,
  COALESCE(sso.kelas_id, so.kelas_id),
  NULL,
  sso.start_date,
  sso.end_date,
  sso.is_active,
  sso.created_at,
  sso.updated_at
FROM "SiswaStrukturOrganisasi" sso
JOIN "Siswa" s ON s.id = sso.siswa_id
JOIN "StrukturOrganisasi" so ON so.id = sso.struktur_organisasi_id
JOIN "OrganizationalPosition" op ON op.tenant_id = so.tenant_id AND op.code = so.kode
ON CONFLICT ("user_id", "position_id", "kelas_id") DO NOTHING;

COMMIT;

