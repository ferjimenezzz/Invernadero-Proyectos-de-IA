-- =============================================================================
--  STUB DE SUPABASE · SOLO PARA POSTGRESQL LOCAL (nunca correr en Supabase)
--  Crea lo mínimo que usan supabase.sql y las pruebas: roles anon / authenticated /
--  service_role, el esquema auth con auth.users y auth.uid() / auth.role() / auth.jwt(),
--  y la publicación supabase_realtime. Idempotente.
--  También va antes de restaurar un respaldo (pg_dump -n inv) en local.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email              text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);

-- Igual que Supabase: los datos del JWT llegan en request.jwt.claims (o el viejo request.jwt.claim.*)
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                    nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')::text
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role() TO anon, authenticated, service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;
