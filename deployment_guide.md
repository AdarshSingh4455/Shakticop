# ShaktiCop — Supabase Deployment Guide & Production Checklist

This guide provides step-by-step instructions to deploy the ShaktiCop database schema, configure storage buckets, establish RLS policies, setup authentication, and verify end-to-end functionality on a brand-new Supabase project.

---

## 1. Supabase Project Initialization

1. Log in to [Supabase Console](https://supabase.com).
2. Click **New Project** and select your organization.
3. Enter Project Name (e.g., `ShaktiCop-Production`).
4. Set a strong Database Password (store this securely).
5. Choose your nearest hosting region (e.g. `ap-south-1` for Mumbai / India region, or as appropriate).
6. Click **Create new project** and wait for provisioning to complete (usually 1-2 minutes).

---

## 2. Deploying Database Schema & Seeds

1. Once the project is provisioned, navigate to the **SQL Editor** from the left navigation panel.
2. Click **New query** (or **Blank query**).
3. Copy the entire contents of [supabase_schema_final.sql](file:///c:/Users/adars/OneDrive/Desktop/New%20folder/UPCOP/supabase_schema_final.sql).
4. Paste the script into the query editor window.
5. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
6. Verify the query executes successfully with `Success. No rows returned` (or displaying seeded insertions in the log console below).

---

## 3. Storage Bucket Configuration

1. In the Supabase dashboard, click on **Storage** (bucket icon in the left menu bar).
2. Click **New Bucket**.
3. Set the **Bucket Name** to exactly: `documents` (case-sensitive).
4. Toggle the **Public bucket** switch to **ON** (so citizens can fetch uploaded voice FIRs / attachments).
5. Click **Save**.
6. Check that the RLS policies for storage are active. The database script automatically inserts RLS rules for `storage.objects` allowing public read and public inserts into the `documents` bucket.

---

## 4. Setup Authentication & Admin Role

1. Navigate to **Authentication** (user icon in the left menu bar).
2. Go to **Users** → **Add user** → **Create user**.
3. Enter the email address: `adarsh004455@gmail.com`
4. Set the password to: `admin@098`
5. Turn **OFF** the "Auto-confirm user" or let it auto-confirm (recommended for immediate test without email confirmation).
6. Click **Create User**.
7. Once created, copy the generated **User UID** (UUID format, e.g., `d56b8294-f2a8-48b9-8739-fa30c904fa87`).
8. Go back to **SQL Editor** and run the following command to link the authentication user to the admin database role:
   ```sql
   INSERT INTO profiles (id, email, role) 
   VALUES ('<paste-user-uuid-here>', 'adarsh004455@gmail.com', 'admin')
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

---

## 5. Environment Variables Configuration

Create or update your `.env` file in the root of the project with the following values:

```env
# Supabase Connectivity Keys
VITE_SUPABASE_URL=https://vlqqkvppbsuyfradgvqw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscXFrdnBwYnN1eWZyYWRndnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Njc5ODQsImV4cCI6MjA5OTE0Mzk4NH0.XOi1ljZ5ZdsGxPJ-Os2vsBCwNRp_eYjtXAa6QCG-hYk
```

> [!NOTE]
> Ensure there are no spaces or trailing characters after the keys.

---

## 6. Production Checklist

Ensure every item is verified prior to handover:

- [ ] **idempotency Check**: Run the `supabase_schema_final.sql` multiple times to ensure zero primary key or trigger conflicts.
- [ ] **Table Identity check**: Check that all tables show `REPLICA IDENTITY FULL` in pgAdmin or the SQL console (needed for browser realtime stream triggers).
- [ ] **Storage Bucket Permissions**: Test uploading a sample voice complaint and checking if the public URL is reachable without token restrictions.
- [ ] **Admin Authentication Rules**: Check that only `adarsh004455@gmail.com` accesses the admin panels and other emails map to standard citizen dashboard permissions.
- [ ] **Zero Console Errors**: Confirm the browser console shows `✅ Supabase Client initialized` and `✅ Supabase DB connectivity confirmed` with zero client-side warnings.
