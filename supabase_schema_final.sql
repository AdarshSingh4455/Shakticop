-- ============================================================
-- SHAKTICOP FINAL UNIFIED SUPABASE SCHEMA (supabase_schema_final.sql)
-- UP Police Women Safety & e-Governance Portal
-- Production-Ready for a Brand-New Empty Supabase Project
-- ============================================================

-- ============================================================
-- 0. CLEANUP existing objects (Cascaded drops for idempotency)
-- ============================================================
DROP TABLE IF EXISTS module_history CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS ars_reports CASCADE;
DROP TABLE IF EXISTS mhd_requests CASCADE;
DROP TABLE IF EXISTS counselling_bookings CASCADE;
DROP TABLE IF EXISTS empowerment_applications CASCADE;
DROP TABLE IF EXISTS callback_requests CASCADE;
DROP TABLE IF EXISTS emergency_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS officers CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS schemes CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;

DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS generate_complaint_id CASCADE;
DROP FUNCTION IF EXISTS generate_ars_id CASCADE;
DROP FUNCTION IF EXISTS generate_mhd_id CASCADE;
DROP FUNCTION IF EXISTS generate_cns_id CASCADE;
DROP FUNCTION IF EXISTS generate_emp_id CASCADE;
DROP FUNCTION IF EXISTS generate_callback_id CASCADE;
DROP FUNCTION IF EXISTS generate_emergency_id CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

DROP SEQUENCE IF EXISTS complaint_seq CASCADE;
DROP SEQUENCE IF EXISTS ars_seq CASCADE;
DROP SEQUENCE IF EXISTS mhd_seq CASCADE;
DROP SEQUENCE IF EXISTS cns_seq CASCADE;
DROP SEQUENCE IF EXISTS emp_seq CASCADE;
DROP SEQUENCE IF EXISTS callback_seq CASCADE;
DROP SEQUENCE IF EXISTS emergency_seq CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SYSTEM TABLES CREATION
-- ============================================================

-- A. CATEGORIES TABLE
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. PROFILES TABLE
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. OFFICERS TABLE (Police + Counsellors directory)
CREATE TABLE officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    photo_url TEXT,
    mobile TEXT NOT NULL,
    designation TEXT NOT NULL,
    station TEXT NOT NULL,
    district TEXT NOT NULL DEFAULT 'Etawah',
    email TEXT,
    availability BOOLEAN DEFAULT TRUE,
    type TEXT NOT NULL CHECK (type IN ('police', 'counsellor')) DEFAULT 'police',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name, mobile)
);

-- D. COMPLAINTS TABLE (Standard / Voice complaint, tracking prefix: SC)
CREATE TABLE complaints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    police_station TEXT,
    category TEXT NOT NULL,
    incident_date DATE NOT NULL,
    incident_time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    document_url TEXT,
    anonymous BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Under Investigation', 'Assigned', 'Resolved', 'Closed', 'Rejected')) DEFAULT 'Pending',
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- E. ANTI ROMEO REPORTS TABLE (tracking prefix: ARS)
CREATE TABLE ars_reports (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Anonymous',
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    police_station TEXT DEFAULT 'Anti Romeo Squad',
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Submitted', 'Pending Review', 'Officer Assigned', 'In Progress', 'Resolved')) DEFAULT 'Submitted',
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- F. MAHILA HELP DESK REQUESTS TABLE (tracking prefix: MHD)
CREATE TABLE mhd_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    police_station TEXT,
    description TEXT NOT NULL,
    callback_requested BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL CHECK (status IN ('Submitted', 'Call Back Requested', 'Officer Assigned', 'Issue Under Review', 'Resolved')) DEFAULT 'Submitted',
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- G. COUNSELLING BOOKINGS TABLE (tracking prefix: CNS)
CREATE TABLE counselling_bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Application Received', 'Session Pending', 'Session Scheduled', 'Session Completed')) DEFAULT 'Application Received',
    assigned_counsellor_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    session_date DATE,
    session_time TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- H. WOMEN EMPOWERMENT APPLICATIONS TABLE (tracking prefix: SCH)
CREATE TABLE empowerment_applications (
    id TEXT PRIMARY KEY,
    scheme_title TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Application Received', 'Exported', 'Closed')) DEFAULT 'Application Received',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- I. CALLBACK / LEGAL AID REFERRALS TABLE (tracking prefix: FOB)
CREATE TABLE callback_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    police_station TEXT DEFAULT 'Legal Aid Cell',
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Submitted', 'Assigned', 'Completed')) DEFAULT 'Submitted',
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- J. EMERGENCY / SOS REQUESTS TABLE (tracking prefix: SOS)
CREATE TABLE emergency_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    district TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Domestic Violence SOS',
    status TEXT NOT NULL CHECK (status IN ('Submitted', 'Dispatched', 'Resolved')) DEFAULT 'Submitted',
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- K. MODULE HISTORY TABLE (audit history trail)
CREATE TABLE module_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id TEXT NOT NULL,
    status TEXT NOT NULL,
    officer_name TEXT,
    remarks TEXT,
    updated_by_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- L. CONTACTS TABLE (Emergency public helplines)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL,
    officer_name TEXT,
    designation TEXT,
    phone_number TEXT NOT NULL,
    photo_url TEXT,
    availability BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (department, phone_number)
);

-- M. SCHEMES TABLE (Welfare information cards)
CREATE TABLE schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    eligibility TEXT,
    benefits TEXT,
    website_link TEXT,
    contact TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- N. ANNOUNCEMENTS TABLE (Bilingual updates bar)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL DEFAULT 'Notice',
    title TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- O. NOTIFICATIONS TABLE (push updates for citizen panel)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- P. ACTIVITY LOGS TABLE
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================
-- 2. SEQUENCES & AUTO-ID GENERATORS (TRIGGERS)
-- ============================================================

-- A. Complaints ID: SC20261001
CREATE SEQUENCE complaint_seq START 1001;
CREATE OR REPLACE FUNCTION generate_complaint_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'SC' || to_char(CURRENT_DATE, 'YYYY') || lpad(nextval('complaint_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_complaint_id
  BEFORE INSERT ON complaints
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_complaint_id();

-- B. Anti Romeo ID: ARS-2026-000101
CREATE SEQUENCE ars_seq START 101;
CREATE OR REPLACE FUNCTION generate_ars_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'ARS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('ars_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_ars_id
  BEFORE INSERT ON ars_reports
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_ars_id();

-- C. Mahila Help Desk ID: MHD-2026-000101
CREATE SEQUENCE mhd_seq START 101;
CREATE OR REPLACE FUNCTION generate_mhd_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'MHD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('mhd_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_mhd_id
  BEFORE INSERT ON mhd_requests
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_mhd_id();

-- D. Counselling ID: CNS-2026-000101
CREATE SEQUENCE cns_seq START 101;
CREATE OR REPLACE FUNCTION generate_cns_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'CNS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('cns_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_cns_id
  BEFORE INSERT ON counselling_bookings
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_cns_id();

-- E. Women Empowerment ID: SCH-2026-000101
CREATE SEQUENCE emp_seq START 101;
CREATE OR REPLACE FUNCTION generate_emp_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'SCH-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('emp_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_emp_id
  BEFORE INSERT ON empowerment_applications
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_emp_id();

-- F. Callback / Legal Aid ID: FOB-2026-000101
CREATE SEQUENCE callback_seq START 101;
CREATE OR REPLACE FUNCTION generate_callback_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'FOB-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('callback_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_callback_id
  BEFORE INSERT ON callback_requests
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_callback_id();

-- G. Emergency / SOS ID: SOS-2026-000101
CREATE SEQUENCE emergency_seq START 101;
CREATE OR REPLACE FUNCTION generate_emergency_id() RETURNS TRIGGER AS $$
BEGIN
  NEW.id := 'SOS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('emergency_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_generate_emergency_id
  BEFORE INSERT ON emergency_requests
  FOR EACH ROW
  WHEN (NEW.id IS NULL OR NEW.id = '')
  EXECUTE FUNCTION generate_emergency_id();


-- ============================================================
-- 3. AUTO-UPDATE TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_ars_updated_at BEFORE UPDATE ON ars_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_mhd_updated_at BEFORE UPDATE ON mhd_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_cns_updated_at BEFORE UPDATE ON counselling_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_emp_updated_at BEFORE UPDATE ON empowerment_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_callback_updated_at BEFORE UPDATE ON callback_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_emergency_updated_at BEFORE UPDATE ON emergency_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 4. REALTIME: REPLICA IDENTITY & PUBLICATION CONFIGURATION
-- ============================================================
ALTER TABLE ars_reports REPLICA IDENTITY FULL;
ALTER TABLE mhd_requests REPLICA IDENTITY FULL;
ALTER TABLE counselling_bookings REPLICA IDENTITY FULL;
ALTER TABLE emergency_requests REPLICA IDENTITY FULL;
ALTER TABLE complaints REPLICA IDENTITY FULL;
ALTER TABLE module_history REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE empowerment_applications REPLICA IDENTITY FULL;
ALTER TABLE callback_requests REPLICA IDENTITY FULL;

-- Ensure realtime publication channel exists and includes all tables idempotently
DO $$
DECLARE
  t_name TEXT;
  tables_to_add TEXT[] := ARRAY['ars_reports', 'mhd_requests', 'counselling_bookings', 'emergency_requests', 'complaints', 'module_history', 'notifications', 'empowerment_applications', 'callback_requests'];
BEGIN
  -- Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add tables that are not already in the publication
  FOREACH t_name IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_publication p ON p.oid = pr.prpubid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = t_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t_name);
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ars_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mhd_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE empowerment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper security definer function for Admin authentication check
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'adarsh004455@gmail.com'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Profiles: own read" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Profiles: own insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: own update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Profiles: admin control" ON profiles FOR ALL USING (is_admin());

-- CATEGORIES
CREATE POLICY "Categories: public read" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Categories: admin write" ON categories FOR ALL USING (is_admin());

-- OFFICERS
CREATE POLICY "Officers: public read" ON officers FOR SELECT USING (TRUE);
CREATE POLICY "Officers: admin write" ON officers FOR ALL USING (is_admin());

-- COMPLAINTS
CREATE POLICY "Complaints: insert" ON complaints FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Complaints: select own or admin" ON complaints FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Complaints: admin update" ON complaints FOR UPDATE USING (is_admin());
CREATE POLICY "Complaints: admin delete" ON complaints FOR DELETE USING (is_admin());

-- ARS REPORTS
CREATE POLICY "ARS: insert" ON ars_reports FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "ARS: select own or admin" ON ars_reports FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "ARS: admin update" ON ars_reports FOR UPDATE USING (is_admin());
CREATE POLICY "ARS: admin delete" ON ars_reports FOR DELETE USING (is_admin());

-- MHD REQUESTS
CREATE POLICY "MHD: insert" ON mhd_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "MHD: select own or admin" ON mhd_requests FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "MHD: admin update" ON mhd_requests FOR UPDATE USING (is_admin());
CREATE POLICY "MHD: admin delete" ON mhd_requests FOR DELETE USING (is_admin());

-- COUNSELLING BOOKINGS
CREATE POLICY "Counselling: insert" ON counselling_bookings FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Counselling: select own or admin" ON counselling_bookings FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Counselling: admin update" ON counselling_bookings FOR UPDATE USING (is_admin());
CREATE POLICY "Counselling: admin delete" ON counselling_bookings FOR DELETE USING (is_admin());

-- EMPOWERMENT APPLICATIONS
CREATE POLICY "Empowerment: insert" ON empowerment_applications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Empowerment: select own or admin" ON empowerment_applications FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Empowerment: admin update" ON empowerment_applications FOR UPDATE USING (is_admin());
CREATE POLICY "Empowerment: admin delete" ON empowerment_applications FOR DELETE USING (is_admin());

-- CALLBACK REQUESTS
CREATE POLICY "Callback: insert" ON callback_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Callback: select own or admin" ON callback_requests FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Callback: admin update" ON callback_requests FOR UPDATE USING (is_admin());
CREATE POLICY "Callback: admin delete" ON callback_requests FOR DELETE USING (is_admin());

-- EMERGENCY REQUESTS
CREATE POLICY "Emergency: insert" ON emergency_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Emergency: select own or admin" ON emergency_requests FOR SELECT USING (email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Emergency: admin update" ON emergency_requests FOR UPDATE USING (is_admin());
CREATE POLICY "Emergency: admin delete" ON emergency_requests FOR DELETE USING (is_admin());

-- MODULE HISTORY
CREATE POLICY "History: select" ON module_history FOR SELECT USING (TRUE);
CREATE POLICY "History: insert" ON module_history FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "History: admin manage" ON module_history FOR ALL USING (is_admin());

-- CONTACTS
CREATE POLICY "Contacts: select" ON contacts FOR SELECT USING (TRUE);
CREATE POLICY "Contacts: admin manage" ON contacts FOR ALL USING (is_admin());

-- SCHEMES
CREATE POLICY "Schemes: select" ON schemes FOR SELECT USING (TRUE);
CREATE POLICY "Schemes: admin manage" ON schemes FOR ALL USING (is_admin());

-- ANNOUNCEMENTS
CREATE POLICY "Announcements: select" ON announcements FOR SELECT USING (active = TRUE OR is_admin());
CREATE POLICY "Announcements: admin manage" ON announcements FOR ALL USING (is_admin());

-- NOTIFICATIONS
CREATE POLICY "Notifications: select own" ON notifications FOR SELECT USING (user_email = (auth.jwt() ->> 'email') OR is_admin());
CREATE POLICY "Notifications: insert" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Notifications: admin manage" ON notifications FOR ALL USING (is_admin());

-- ACTIVITY LOGS
CREATE POLICY "Logs: select admin" ON activity_logs FOR SELECT USING (is_admin());
CREATE POLICY "Logs: insert" ON activity_logs FOR INSERT WITH CHECK (TRUE);


-- ============================================================
-- 6. STORAGE OBJECTS (BUCKET SETUP & SECURITY)
-- ============================================================

-- A. Register Public Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', TRUE)
ON CONFLICT (id) DO NOTHING;

-- B. Storage Security Policies
CREATE POLICY "Allow public read storage access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents');

CREATE POLICY "Allow public insert storage access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents');


-- ============================================================
-- 7. SEED DATA (Idempotent seeds for Etawah District)
-- ============================================================

-- Categories
INSERT INTO categories (name) VALUES
('Harassment / Eve Teasing'),
('Domestic Violence'),
('Stalking'),
('Cyber Crime'),
('Dowry Harassment'),
('Workplace Harassment'),
('Kidnapping / Missing'),
('Other')
ON CONFLICT (name) DO NOTHING;

-- Contacts (Emergency Helplines)
INSERT INTO contacts (department, officer_name, designation, phone_number, photo_url, priority) VALUES
('Mahila Helpdesk', 'Nodal Official CUG', 'Nodal Officer', '9454406780', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 10),
('Emergency Response System', 'UP Police', 'Control Room', '112', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=200', 9),
('Anti Romeo Squad', 'SI Neha Singh', 'Squad Lead', '9454402121', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', 8),
('Counselling Center', 'Dr. Priya Sharma', 'Chief Counsellor', '9454408989', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200', 7),
('Designated Female Officer', 'ASI Pushpa Devi', 'Women Officer', '9454402122', 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=200', 6),
('Cyber Crime Cell', 'Cyber Help Desk', 'Support', '1930', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200', 5)
ON CONFLICT (department, phone_number) DO NOTHING;

-- Officers Database
INSERT INTO officers (name, photo_url, mobile, designation, station, district, email, type) VALUES
('SI Neha Singh', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', '9454402121', 'Sub-Inspector', 'Civil Lines PS', 'Etawah', 'neha.singh@uppolice.gov.in', 'police'),
('ASI Pushpa Devi', 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=200', '9454402122', 'Assistant Sub-Inspector', 'Civil Lines PS', 'Etawah', 'pushpa.devi@uppolice.gov.in', 'police'),
('SI Sarita Yadav', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', '9454402123', 'Sub-Inspector', 'Jaswantnagar PS', 'Etawah', 'sarita.yadav@uppolice.gov.in', 'police'),
('ASI Poonam Shakya', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200', '9454402124', 'Assistant Sub-Inspector', 'Chakarnagar PS', 'Etawah', 'poonam.shakya@uppolice.gov.in', 'police'),
('Dr. Priya Sharma', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200', '9454408989', 'Chief Counsellor', 'District Hospital', 'Etawah', 'priya.sharma@uppolice.gov.in', 'counsellor'),
('Dr. Rekha Singh', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', '9454408990', 'Family Counsellor', 'One Stop Centre', 'Etawah', 'rekha.singh@uppolice.gov.in', 'counsellor'),
('Ms. Anita Verma', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', '9454408991', 'Legal Counsellor', 'Family Court', 'Etawah', 'anita.verma@uppolice.gov.in', 'counsellor')
ON CONFLICT (name, mobile) DO NOTHING;

-- Schemes
INSERT INTO schemes (title, description, eligibility, benefits, website_link, contact, image_url) VALUES
('Mission Shakti', 'Safety and security drive across Uttar Pradesh focusing on women safety, self-reliance, and patrol deployment.', 'All women residing in Uttar Pradesh', 'Immediate protection, rapid patrols, self-defense, legal counseling.', 'https://uppolice.gov.in/', '1090', 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&q=80&w=400'),
('Self Defence Training', 'Police-organized martial arts and self-defence workshops for female students and working women.', 'Female residents aged 12 to 45', 'Free certification, physical conditioning, safety tactics.', 'https://uppolice.gov.in/', '0522-2206100', 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=400'),
('Jan Shikshan Sansthan', 'Vocational courses, digital literacy, and tailoring for rural women and school dropouts.', 'Literates and non-literates aged 15-45, priority to women', 'Free courses, banking tutorials, MSDE certification, self-employment support.', 'https://jss.gov.in/', '9454408780', 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=400'),
('Kanya Sumangala Yojana', 'Financial assistance at six developmental stages from birth through graduation.', 'UP domicile daughters in families with income under ₹3 Lakhs', 'DBT transfer of up to ₹25,000 across milestones.', 'https://mksy.up.gov.in/', '1800-180-5302', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=400')
ON CONFLICT (title) DO NOTHING;

-- Announcements
INSERT INTO announcements (type, title, content, active) VALUES
('Emergency Broadcast', 'Anti-Romeo Patrol Intensified', 'Special patrol squads deployed near educational institutes and transit corridors in Etawah.', TRUE),
('Notice', 'Free Self Defence Camps — Batch 5', 'Registration for Women Self-Defence Camps Batch 5 is now open. Register through your ShaktiCop dashboard.', TRUE),
('Alert', 'Cyber Fraud Advisory', 'Never share banking OTPs or click unverified links claiming government scheme grants.', TRUE)
ON CONFLICT (title) DO NOTHING;
