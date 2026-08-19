DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('user','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "profilePicture" TEXT,
  "phoneNumber" TEXT,
  "dateOfBirth" TEXT,
  "role" "Role" NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "login_logs" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "device" TEXT,
  "userAgent" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "login_logs_userId_idx" ON "login_logs"("userId");
CREATE INDEX IF NOT EXISTS "login_logs_timestamp_idx" ON "login_logs"("timestamp");

CREATE TABLE IF NOT EXISTS "notes" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notes_createdById_idx" ON "notes"("createdById");

CREATE TABLE IF NOT EXISTS "events" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "images" JSONB NOT NULL DEFAULT '[]',
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "location" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "events_createdById_idx" ON "events"("createdById");

-- Shared realtime document + durable audit trail
CREATE TABLE IF NOT EXISTS "shared_state" (
  "id" TEXT PRIMARY KEY DEFAULT 'hub',
  "data" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "ipAddress" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "activity_logs_userId_idx" ON "activity_logs"("userId");
CREATE INDEX IF NOT EXISTS "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- Monitoring detail columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "login_logs" ADD COLUMN IF NOT EXISTS "event" TEXT NOT NULL DEFAULT 'sign_in';
ALTER TABLE "login_logs" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE "login_logs" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "login_logs" ADD COLUMN IF NOT EXISTS "detail" TEXT;
ALTER TABLE "login_logs" ADD COLUMN IF NOT EXISTS "name" TEXT;
CREATE INDEX IF NOT EXISTS "login_logs_event_idx" ON "login_logs"("event");
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Reversible password storage (admin-recoverable, AES-256-GCM ciphertext)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordCipher" TEXT;
