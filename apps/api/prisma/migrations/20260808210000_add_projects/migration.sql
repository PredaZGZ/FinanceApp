CREATE TYPE "ProjectEntryType" AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "type" "ProjectEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "projects_userId_idx" ON "projects"("userId");
CREATE INDEX "project_entries_projectId_idx" ON "project_entries"("projectId");
CREATE INDEX "project_entries_projectId_date_idx" ON "project_entries"("projectId", "date");

ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_entries" ADD CONSTRAINT "project_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
