ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "tagline" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "primary_color" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "secondary_color" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "accent_color" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "favicon_url" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "footer_text" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "support_email" text;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "support_phone" text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Branding') THEN
    INSERT INTO "SystemConfig" (
      tenant_id, tagline, description, primary_color, secondary_color, accent_color,
      favicon_url, logo_url, footer_text, support_email, support_phone
    )
    SELECT 
      b.tenant_id, b.tagline, b.description, b.primary_color, b.secondary_color, b.accent_color,
      b.favicon_url, b.logo_url, b.footer_text, b.support_email, b.support_phone
    FROM "Branding" b
    WHERE NOT EXISTS (
      SELECT 1 FROM "SystemConfig" s WHERE s.tenant_id = b.tenant_id
    );

    UPDATE "SystemConfig" s
    SET 
      tagline = COALESCE(s.tagline, b.tagline),
      description = COALESCE(s.description, b.description),
      primary_color = COALESCE(s.primary_color, b.primary_color),
      secondary_color = COALESCE(s.secondary_color, b.secondary_color),
      accent_color = COALESCE(s.accent_color, b.accent_color),
      favicon_url = COALESCE(s.favicon_url, b.favicon_url),
      logo_url = COALESCE(s.logo_url, b.logo_url),
      footer_text = COALESCE(s.footer_text, b.footer_text),
      support_email = COALESCE(s.support_email, b.support_email),
      support_phone = COALESCE(s.support_phone, b.support_phone)
    FROM "Branding" b
    WHERE s.tenant_id = b.tenant_id;
  END IF;
END
$$;
