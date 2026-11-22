-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "cookieToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "selectedOpportunityId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "feasibilityScore" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "explanationJson" TEXT,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceUrl" TEXT,

    CONSTRAINT "PlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressEntry" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "source" TEXT NOT NULL DEFAULT 'live',
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opportunityTitle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "affiliation" TEXT NOT NULL,
    "reviewerCode" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "firstStep" TEXT NOT NULL,
    "usefulness" TEXT NOT NULL,
    "reportChanges" TEXT NOT NULL,
    "friction" TEXT NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneReminder" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdviserShare" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "opportunityId" TEXT,
    "snapshotJson" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdviserShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdviserFeedback" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "shareId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "practicality" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "milestoneSuggestion" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "nextStepDetails" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "AdviserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "completedWork" TEXT NOT NULL,
    "blockers" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "appliedRevision" TEXT,

    CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPathwayItem" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "career" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'To check',
    "notes" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planItemId" TEXT,

    CONSTRAINT "CareerPathwayItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_cookieToken_key" ON "Session"("cookieToken");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressEntry_planItemId_key" ON "ProgressEntry"("planItemId");

-- CreateIndex
CREATE INDEX "Evaluation_createdAt_idx" ON "Evaluation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneReminder_planItemId_key" ON "MilestoneReminder"("planItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AdviserShare_tokenHash_key" ON "AdviserShare"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPathwayItem_planItemId_key" ON "CareerPathwayItem"("planItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerPathwayItem_opportunityId_state_career_stepKey_key" ON "CareerPathwayItem"("opportunityId", "state", "career", "stepKey");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEntry" ADD CONSTRAINT "ProgressEntry_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReminder" ADD CONSTRAINT "MilestoneReminder_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdviserShare" ADD CONSTRAINT "AdviserShare_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdviserFeedback" ADD CONSTRAINT "AdviserFeedback_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdviserFeedback" ADD CONSTRAINT "AdviserFeedback_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "AdviserShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckIn" ADD CONSTRAINT "WeeklyCheckIn_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPathwayItem" ADD CONSTRAINT "CareerPathwayItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPathwayItem" ADD CONSTRAINT "CareerPathwayItem_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
