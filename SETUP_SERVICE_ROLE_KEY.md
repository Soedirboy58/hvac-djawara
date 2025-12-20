# ⚠️ PENTING: Setup Environment Variable

Untuk PDF download berfungsi, Anda perlu menambahkan **SUPABASE_SERVICE_ROLE_KEY** ke environment Vercel:

## 📋 Langkah Setup:

### 1. Dapatkan Service Role Key dari Supabase

1. Buka https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **Settings** → **API**
4. Copy value dari **service_role** key (secret key, bukan anon key!)

### 2. Add ke Vercel Environment Variables

1. Buka https://vercel.com/dashboard
2. Pilih project `hvac-djawara`
3. Klik **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (paste service role key dari Supabase)
   - **Environment**: Check ✅ Production, Preview, Development

5. Klik **Save**

### 3. Redeploy

Setelah add environment variable:
- Vercel akan auto-redeploy
- ATAU klik **Deployments** → kebab menu (⋮) → **Redeploy**

---

## 🔒 Keamanan Service Role Key

**Service Role Key** memiliki **FULL ACCESS** ke database (bypass RLS).

**Gunakan HANYA di:**
- ✅ Server-side API routes (Next.js API routes)
- ✅ Server actions
- ❌ JANGAN di client-side code
- ❌ JANGAN commit ke git

**Kenapa aman untuk PDF generation:**
- API route jalan di server Vercel (bukan browser)
- Client tidak bisa lihat service role key
- PDF hanya generate untuk order yang valid

---

## 🧪 Test Setelah Setup

Setelah service role key ditambahkan:

1. Wait for Vercel redeploy (1-2 menit)
2. Buka client portal atau admin dashboard
3. Klik "Download PDF Report"
4. PDF seharusnya download tanpa error ✅

---

## 🐛 Troubleshooting

**Jika masih error:**

1. Check Console Browser (F12):
   - Error "SUPABASE_SERVICE_ROLE_KEY is not defined"?
   - → Service role key belum ditambahkan atau Vercel belum redeploy

2. Check Vercel Deployment Logs:
   - Buka Vercel → Deployments → Latest → View Function Logs
   - Lihat error message dari `/api/reports/[orderId]/pdf`

3. Check Supabase Logs:
   - Buka Supabase Dashboard → Logs → API
   - Cari request yang gagal

**Need help?**
Screenshot error message dan share ke saya!
