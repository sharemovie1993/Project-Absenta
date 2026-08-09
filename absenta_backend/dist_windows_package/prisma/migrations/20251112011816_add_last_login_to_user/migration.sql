-- AlterTable
ALTER TABLE "User" ADD COLUMN     "last_login" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_tenant_id_last_login_idx" ON "User"("tenant_id", "last_login");
