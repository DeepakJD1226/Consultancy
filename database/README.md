# Database Setup Instructions

## 🗄️ Supabase Database Setup

Follow these steps to set up your database:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: rk-textiles
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
5. Wait for the project to be created (~2 minutes)

### 2. Run the Setup SQL

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `setup.sql`
4. Paste it into the SQL editor
5. Click **"Run"** or press `Ctrl+Enter`
6. You should see "Success. No rows returned" message

### 3. Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see all 6 tables:
   - `customers`
   - `inventory`
   - `orders`
   - `bills`
   - `mills`
   - `raw_materials`
3. Click on each table to see the sample data

### 4. Get Your API Credentials

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** tab
3. Copy these values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long string starting with "eyJ...")
4. Save these for your `.env` file

### 5. Configure Backend

1. Go to `backend/.env` file
2. Update these values:
   ```
   SUPABASE_URL=your-project-url-here
   SUPABASE_KEY=your-anon-key-here
   ```

### 6. Configure Frontend

1. Go to `frontend/.env.local` file
2. Add these values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

## ✅ Verification

To verify everything is working:

1. Go to **Table Editor** in Supabase
2. Check that sample data exists in:
   - `mills` (2 mills)
   - `customers` (3 customers)
   - `inventory` (5 fabric items)

## 🔒 Security Notes

- The **anon key** is safe to use in frontend code
- Never share your **service_role key** or put it in frontend code
- For production, enable Row Level Security (RLS) policies

## 📊 Sample Data Included

The setup script includes:
- **2 Mills**: Sunrise Cotton Mill, Modern Textiles Mill
- **3 Customers**: Grand Hotel, Royal Inn, Textile Retailers Ltd
- **5 Inventory Items**: Various cotton fabrics in different colors

You can add more data through the application or directly in the Table Editor.

## 🐛 Troubleshooting

**Error: "relation already exists"**
- This means tables are already created
- You can drop them first or skip this step

**Error: "permission denied"**
- Make sure you're logged into the correct Supabase project
- Try refreshing the SQL Editor page

**Can't see tables in Table Editor**
- Wait a few seconds and refresh the page
- Check if the SQL ran successfully (no red errors)

---

**Next Steps**: Run your Flask backend and Next.js frontend!
