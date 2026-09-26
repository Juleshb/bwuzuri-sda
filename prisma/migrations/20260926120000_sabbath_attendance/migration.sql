CREATE TABLE "SabbathAttendance" (
  "id" SERIAL NOT NULL,
  "churchId" INTEGER NOT NULL,
  "sectionId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "memberId" INTEGER NOT NULL,
  "entryDate" DATE NOT NULL,
  "present" BOOLEAN NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SabbathAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SabbathAttendance_memberId_entryDate_key" ON "SabbathAttendance"("memberId", "entryDate");
CREATE INDEX "SabbathAttendance_groupId_entryDate_idx" ON "SabbathAttendance"("groupId", "entryDate");
CREATE INDEX "SabbathAttendance_churchId_entryDate_idx" ON "SabbathAttendance"("churchId", "entryDate");
CREATE INDEX "SabbathAttendance_sectionId_entryDate_idx" ON "SabbathAttendance"("sectionId", "entryDate");

ALTER TABLE "SabbathAttendance" ADD CONSTRAINT "SabbathAttendance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SabbathAttendance" ADD CONSTRAINT "SabbathAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
