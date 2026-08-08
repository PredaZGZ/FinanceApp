-- Extend user accounts with editable profile and preference data.
ALTER TABLE "users"
ADD COLUMN "name" VARCHAR(100),
ADD COLUMN "avatarIcon" VARCHAR(32) NOT NULL DEFAULT 'user-round',
ADD COLUMN "avatarColor" VARCHAR(24) NOT NULL DEFAULT 'slate',
ADD COLUMN "locale" VARCHAR(10) NOT NULL DEFAULT 'es-ES',
ADD COLUMN "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
ADD COLUMN "preferredCurrency" "Currency" NOT NULL DEFAULT 'EUR',
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
