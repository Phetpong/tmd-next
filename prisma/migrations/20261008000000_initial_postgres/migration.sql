CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RainfallRecord" (
  "id" SERIAL NOT NULL,
  "date" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RainfallRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "RainfallRecord_date_stationId_key" ON "RainfallRecord"("date", "stationId");

-- Only the server-side Prisma connection should access these tables.
-- No policies grant Supabase anon/authenticated clients direct access.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RainfallRecord" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "User", "RainfallRecord" FROM anon;
    REVOKE ALL ON SEQUENCE "User_id_seq", "RainfallRecord_id_seq" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "User", "RainfallRecord" FROM authenticated;
    REVOKE ALL ON SEQUENCE "User_id_seq", "RainfallRecord_id_seq" FROM authenticated;
  END IF;
END $$;
