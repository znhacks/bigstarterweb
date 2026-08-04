-- Migration file: Create school monitoring tables
-- Digunakan untuk memantau log aktivitas mobile app, pengguna/guru, dan jurnal mengajar per school_code.

CREATE TABLE IF NOT EXISTS public.school_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) DEFAULT 'Guru',
    activity_type VARCHAR(100) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    status VARCHAR(50) DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_activity_logs_code ON public.school_activity_logs(school_code);

CREATE TABLE IF NOT EXISTS public.school_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    nip VARCHAR(100),
    subject VARCHAR(100),
    role VARCHAR(100) DEFAULT 'Guru Pengajar',
    status VARCHAR(50) DEFAULT 'aktif',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_users_code ON public.school_users(school_code);

CREATE TABLE IF NOT EXISTS public.school_journal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_code VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teaching_date DATE DEFAULT CURRENT_DATE,
    start_time VARCHAR(10) DEFAULT '07:00',
    end_time VARCHAR(10) DEFAULT '08:30',
    topic TEXT,
    attendance_summary VARCHAR(100) DEFAULT 'Hadir: 32, Izin: 0, Sakit: 0, Alfa: 0',
    status VARCHAR(50) DEFAULT 'terverifikasi',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_journal_logs_code ON public.school_journal_logs(school_code);

ALTER TABLE public.school_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_journal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_activity_logs_select" ON public.school_activity_logs;
CREATE POLICY "school_activity_logs_select" ON public.school_activity_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "school_users_select" ON public.school_users;
CREATE POLICY "school_users_select" ON public.school_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "school_journal_logs_select" ON public.school_journal_logs;
CREATE POLICY "school_journal_logs_select" ON public.school_journal_logs FOR SELECT TO authenticated USING (true);
