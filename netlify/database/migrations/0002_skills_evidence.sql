-- CreateTable
CREATE TABLE "SkillEvidence" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "bullet" TEXT,
    "bulletReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillEvidence_opportunityId_idx" ON "SkillEvidence"("opportunityId");

-- AddForeignKey
ALTER TABLE "SkillEvidence" ADD CONSTRAINT "SkillEvidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
