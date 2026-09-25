-- Build 0.17 baseline migration.
-- Creates the database objects that existed before the later Phase 17/19 additive migrations.

CREATE TABLE "Church" (
  "id" SERIAL NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Church_name_key" ON "Church"("name");

CREATE TABLE "Section" (
  "id" SERIAL NOT NULL, "churchId" INTEGER NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Section_churchId_name_key" ON "Section"("churchId", "name");

CREATE TABLE "Group" (
  "id" SERIAL NOT NULL, "sectionId" INTEGER NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Group_sectionId_name_key" ON "Group"("sectionId", "name");

CREATE TABLE "Member" (
  "id" SERIAL NOT NULL, "syncId" TEXT NOT NULL, "groupId" INTEGER NOT NULL, "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Member_syncId_key" ON "Member"("syncId");
CREATE UNIQUE INDEX "Member_phoneNumber_key" ON "Member"("phoneNumber");

CREATE TABLE "User" (
  "id" SERIAL NOT NULL, "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "fullName" TEXT NOT NULL,
  "role" TEXT NOT NULL, "churchId" INTEGER, "sectionId" INTEGER, "groupId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3), CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "ContributionType" (
  "id" SERIAL NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContributionType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContributionType_name_key" ON "ContributionType"("name");

CREATE TABLE "Contribution" (
  "id" BIGSERIAL NOT NULL, "syncId" TEXT NOT NULL, "churchId" INTEGER NOT NULL, "memberId" INTEGER,
  "sectionIdAtEntry" INTEGER, "groupIdAtEntry" INTEGER, "contributionTypeId" INTEGER NOT NULL,
  "amountRwf" BIGINT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL, "submissionId" TEXT NOT NULL, "submissionItemIndex" INTEGER NOT NULL DEFAULT 0,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false, "cancellationReason" TEXT, "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contribution_syncId_key" ON "Contribution"("syncId");
CREATE UNIQUE INDEX "Contribution_submissionId_submissionItemIndex_key" ON "Contribution"("submissionId", "submissionItemIndex");

CREATE TABLE "ExpenseType" (
  "id" SERIAL NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpenseType_name_key" ON "ExpenseType"("name");

CREATE TABLE "Expense" (
  "id" SERIAL NOT NULL, "syncId" TEXT NOT NULL, "churchId" INTEGER, "expenseTypeId" INTEGER NOT NULL,
  "amountRwf" BIGINT NOT NULL, "paidOn" TIMESTAMP(3) NOT NULL, "description" TEXT NOT NULL,
  "payee" TEXT NOT NULL DEFAULT '', "reference" TEXT NOT NULL DEFAULT '', "submissionId" TEXT NOT NULL,
  "createdByUserId" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false, "cancellationReason" TEXT, "cancelledByUserId" INTEGER,
  "cancelledAt" TIMESTAMP(3), CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Expense_syncId_key" ON "Expense"("syncId");
CREATE UNIQUE INDEX "Expense_submissionId_key" ON "Expense"("submissionId");

CREATE TABLE "AssetCategory" (
  "id" SERIAL NOT NULL, "name" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");

CREATE TABLE "Asset" (
  "id" SERIAL NOT NULL, "syncId" TEXT NOT NULL, "churchId" INTEGER, "assetCategoryId" INTEGER NOT NULL,
  "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "valueRwf" BIGINT, "location" TEXT NOT NULL DEFAULT '',
  "custodian" TEXT NOT NULL DEFAULT '', "condition" TEXT NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true, "revision" INTEGER NOT NULL DEFAULT 1, "submissionId" TEXT NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Asset_syncId_key" ON "Asset"("syncId");
CREATE UNIQUE INDEX "Asset_submissionId_key" ON "Asset"("submissionId");

CREATE TABLE "Budget" (
  "id" SERIAL NOT NULL, "syncId" TEXT NOT NULL, "name" TEXT NOT NULL, "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'Draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Budget_syncId_key" ON "Budget"("syncId");

CREATE TABLE "BudgetMetric" (
  "id" SERIAL NOT NULL, "budgetId" INTEGER NOT NULL, "name" TEXT NOT NULL, "unit" TEXT NOT NULL,
  "targetQuantity" BIGINT NOT NULL, "unitPriceRwf" BIGINT, "contributionTypeId" INTEGER,
  CONSTRAINT "BudgetMetric_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BudgetChurchAllocation" (
  "id" SERIAL NOT NULL, "budgetMetricId" INTEGER NOT NULL, "churchId" INTEGER NOT NULL, "targetValue" BIGINT NOT NULL,
  CONSTRAINT "BudgetChurchAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BudgetChurchAllocation_budgetMetricId_churchId_key" ON "BudgetChurchAllocation"("budgetMetricId", "churchId");
CREATE TABLE "BudgetSectionAllocation" (
  "id" SERIAL NOT NULL, "budgetMetricId" INTEGER NOT NULL, "sectionId" INTEGER NOT NULL, "targetValue" BIGINT NOT NULL,
  CONSTRAINT "BudgetSectionAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BudgetSectionAllocation_budgetMetricId_sectionId_key" ON "BudgetSectionAllocation"("budgetMetricId", "sectionId");
CREATE TABLE "BudgetGroupAllocation" (
  "id" SERIAL NOT NULL, "budgetMetricId" INTEGER NOT NULL, "groupId" INTEGER NOT NULL, "targetValue" BIGINT NOT NULL,
  CONSTRAINT "BudgetGroupAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BudgetGroupAllocation_budgetMetricId_groupId_key" ON "BudgetGroupAllocation"("budgetMetricId", "groupId");
CREATE TABLE "BudgetMemberAllocation" (
  "id" SERIAL NOT NULL, "budgetMetricId" INTEGER NOT NULL, "groupId" INTEGER NOT NULL, "memberId" INTEGER NOT NULL, "targetValue" BIGINT NOT NULL,
  CONSTRAINT "BudgetMemberAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BudgetMemberAllocation_budgetMetricId_memberId_key" ON "BudgetMemberAllocation"("budgetMetricId", "memberId");
CREATE TABLE "BudgetAchievement" (
  "id" BIGSERIAL NOT NULL, "budgetMetricId" INTEGER NOT NULL, "churchId" INTEGER NOT NULL, "sectionId" INTEGER,
  "groupId" INTEGER, "memberId" INTEGER, "quantity" BIGINT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdByUserId" INTEGER NOT NULL,
  CONSTRAINT "BudgetAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SabbathSchoolEntry" (
  "id" SERIAL NOT NULL, "syncId" TEXT NOT NULL, "churchId" INTEGER NOT NULL, "sectionId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL, "entryDateUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL, "payloadJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "SabbathSchoolEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SabbathSchoolEntry_syncId_key" ON "SabbathSchoolEntry"("syncId");

CREATE TABLE "SyncOutboxItem" (
  "id" BIGSERIAL NOT NULL, "operationId" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entitySyncId" TEXT NOT NULL,
  "operation" TEXT NOT NULL, "payloadJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncedAt" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
  CONSTRAINT "SyncOutboxItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncOutboxItem_operationId_key" ON "SyncOutboxItem"("operationId");
CREATE TABLE "SyncReceipt" (
  "id" BIGSERIAL NOT NULL, "operationId" TEXT NOT NULL, "appliedAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceDeviceId" TEXT, CONSTRAINT "SyncReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncReceipt_operationId_key" ON "SyncReceipt"("operationId");

ALTER TABLE "Section" ADD CONSTRAINT "Section_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Member" ADD CONSTRAINT "Member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_contributionTypeId_fkey" FOREIGN KEY ("contributionTypeId") REFERENCES "ContributionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseTypeId_fkey" FOREIGN KEY ("expenseTypeId") REFERENCES "ExpenseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetCategoryId_fkey" FOREIGN KEY ("assetCategoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetMetric" ADD CONSTRAINT "BudgetMetric_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetMetric" ADD CONSTRAINT "BudgetMetric_contributionTypeId_fkey" FOREIGN KEY ("contributionTypeId") REFERENCES "ContributionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetChurchAllocation" ADD CONSTRAINT "BudgetChurchAllocation_budgetMetricId_fkey" FOREIGN KEY ("budgetMetricId") REFERENCES "BudgetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetSectionAllocation" ADD CONSTRAINT "BudgetSectionAllocation_budgetMetricId_fkey" FOREIGN KEY ("budgetMetricId") REFERENCES "BudgetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetGroupAllocation" ADD CONSTRAINT "BudgetGroupAllocation_budgetMetricId_fkey" FOREIGN KEY ("budgetMetricId") REFERENCES "BudgetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetMemberAllocation" ADD CONSTRAINT "BudgetMemberAllocation_budgetMetricId_fkey" FOREIGN KEY ("budgetMetricId") REFERENCES "BudgetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetAchievement" ADD CONSTRAINT "BudgetAchievement_budgetMetricId_fkey" FOREIGN KEY ("budgetMetricId") REFERENCES "BudgetMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
