# Setup Instructions for R.K. Textiles Project

Follow these steps to set up and run the complete project.

## 📋 Prerequisites

Before starting, make sure you have:

- **Node.js 18+** installed ([nodejs.org](https://nodejs.org/))
- **Python 3.8+** installed ([python.org](https://python.org/))
- **Git** installed
- **Supabase account** (free tier is fine)

## 🗄️ Step 1: Database Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Name: `rk-textiles`
   - Database Password: Choose a strong password
   - Region: Select closest to you
4. Wait for project creation (~2 minutes)

### 1.2 Run Database Setup

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `database/setup.sql` in your text editor
4. Copy all the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run** (or Ctrl+Enter)
7. You should see "Success" message

### 1.3 Get API Credentials

1. Go to **Project Settings** (gear icon)
2. Click **API** tab
3. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## 🔧 Step 2: Backend Setup

### 2.1 Navigate to Backend

```bash
cd backend
```

### 2.2 Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env     # Windows
   cp .env.example .env       # Mac/Linux
   ```

2. Edit `.env` file and add your Supabase credentials:
   ```
   SUPABASE_URL=your-project-url-here
   SUPABASE_KEY=your-anon-key-here
   SECRET_KEY=your-random-secret-key
   FLASK_ENV=development
   PORT=5000
   ```

### 2.5 Run Backend Server

```bash
python app.py
```

You should see:
```
🚀 R.K. Textiles Backend Server Starting...
📍 Server running on: http://localhost:5000
```

Keep this terminal open and running.

## 💻 Step 3: Frontend Setup

### 3.1 Open New Terminal

Keep backend running, open a new terminal window.

### 3.2 Navigate to Frontend

```bash
cd frontend
```

### 3.3 Install Dependencies

```bash
npm install
```

This will take a few minutes.

### 3.4 Configure Environment

1. Create `.env.local` file from example:
   ```bash
   copy env-example.txt .env.local     # Windows
   cp env-example.txt .env.local       # Mac/Linux
   ```

2. Edit `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### 3.5 Run Frontend

```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.x
  - Local:        http://localhost:3000
```

## ✅ Step 4: Verify Setup

### 4.1 Open Application

Open your browser and go to [http://localhost:3000](http://localhost:3000)

You should see the R.K. Textiles dashboard!

### 4.2 Test the System

1. **Dashboard**: Should show stats (all zeros initially)
2. **Customers**: Should show sample customers (Grand Hotel, Royal Inn, etc.)
3. **Inventory**: Should show sample fabric items
4. **Orders**: Should be empty initially

### 4.3 Create Your First Order

1. Click **"Phone Orders"** in sidebar
2. Click **"📞 New Phone Order"**
3. Enter phone number: `9123456789` (sample customer)
4. Click **Search**
5. Select a fabric type
6. Enter quantity (e.g., 10)
7. Click **Create Order**

Success! Your first order is created.

## 🎯 Common Issues & Solutions

### Backend won't start

**Error: Module not found**
```bash
pip install -r requirements.txt
```

**Error: Supabase connection failed**
- Check your `.env` file has correct Supabase URL and key
- Make sure there are no extra spaces

### Frontend won't start

**Error: Command not found**
- Make sure Node.js is installed
- Run `npm install` again

**Error: Can't connect to API**
- Make sure backend is running on port 5000
- Check `.env.local` has correct API URL

### Database issues

**Error: Tables not found**
- Run the `setup.sql` again in Supabase SQL Editor
- Check in Table Editor that tables were created

## 🚀 Next Steps

Once everything is running:

1. **Add Customers**: Go to Customers page and add your own
2. **Add Inventory**: Go to Inventory and add fabric items
3. **Create Orders**: Test the phone order flow
4. **Generate Bills**: Bills are auto-generated with orders
5. **View Reports**: Check the Reports page for analytics

## 📚 Development Tips

- Backend runs on port **5000**
- Frontend runs on port **3000**
- Keep both terminals running while developing
- Any changes to frontend reload automatically
- Backend changes require restart (Ctrl+C then `python app.py` again)

## 🎓 For Academic Submission

Make sure to:
1. Take screenshots of all modules working
2. Test all features end-to-end
3. Generate sample bills as PDFs
4. Take screenshot of database tables in Supabase
5. Document any customizations you made

## 💡 Tips for Viva

- Understand the flow: Phone Order → Stock Check → Order Creation → Bill Generation
- Know the tech stack: Next.js + Flask + Supabase
- Explain the problem it solves for R.K. Textiles
- Demo the key features live

---

**Need Help?** Check the main README.md or backend/README.md for more details.

**Happy Coding! 🚀**
