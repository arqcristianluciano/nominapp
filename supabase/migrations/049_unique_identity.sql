-- 046_unique_identity.sql
-- Data-integrity: enforce uniqueness on identity columns.
--
-- These columns are nullable and many rows are NULL. We use PARTIAL UNIQUE
-- INDEXES (WHERE <col> IS NOT NULL) so multiple NULLs are allowed while every
-- non-null value must be unique. All statements are idempotent
-- (CREATE UNIQUE INDEX IF NOT EXISTS).
--
-- Verified against project pkllcsexipdvwdpunlkz: zero current duplicates for
-- every column below (including a case-insensitive lower(email) check).
--
-- email: kept as a plain (case-sensitive) unique index. The app does not use
-- user_profiles.email for login lookups (auth goes through auth.users via
-- authService.ts, which calls signIn with email = username.trim(), no
-- lowercasing). No lower(email) usage exists anywhere in the codebase, and
-- there are zero case-insensitive collisions, so a plain unique index avoids
-- breaking existing lookups. Revisit with lower(email) only if login is later
-- normalized to be case-insensitive.

-- user_profiles.cedula
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_user_profiles_cedula
  ON public.user_profiles (cedula)
  WHERE cedula IS NOT NULL;

-- user_profiles.email
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_user_profiles_email
  ON public.user_profiles (email)
  WHERE email IS NOT NULL;

-- companies.rnc
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_companies_rnc
  ON public.companies (rnc)
  WHERE rnc IS NOT NULL;

-- contractors.cedula
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_contractors_cedula
  ON public.contractors (cedula)
  WHERE cedula IS NOT NULL;

-- suppliers.rnc
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_suppliers_rnc
  ON public.suppliers (rnc)
  WHERE rnc IS NOT NULL;
