-- AlterTable
ALTER TABLE "tenant_upgrade_score_monthly" ADD COLUMN     "risk_cutoff_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "risk_level_snapshot" TEXT NOT NULL DEFAULT 'HEALTHY',
ADD COLUMN     "snapshot_created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "snapshot_version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "upgrade_funnel_monthly" ADD COLUMN     "snapshot_created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "snapshot_version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "upgrade_intelligence_job_lock" ALTER COLUMN "id" DROP DEFAULT;
