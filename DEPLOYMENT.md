# 🚀 DEPLOYMENT GUIDE - DJAWARA HVAC PLATFORM

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Supabase project created (DONE ✅)
- [ ] Database migrations deployed (DONE ✅)
- [ ] Supabase anon key obtained
- [ ] GitHub repository created (DONE ✅)
- [ ] Vercel account ready

### 2. Local Testing
```bash
# Install dependencies
npm install

# Add environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Test build
npm run build
```

## 📝 Step-by-Step Deployment

### Step 1: Update Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tukbuzdngodvcysncwke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Get your Supabase anon key:**
1. Go to https://supabase.com/dashboard/project/tukbuzdngodvcysncwke
2. Click on "Project Settings" → "API"
3. Copy "anon public" key

### Step 2: Test Locally

```bash
# Start development server
npm run dev

# Open http://localhost:3000
# Test the following flows:
1. Register new account
2. Login
3. Dashboard loads correctly
4. Sidebar navigation works
5. All module pages accessible
```

### Step 3: Commit to GitHub

```bash
# Check status
git status

# Add all new files
git add .

# Commit
git commit -m "Complete MVP frontend build - all modules implemented"

# Push to GitHub
git push origin main
```

### Step 4: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Login with GitHub

2. **Import Repository**
   - Click "Add New" → "Project"
   - Select `Soedirboy58/hvac-djawara` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://tukbuzdngodvcysncwke.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-actual-anon-key
   NEXT_PUBLIC_SITE_URL = https://your-app.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Get deployment URL: `https://hvac-djawara.vercel.app`

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: hvac-djawara
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SITE_URL

# Deploy to production
vercel --prod
```

### Step 5: Post-Deployment Configuration

1. **Update Supabase Site URL**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add Vercel URL to "Site URL": `https://your-app.vercel.app`
   - Add to "Redirect URLs": `https://your-app.vercel.app/auth/callback`

2. **Update CORS Settings** (if needed)
   - Supabase → Project Settings → API
   - Add Vercel domain to allowed origins

3. **Test Production Deployment**
   - Visit your Vercel URL
   - Test registration flow
   - Test login
   - Verify all pages load correctly

## 🔧 Troubleshooting

### Build Errors

**Error: Missing environment variables**
```bash
# Solution: Add env vars in Vercel dashboard
# Settings → Environment Variables
```

**Error: Module not found**
```bash
# Solution: Clear cache and rebuild
npm run clean
npm install
npm run build
```

### Runtime Errors

**Supabase auth not working**
- Check NEXT_PUBLIC_SUPABASE_URL is correct
- Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is valid
- Ensure NEXT_PUBLIC_SITE_URL matches your domain

**Redirect loops**
- Clear browser cookies
- Check middleware.ts is not blocking auth routes
- Verify Supabase redirect URLs are configured

## 📊 Monitoring

### Vercel Analytics
- Go to Vercel Dashboard → Your Project → Analytics
- Monitor page load times
- Track error rates

### Supabase Logs
- Go to Supabase Dashboard → Logs
- Monitor database queries
- Check auth events

## 🔄 Continuous Deployment

Every push to `main` branch automatically triggers:
1. Vercel build
2. Deploy to production
3. URL: https://hvac-djawara.vercel.app

To deploy from feature branch:
```bash
# Create preview deployment
git checkout -b feature/new-feature
git push origin feature/new-feature
# Vercel creates preview URL automatically
```

## 🎯 Next Steps After Deployment

1. **Create Database Tables**
   - Clients table (CRM)
   - Service orders table
   - Jobs table
   - Inventory table

2. **Connect Real Data**
   - Update mock data in components
   - Implement Supabase queries
   - Enable real-time subscriptions

3. **Add Features**
   - Drag-and-drop job board
   - File uploads (invoices, reports)
   - Email notifications
   - WhatsApp integration

4. **Security Hardening**
   - Enable 2FA
   - Add rate limiting
   - Implement audit logs
   - Configure RLS policies

## 📞 Support

- **Repository**: https://github.com/Soedirboy58/hvac-djawara
- **Supabase Project**: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Status**: Ready for Deployment ✅  
**Last Updated**: January 2025
