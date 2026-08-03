-- Expose tasks in public schema view so PostgREST Data API can query tasks seamlessly
CREATE OR REPLACE VIEW public.tasks AS 
SELECT * FROM tenant_shared.tasks;

-- Grant access rights to standard Supabase API roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated, service_role;
