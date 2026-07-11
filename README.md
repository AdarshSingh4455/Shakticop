# ShaktiCop — Women Safety & Empowerment Platform

ShaktiCop is a fully functional web application built for the Uttar Pradesh Police, designed to consolidate women's safety helplines, support services, skill training programs, and empowerment welfare schemes.

This project converts the responsive static HTML frontend into a database-driven SPA powered by **Supabase** backend services (Auth, Database, Storage, and Realtime).

---

## 🚀 Key Features

1. **Dual Dashboards**:
   - **User Panel**: Register complaints, track investigation timelines, view personal history, receive real-time notification alerts, and download styled official PDF receipts.
   - **Admin Panel**: Dark premium dashboard showcasing statistics, real-time Chart.js analytics (monthly trends, district distributions, category charts), global search/filtering, CSV registry export, and CRUD controls over categories, announcements, contacts, and officer assignments.
2. **Dynamic Complaint Lifecycle**:
   - Sequential status flow: `Pending → Under Investigation → Assigned → Resolved → Closed`.
   - Comprehensive history log detailing timestamps, updates, assigned officers, and admin remarks.
3. **Emergency Helplines & Contacts**:
   - Contact cards loaded dynamically from the database.
   - Interactive click-to-call.
4. **Empowerment Programs**:
   - Dynamic cards showing active schemes (Mission Shakti, Self Defence, JSS, Kanya Sumangala) with direct program registration options.
5. **Real-time Notifications**:
   - Uses Supabase PostgreSQL replication to trigger instant browser toasts and notification counts whenever an admin modifies a complaint.
6. **Support Attachments**:
   - Direct file uploads (Photos, Videos, Supporting Documents) stored in Supabase storage buckets.
   - Images are compressed client-side via HTML5 canvas before upload to save bandwidth.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript (ES Modules).
- **Backend-as-a-Service**: Supabase.
- **Visuals & Utilities**: Chart.js (analytics graphing), jsPDF (client-side receipt compiling).
- **Tooling**: Vite (development server & production bundler).

---

## ⚙️ Backend Setup (Supabase)

To link the application to your Supabase project, follow these simple steps:

### 1. Database Schema & Seed Data
1. Open your [Supabase Dashboard](https://supabase.com).
2. Navigate to the **SQL Editor** tab.
3. Create a new query, paste the entire contents of [supabase_schema.sql](./supabase_schema.sql), and click **Run**.
4. This script sets up:
   - All tables (`profiles`, `complaints`, `complaint_history`, `officers`, `contacts`, `schemes`, `announcements`, `notifications`, `activity_logs`, `categories`).
   - A sequence and database trigger to auto-generate unique Complaint IDs like `SC20261001`.
   - Dynamic `updated_at` column triggers.
   - Row Level Security (RLS) policies allowing users access only to their own files and admins full registry management.
   - Initial database seeds.

### 2. Disable Email Confirmation (Important for Demo)
For the automatic signup-on-login user flow to function seamlessly without waiting for email activation links:
1. Go to **Authentication** -> **Providers** -> **Email**.
2. Set **Confirm email** to **Off** (disabled).
3. Save changes.

### 3. Create Storage Buckets
The SQL script attempts to seed storage buckets automatically. However, to ensure correct upload permissions, verify that the following buckets exist and are marked as **Public**:
- `complaint-images`
- `complaint-videos`
- `officer-images`
- `scheme-images`
- `documents`

---

## 💻 Local Installation

1. Clone or copy this directory to your machine.
2. In the root directory, create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
3. Fill in your project API keys (found in Supabase under **Project Settings** -> **API**):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the local development server:
   ```bash
   npm run dev
   ```
6. Open your browser at `http://localhost:3000`.

*Note: If no `.env` credentials are set, the app runs in **Local Mock Simulator mode** using browser local storage, allowing offline demo testing without errors.*

---

## 🔑 Demo Credentials

- **Admin Login**:
  - Email: `adarsh004455@gmail.com`
  - Password: `admin@098`
- **User Login**:
  - Email: *Enter any valid email* (e.g. `test@gmail.com`)
  - Password: `user@123`

---

## 📦 Deployment (Vercel / Netlify)

This project is configured with a standard static output compile, making it compatible with Vercel, Netlify, or GitHub Pages.

1. Connect your git repository to Vercel/Netlify.
2. Configure environment variables in the host dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Set the following build options:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy!
