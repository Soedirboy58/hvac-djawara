# ⚡ QUICK START GUIDE

**Get your Djawara HVAC Platform running in 5 minutes!**

---

## 🎯 Prerequisites

- ✅ Node.js 18+ installed ([Download](https://nodejs.org))
- ✅ npm, yarn, or pnpm installed
- ✅ Supabase project URL: `https://tukbuzdngodvcysncwke.supabase.co`
- ⏳ Supabase anon key (get from Supabase dashboard)

---

## 🚀 Quick Start (3 Steps)

### Method 1: Automated Setup (Recommended)

**Windows:**
```cmd
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

Then:
1. Edit `.env.local` → add your Supabase anon key
2. Run `npm run dev`
3. Open http://localhost:3000

---

### Method 2: Manual Setup

**Step 1: Install Dependencies**
```bash
npm install
```

**Step 2: Configure Environment**
```bash
# Copy example file
cp .env.local.example .env.local

# Edit .env.local and add:
NEXT_PUBLIC_SUPABASE_URL=https://tukbuzdngodvcysncwke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Step 3: Run Development Server**
```bash
npm run dev
```

Open browser: **http://localhost:3000**

---

## 🔑 Get Your Supabase Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/tukbuzdngodvcysncwke)
2. Click **Project Settings** (gear icon)
3. Navigate to **API** section
4. Copy **"anon public"** key
5. Paste into `.env.local`

---

## ✅ Test Your Setup

### 1. Register Account
- Go to http://localhost:3000
- Click "Daftar disini" (Register)
- Fill form with your email
- Click "Daftar"
- Check email for verification link

### 2. Login
- Go to http://localhost:3000/login
- Enter your email and password
- Click "Masuk"

### 3. Explore Dashboard
- View dashboard stats
- Click "Clients" in sidebar
- Click "Add Client" to test form
- Navigate through all modules

---

## 📦 Available Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

---

## 🎨 Project Features

### ✅ Authentication
- Login/Register pages
- Email verification
- Session management
- Protected routes

### ✅ Dashboard Modules
- **CRM**: Client management
- **Orders**: Service order tracking
- **Jobs**: Technician job board (kanban)
- **Inventory**: Parts & equipment
- **Finance**: Invoices & billing
- **Analytics**: Business insights
- **Settings**: Account settings

### ✅ UI Components
- Responsive design
- Dark mode ready
- Loading states
- Form validation
- Alert notifications

---

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Build errors after install
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Supabase connection errors
- Check `.env.local` has correct URL and key
- Verify Supabase project is active
- Check internet connection

### TypeScript errors
```bash
# Run type check
npx tsc --noEmit
```

---

## 📚 Documentation

- **README.md** - Full project documentation
- **DEPLOYMENT.md** - Deployment to Vercel guide
- **PROJECT-SUMMARY.md** - Complete file inventory
- **OVERVIEW-TEKNIS.md** - Technical architecture
- **PANDUAN-AWAL.md** - Initial planning guide

---

## 🚀 Deploy to Production

**Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Option 2: Via Vercel Dashboard**
1. Go to https://vercel.com
2. Import GitHub repository
3. Add environment variables
4. Click Deploy

See **DEPLOYMENT.md** for detailed instructions.

---

## 📞 Need Help?

- **Repository**: https://github.com/Soedirboy58/hvac-djawara
- **Issues**: Create issue on GitHub
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## 🎉 You're Ready!

Your Djawara HVAC Platform MVP is ready to use!

**Next Steps:**
1. ✅ Test locally (npm run dev)
2. ✅ Customize branding/colors
3. ✅ Add your company logo
4. ✅ Deploy to Vercel
5. ✅ Start managing your HVAC business!

---

**Happy Coding! 🚀**
