-- Phase 19: idempotency keys for offline-capable create operations.
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "submissionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Member_submissionId_key" ON "Member"("submissionId");
ALTER TABLE "Budget" ADD COLUMN IF NOT EXISTS "submissionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_submissionId_key" ON "Budget"("submissionId");
ALTER TABLE "SabbathSchoolEntry" ADD COLUMN IF NOT EXISTS "submissionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "SabbathSchoolEntry_submissionId_key" ON "SabbathSchoolEntry"("submissionId");
