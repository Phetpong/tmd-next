-- Generated with prisma migrate diff; backend-only configuration.
CREATE TABLE "ReportAppearance" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "path" TEXT,
  "positionX" INTEGER NOT NULL DEFAULT 50,
  "positionY" INTEGER NOT NULL DEFAULT 50,
  "wash" INTEGER NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ReportAppearance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportAppearance_controls_check" CHECK (
    "positionX" BETWEEN 0 AND 100 AND "positionY" BETWEEN 0 AND 100
    AND "wash" BETWEEN 0 AND 100 AND "revision" >= 0
  )
);
ALTER TABLE "ReportAppearance" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "ReportAppearance" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "ReportAppearance" FROM authenticated;
  END IF;
END $$;
