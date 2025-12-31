# ⚠️ CRITICAL: Supabase Configuration Required

## Production-Only App Configuration

This is a **PRODUCTION ONLY** application. The following Supabase settings **MUST** be configured correctly:

### Required Supabase Dashboard Settings

1. **Go to Supabase Dashboard → Authentication → Settings**

2. **Update Site URL:**
   - **Current (WRONG):** `http://localhost:3000`
   - **Required:** Your production domain (e.g., `https://yourdomain.com` or `https://your-app.vercel.app`)
   - ⚠️ **DO NOT use localhost in production**

3. **Update Redirect URLs:**
   - Add your production domain with wildcard: `https://yourdomain.com/**`
   - Add your production domain: `https://yourdomain.com`
   - Remove `http://localhost:3000/**` from production (or keep only for local development if needed)

4. **Save Changes**

### Why This Matters

- Password recovery emails use Supabase's **Site URL** setting
- If Site URL is `localhost:3000`, all password reset links will point to localhost
- Users will receive broken links that don't work in production
- This breaks the authentication flow completely

### Verification

After updating, test password recovery:
1. Go to `/auth/forgot-password`
2. Enter an email
3. Check the email - the reset link should point to your production domain
4. The URL should look like: `https://yourdomain.com/auth/reset-password-confirm?token=...`

### Environment Variables

Also ensure these are set in your production environment:
- `NEXT_PUBLIC_SITE_URL` = Your production domain (e.g., `https://yourdomain.com`)
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key

### Current Issue

If you're seeing URLs like:
```
https://rbnjtwhxvtyrzjrcvexz.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000
```

This means:
- ❌ Supabase Site URL is still set to `http://localhost:3000`
- ✅ Fix: Update Site URL in Supabase Dashboard to your production domain

