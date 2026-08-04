-- Fix constraint pada tabel memberships:
-- Hapus UNIQUE constraint tunggal pada tenant_id dan user_id yang mencegah tenant memiliki lebih dari 1 anggota.
-- Ganti dengan composite UNIQUE (user_id, tenant_id) agar 1 pengguna tidak bisa bergabung ke tenant yang sama dua kali,
-- namun satu tenant dapat memiliki banyak anggota.

ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_tenant_id_key;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'memberships_user_id_tenant_id_key'
        AND table_name = 'memberships'
    ) THEN
        ALTER TABLE public.memberships ADD CONSTRAINT memberships_user_id_tenant_id_key UNIQUE (user_id, tenant_id);
    END IF;
END $$;
