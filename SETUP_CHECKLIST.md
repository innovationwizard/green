# Setup Checklist - End-to-End Full Functionality

This checklist ensures all critical steps are completed for full end-to-end functionality.

## ✅ Pre-Deployment Checklist

### 1. Database Setup
- [ ] **Supabase Project Created**
  - [ ] Project created in Supabase Cloud
  - [ ] Database password saved securely
  - [ ] Region selected (closest to users)

- [ ] **Migrations Executed**
  - [ ] `001_initial_schema.sql` executed successfully
  - [ ] `002_projection_functions.sql` executed successfully
  - [ ] No errors in migration logs
  - [ ] All tables created (verify in Table Editor)

- [ ] **RLS Policies Verified**
  - [ ] Users can only see their own data (installers)
  - [ ] Admins/managers can see all data
  - [ ] Events policies allow insert for authenticated users
  - [ ] Storage policies allow authenticated uploads

- [ ] **Optional: Auto-User Creation Trigger** (Recommended)
  ```sql
  -- Run in SQL Editor if you want automatic user creation
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'installer');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ```

### 2. Storage Configuration
- [ ] **Bucket Created**
  - [ ] Bucket name: `event-photos`
  - [ ] Bucket is public OR has proper policies
  - [ ] Policies allow INSERT, SELECT, UPDATE for authenticated users

- [ ] **Storage Policies** (if bucket is not public)
  ```sql
  -- Allow authenticated users to upload
  CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'event-photos' AND
      auth.role() = 'authenticated'
    );

  -- Allow authenticated users to read
  CREATE POLICY "Allow authenticated reads" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'event-photos' AND
      auth.role() = 'authenticated'
    );
  ```

### 3. Authentication Setup
- [ ] **Auth Settings Configured**
  - [ ] Site URL set (production URL or localhost:3000 for dev)
  - [ ] Redirect URLs configured:
    - [ ] Production URL with `/**` wildcard
    - [ ] `http://localhost:3000/**` for local development
  - [ ] Session Duration: 30 days (2592000 seconds)

- [ ] **First Admin User Created**
  - [ ] User created in Authentication → Users
  - [ ] User added to `public.users` table with role 'admin'
  - [ ] Can login successfully

### 4. Environment Variables
- [ ] **Local Development** (`.env.local`)
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Optional but recommended
  ```

- [ ] **Production** (Vercel/Netlify)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (marked as secret)
  - [ ] `NEXT_PUBLIC_SITE_URL` configured (your production URL)
  - [ ] All variables set for Production, Preview, and Development environments

### 5. Application Deployment
- [ ] **Vercel Deployment**
  - [ ] Repository connected to Vercel
  - [ ] Environment variables configured
  - [ ] Build successful
  - [ ] Production URL obtained

- [ ] **Post-Deployment Configuration**
  - [ ] Supabase Site URL updated to production URL
  - [ ] Supabase Redirect URLs include production URL
  - [ ] Application accessible at production URL

### 6. Scheduled Jobs (Critical for Dashboards)
- [ ] **Projection Updates Configured**
  - [ ] Choose one option:
    - [ ] **Option A:** External cron service (cron-job.org, EasyCron, etc.)
      - URL: `https://your-app.vercel.app/api/projections/update`
      - Schedule: Every 15 minutes (`*/15 * * * *`)
    - [ ] **Option B:** Manual execution (not recommended for production)
    - [ ] **Option C:** Vercel Pro cron jobs (requires paid plan)
    - [ ] **Option D:** Supabase pg_cron (advanced setup)

- [ ] **Test Projection Endpoint**
  - [ ] Visit: `https://your-app.vercel.app/api/projections/update`
  - [ ] Should return: `{"success": true, ...}`
  - [ ] Check Supabase logs for any errors

### 7. PWA Configuration
- [ ] **Icons Created**
  - [ ] `icon.svg` exists (✅ done)
  - [ ] `icon-192.png` accessible (✅ dynamic route created)
  - [ ] `icon-512.png` accessible (✅ dynamic route created)
  - [ ] `apple-icon` accessible (✅ dynamic route created)

- [ ] **Manifest Verified**
  - [ ] `manifest.json` exists and is correct
  - [ ] All icon references work
  - [ ] Theme color matches brand (#16a34a)

### 8. Testing Critical Paths
- [ ] **Authentication Flow**
  - [ ] Can login with admin user
  - [ ] Redirects to correct dashboard based on role
  - [ ] Session persists correctly
  - [ ] Can logout

- [ ] **Installer Flow**
  - [ ] Installer can create events offline
  - [ ] Events appear in "Mis Eventos"
  - [ ] Can sync events to server
  - [ ] Can view cash box balance
  - [ ] Can use timer

- [ ] **Admin Flow**
  - [ ] Can access admin dashboard
  - [ ] Can view "Resumen Ejecutivo"
  - [ ] Can access projections page
  - [ ] Can view exceptions page

- [ ] **Data Flow**
  - [ ] Events created offline sync successfully
  - [ ] Photos upload correctly
  - [ ] Projections update after sync
  - [ ] Dashboards show data after projections run

### 9. Security Checklist
- [ ] **Secrets Protected**
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` never committed to git
  - [ ] `.env.local` in `.gitignore`
  - [ ] No secrets in client-side code

- [ ] **RLS Policies Active**
  - [ ] RLS enabled on all tables
  - [ ] Policies tested for each role
  - [ ] Installers cannot access admin data

- [ ] **HTTPS Enabled**
  - [ ] Production uses HTTPS (Vercel default)
  - [ ] PWA works over HTTPS

### 10. Performance & Monitoring
- [ ] **Database Indexes**
  - [ ] Indexes created on frequently queried columns
  - [ ] Query performance acceptable

- [ ] **Error Monitoring** (Optional but Recommended)
  - [ ] Set up error tracking (Sentry, LogRocket, etc.)
  - [ ] Monitor API endpoint errors
  - [ ] Set up alerts for projection failures

## 🚨 Critical Missing Steps (Must Complete)

### 1. Scheduled Jobs for Projections
**Status:** ⚠️ **CRITICAL** - Dashboards won't update without this

**Action Required:**
- Set up external cron job OR
- Configure manual trigger button in admin panel OR
- Upgrade to Vercel Pro for cron jobs

**Recommended:** Use [cron-job.org](https://cron-job.org) (free):
1. Create account
2. Add new cron job
3. URL: `https://your-app.vercel.app/api/projections/update`
4. Schedule: `*/15 * * * *` (every 15 minutes)
5. Method: GET

### 2. Environment Variable: NEXT_PUBLIC_SITE_URL
**Status:** ⚠️ **IMPORTANT** - Required for OG images and absolute URLs

**Action Required:**
- Add `NEXT_PUBLIC_SITE_URL` to production environment variables
- Value: Your production URL (e.g., `https://green-xxx.vercel.app`)

### 3. Auto-User Creation Trigger (Optional but Recommended)
**Status:** ⚠️ **RECOMMENDED** - Makes user management easier

**Action Required:**
- Run the SQL from section 1 above to auto-create users
- Or manually create users in `public.users` after creating in Auth

## 📋 Post-Setup Verification

Run these checks after completing setup:

1. **Health Check:**
   ```bash
   curl https://your-app.vercel.app/api/projections/update
   ```
   Should return: `{"success": true, ...}`

2. **Database Check:**
   - Verify tables exist in Supabase Table Editor
   - Verify RLS policies are active
   - Verify storage bucket exists

3. **Authentication Check:**
   - Login works
   - Role-based redirects work
   - Session persists

4. **PWA Check:**
   - Manifest loads: `https://your-app.vercel.app/manifest.json`
   - Icons load: `https://your-app.vercel.app/icon-192.png`
   - Can install as PWA on mobile

5. **Projections Check:**
   - Create a test event
   - Wait for projection job to run (or trigger manually)
   - Verify data appears in dashboard

## 🎯 Quick Reference

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app  # Recommended
```

### Critical Endpoints
- Projections: `GET /api/projections/update`
- Event Reverse: `POST /api/events/reverse`

### Critical Database Tables
- `public.users` - User management
- `public.events` - Event ledger
- `public.projects` - Projects
- `public.projection_checkpoint` - Tracks last processed event

### Critical Storage
- Bucket: `event-photos`
- Policies: Authenticated users can INSERT/SELECT/UPDATE

---

**Last Updated:** 2024-12-29
**Status:** Ready for production after completing critical steps above

