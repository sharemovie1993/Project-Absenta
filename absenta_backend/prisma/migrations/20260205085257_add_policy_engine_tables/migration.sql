-- AlterTable
ALTER TABLE "StudentCardConfig" ADD COLUMN     "border_color" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN     "border_width" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "card_height" DOUBLE PRECISION NOT NULL DEFAULT 54,
ADD COLUMN     "card_title_font_size" DOUBLE PRECISION NOT NULL DEFAULT 14,
ADD COLUMN     "card_width" DOUBLE PRECISION NOT NULL DEFAULT 85.6,
ADD COLUMN     "data_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "data_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "footer_bg_color" TEXT,
ADD COLUMN     "footer_height" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "header_bg_color" TEXT,
ADD COLUMN     "header_font_size" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "header_height" DOUBLE PRECISION NOT NULL DEFAULT 18,
ADD COLUMN     "header_text_color" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "photo_height" DOUBLE PRECISION NOT NULL DEFAULT 32,
ADD COLUMN     "photo_width" DOUBLE PRECISION NOT NULL DEFAULT 24,
ADD COLUMN     "print_auto_center_x" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "print_auto_center_y" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "print_custom_height" DOUBLE PRECISION,
ADD COLUMN     "print_custom_width" DOUBLE PRECISION,
ADD COLUMN     "print_gap_x" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "print_gap_y" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "print_margin_bottom" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "print_margin_left" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "print_margin_right" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "print_margin_top" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "print_mode" TEXT NOT NULL DEFAULT 'multi',
ADD COLUMN     "print_orientation" TEXT NOT NULL DEFAULT 'portrait',
ADD COLUMN     "print_paper_size" TEXT NOT NULL DEFAULT 'A4',
ADD COLUMN     "qrcode_height" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "qrcode_width" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "school_address" TEXT,
ADD COLUMN     "school_address_font_size" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "school_name" TEXT,
ADD COLUMN     "school_name_font_size" DOUBLE PRECISION NOT NULL DEFAULT 12,
ADD COLUMN     "show_border" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "student_details_font_size" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "student_name_font_size" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "subheader_font_size" DOUBLE PRECISION NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "logo_url" TEXT;

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrukturPermission" (
    "id" TEXT NOT NULL,
    "struktur_organisasi_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrukturPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Permission_group_idx" ON "Permission"("group");

-- CreateIndex
CREATE INDEX "StrukturPermission_struktur_organisasi_id_idx" ON "StrukturPermission"("struktur_organisasi_id");

-- CreateIndex
CREATE UNIQUE INDEX "StrukturPermission_struktur_organisasi_id_permission_id_key" ON "StrukturPermission"("struktur_organisasi_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_id_permission_id_key" ON "RolePermission"("role_id", "permission_id");

-- AddForeignKey
ALTER TABLE "StrukturPermission" ADD CONSTRAINT "StrukturPermission_struktur_organisasi_id_fkey" FOREIGN KEY ("struktur_organisasi_id") REFERENCES "StrukturOrganisasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrukturPermission" ADD CONSTRAINT "StrukturPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
