# Quick Start - Backend Setup

## ✅ FIXED: Dependency Error Resolved!

The Supabase dependency conflict has been fixed by updating to compatible versions.

## 🚀 Run Backend (Choose Option 1 or 2)

### Option 1: Without Supabase (Quick Test)
If you haven't set up Supabase yet, you can run a simplified version:

```bash
cd d:\Sem_6\rk-textiles-project\backend
python app_simple.py
```

This will run on `http://localhost:5000` without requiring Supabase.

### Option 2: With Supabase (Full Features)

**Step 1: Setup Supabase**
1. Go to [supabase.com](https://supabase.com)
2. Create project: `rk-textiles`
3. Go to SQL Editor → New Query
4. Run the SQL from `database/setup.sql`
5. Get your credentials from Settings → API:
   - Project URL
   - anon/public key

**Step 2: Configure Backend**
Edit `backend\.env` file:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhb...your-key-here
SECRET_KEY=my-secret-123
```

**Step 3: Run Backend**
```bash
cd d:\Sem_6\rk-textiles-project\backend
python app.py
```

## ✅ Verify It Works

Open browser: `http://localhost:5000`

You should see:
```json
{
  "message": "R.K. Textiles API Server",
  "version": "1.0.0",
  "status": "running"
}
```

## 🔧 Updated Dependencies

Fixed version in `requirements.txt`:
- ✅ supabase==2.7.4 (was 2.3.0)
- ✅ httpx==0.27.0 (added for compatibility)

## 🐛 Still Having Issues?

Run these commands:
```bash
cd backend
pip uninstall -y supabase httpx gotrue
pip install -r requirements.txt
```

---

**Next**: Make sure frontend is running with `npm run dev` in the frontend folder!
