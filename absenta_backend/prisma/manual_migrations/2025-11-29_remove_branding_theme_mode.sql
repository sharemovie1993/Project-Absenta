-- Remove theme_mode column from Branding table to make topbar the single source of truth
ALTER TABLE "Branding" DROP COLUMN IF EXISTS "theme_mode";
