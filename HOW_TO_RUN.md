# ⚡ QUICK FIX - Run Backend Immediately

## 🚀 EASIEST WAY (No Supabase Setup)

Open terminal in backend folder and run:

```bash
python app_simple.py
```

✅ This works immediately with mock data!
✅ Your frontend (already running) will connect to it
✅ Go to http://localhost:3000 to see it working

---

## 🔧 If You Want Full Features (Requires 5 min setup)

### Step 1: Setup Supabase
1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Name: `rk-textiles`
4. Wait 2 minutes for project to create

### Step 2: Create Database Tables
1. In Supabase, click "SQL Editor" (left sidebar)
2. Click "New Query"
3. Open file: `d:\Sem_6\rk-textiles-project\database\setup.sql`
4. Copy ALL the SQL
5. Paste in Supabase SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Should see "Success" message

### Step 3: Get Your API Keys
1. Click "Settings" icon (bottom left)
2. Click "API" tab
3. Copy these 2 values:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

### Step 4: Update .env File
Edit `backend\.env` file (I see you have it open in Notepad):

Replace with your actual values:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
SECRET_KEY=my-secret-123
FLASK_ENV=development
PORT=5000
```

### Step 5: Run Backend
```bash
python app.py
```

---

## 🎯 RECOMMENDATION

**Start with `app_simple.py`** to see everything working first!

Then later you can set up Supabase for the full database experience.

---

## ✅ What to Do RIGHT NOW

1. In your terminal (where you have backend folder open)
2. Run: `python app_simple.py`
3. Keep it running
4. Open browser: http://localhost:3000
5. You should see the dashboard!

Your frontend is already running ✅
Just need the backend with `app_simple.py` ✅
