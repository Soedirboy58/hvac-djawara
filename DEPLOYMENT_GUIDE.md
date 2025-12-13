# Deployment Guide - HVAC Djawara Scheduling System

## Prerequisites

- Supabase account with an active project
- Supabase CLI installed (optional but recommended)
- Database access credentials
- Node.js 18+ installed

## Step 1: Prepare Supabase Project

### 1.1 Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `hvac-djawara`
3. Navigate to **Settings** → **API**
4. Copy the following:
   - Project URL
   - `anon` public key
   - `service_role` secret key (for migrations)

### 1.2 Update Environment Variables

Create or update `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 2: Run Database Migrations

### Option A: Using Supabase SQL Editor (Recommended for Manual Review)

1. Go to **SQL Editor** in Supabase Dashboard
2. Run migrations in order (001 to 008):
   - Copy entire content from each migration file
   - Paste into SQL Editor
   - Click "Run"
   - Verify success message

### Option B: Using Supabase CLI (Automated)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

## Step 3: Verify Database Schema

Run these queries in SQL Editor to verify:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'daily_attendance',
    'technician_availability',
    'order_status_history',
    'working_hours_config',
    'overtime_requests'
);

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'calculate_work_hours',
    'calculate_overtime_hours',
    'track_status_change',
    'auto_clock_out_forgot_technicians'
);

-- Check views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
    'v_daily_attendance_summary',
    'v_overtime_summary'
);
```

## Step 4: Setup Cron Job (Auto Clock Out)

Go to **Database** → **Cron Jobs** in Supabase Dashboard:

```sql
-- Create cron job to run daily at 18:00 (6 PM)
SELECT cron.schedule(
    'auto-clock-out-forgot-technicians',
    '0 18 * * *',
    $$SELECT auto_clock_out_forgot_technicians();$$
);
```

## Step 5: Deploy Frontend

```bash
# Install dependencies
npm install

# Build
npm run build

# Test locally
npm run dev

# Deploy to Vercel
vercel --prod
```

## Troubleshooting

### Migration Fails with "Enum Already Exists"
```sql
-- Check existing enum values
SELECT enumlabel 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_type';
```

### RLS Policy Blocks Access
```sql
-- Temporarily disable RLS for testing
ALTER TABLE daily_attendance DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
```

### Trigger Not Firing
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%calculate%';
```

## Support

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Project Repository: https://github.com/Soedirboy58/hvac-djawara
