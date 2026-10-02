-- CRE-21: scope AI conversations to an organization.
--
-- Review before running. Nothing in this repo applies this file automatically.
-- Do not run it against a shared database until that review is done.
--
-- Existing rows were created with no owner. This migration does not assign
-- them to an org and does not delete them. They stay NULL. Application
-- queries compare org_id to the session org, so NULL rows are not readable
-- or deletable through the API.
--
-- NOT NULL is intentionally not applied. There is no column to backfill
-- from. After those rows are deleted or assigned by hand, enforce NOT NULL.
-- The Drizzle schema already declares org_id NOT NULL so a brand-new
-- database gets the constraint. drizzle-kit push against a database that
-- still has NULL org_id will refuse until that follow-up; do not use
-- push-force to skip it.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS org_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_org_id_organizations_id_fk'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_org_id_organizations_id_fk
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conversations_org_id_idx ON conversations (org_id);
