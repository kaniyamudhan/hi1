# Supabase Setup & Login Configuration Guide

## 1. Supabase Project Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Choose region closest to your users
5. Create a strong database password

### Step 2: Get Your Credentials

Once project is created, go to **Project Settings** → **API**:

- Copy your **Project URL** (starts with `https://...supabase.co`)
- Copy your **Service Role Key** (keep this SECRET - it's like admin password)

### Step 3: Update Backend `.env` File

Create or update `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Other existing env vars
DATABASE_URL=...
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256
```

---

## 2. Create Database Schema in Supabase

### Option A: Using SQL Editor (Recommended)

1. In Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `backend/supabase_schema.sql`
4. Click **Run** button

### Option B: Create Tables Manually

Go to **Database** → **Tables** → **New Table** and create:

#### Table 1: `users`

| Column          | Type      | Settings                                       |
| --------------- | --------- | ---------------------------------------------- |
| id              | uuid      | Primary Key, Auto generate (gen_random_uuid()) |
| email           | text      | Unique, Required                               |
| name            | text      | Required                                       |
| hashed_password | text      | Required                                       |
| password_text   | text      | Required (for legacy Excel export)             |
| phone           | text      | Optional                                       |
| dob             | text      | Optional                                       |
| gender          | text      | Optional                                       |
| address         | text      | Optional                                       |
| city            | text      | Optional                                       |
| state           | text      | Optional                                       |
| pincode         | text      | Optional                                       |
| is_verified     | boolean   | Default: false                                 |
| created_at      | timestamp | Auto (now())                                   |

#### Table 2: `transactions`

| Column     | Type      | Settings                   |
| ---------- | --------- | -------------------------- |
| id         | uuid      | Primary Key, Auto generate |
| user_id    | uuid      | Foreign key → users.id     |
| date       | date      | Required                   |
| amount     | decimal   | Required                   |
| category   | text      | Required                   |
| note       | text      | Optional                   |
| type       | text      | Required (expense/income)  |
| account    | text      | Optional                   |
| created_at | timestamp | Auto (now())               |

#### Table 3: `accounts`

| Column     | Type      | Settings                   |
| ---------- | --------- | -------------------------- |
| id         | uuid      | Primary Key, Auto generate |
| user_id    | uuid      | Foreign key → users.id     |
| name       | text      | Required                   |
| type       | text      | Required (bank/cash/card)  |
| balance    | decimal   | Default: 0                 |
| created_at | timestamp | Auto (now())               |

#### Table 4: `goals`

| Column         | Type      | Settings                   |
| -------------- | --------- | -------------------------- |
| id             | uuid      | Primary Key, Auto generate |
| user_id        | uuid      | Foreign key → users.id     |
| name           | text      | Required                   |
| target_amount  | decimal   | Required                   |
| current_amount | decimal   | Default: 0                 |
| deadline       | date      | Optional                   |
| created_at     | timestamp | Auto (now())               |

#### Table 5: `habits`

| Column     | Type      | Settings                        |
| ---------- | --------- | ------------------------------- |
| id         | uuid      | Primary Key, Auto generate      |
| user_id    | uuid      | Foreign key → users.id          |
| name       | text      | Required                        |
| frequency  | text      | Required (daily/weekly/monthly) |
| status     | text      | Default: 'active'               |
| created_at | timestamp | Auto (now())                    |

#### Table 6: `budget_settings`

| Column      | Type      | Settings                       |
| ----------- | --------- | ------------------------------ |
| id          | uuid      | Primary Key, Auto generate     |
| user_id     | uuid      | Foreign key → users.id, Unique |
| salary      | decimal   | Default: 0                     |
| fixed_costs | jsonb     | Default: {}                    |
| config      | text      | Optional                       |
| created_at  | timestamp | Auto (now())                   |

#### Table 7: `password_resets`

| Column     | Type      | Settings                   |
| ---------- | --------- | -------------------------- |
| id         | uuid      | Primary Key, Auto generate |
| email      | text      | Required                   |
| token      | text      | Required                   |
| expires    | timestamp | Required                   |
| used       | boolean   | Default: false             |
| created_at | timestamp | Auto (now())               |

---

## 3. Enable Row Level Security (RLS) - OPTIONAL but Recommended

For security, enable RLS on all tables so users can only access their own data:

### For each table (users, transactions, accounts, goals, habits, budget_settings):

1. Go to **Database** → **Tables** → Select table → **RLS**
2. Click **Enable RLS**
3. Add policy:
   - **New Policy** → **From Template** → **Enable read access for users based on user_id**
   - Add similar policies for insert, update, delete

Example for `transactions` table:

```sql
-- SELECT policy
CREATE POLICY "Users can view their transactions"
ON transactions
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert their transactions"
ON transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update their transactions"
ON transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete their transactions"
ON transactions
FOR DELETE
USING (auth.uid() = user_id);
```

---

## 4. Login Page Setup - Frontend Changes

### Current Login Flow (No Changes Needed)

The frontend login page remains **unchanged**:

- User enters email + password
- Submits to backend `/auth/login` endpoint
- Backend validates credentials against Supabase `users` table
- Backend returns JWT token
- Frontend stores token in localStorage
- Frontend uses token in subsequent requests

### Backend Auth Flow (Already Updated)

✅ **Already migrated to Supabase:**

- `app/routers/auth.py` - Uses Supabase `users` table instead of MongoDB
- `app/auth.py` - Returns user with `id` field instead of `_id`
- All password hashing with bcrypt remains the same
- JWT token generation remains the same

### Verify Login Works:

1. Start backend: `python -m uvicorn app.main:app --reload`
2. Test signup:
   ```bash
   curl -X POST http://localhost:8000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "test123456"
     }'
   ```
3. Test login:
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "test123456"
     }'
   ```
4. Should receive: `{"access_token": "...", "token_type": "bearer", "user_name": "Test User"}`

---

## 5. Test API Endpoints

### Get Current User (with token):

```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Transaction:

```bash
curl -X POST http://localhost:8000/transactions/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "date": "2026-04-28",
    "amount": 50.00,
    "category": "Food",
    "note": "Lunch",
    "type": "expense",
    "account": "Cash"
  }'
```

### Get All Transactions:

```bash
curl -X GET http://localhost:8000/transactions/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 6. Verify Data Persistence

### Test 1: Multi-Month Data

1. Add transaction for April 2026
2. Add transaction for May 2026
3. Query `/transactions/` → Should return **all** transactions (no deletion by month)
4. Verify data appears in Supabase dashboard

### Test 2: Data Survives Restarts

1. Add some transactions
2. Stop backend server
3. Start backend server again
4. Query `/transactions/` → Should still have all data

### Test 3: Excel Export (Optional)

```bash
curl -X POST http://localhost:8000/excel/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

curl -X GET http://localhost:8000/excel/download \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  > transactions.xlsx
```

---

## 7. Frontend Connection - No Changes Needed!

The frontend API calls in `src/lib/api.ts` already work with the backend:

```typescript
// Already configured correctly
const API_BASE = "http://localhost:8000";

// Login remains the same
export const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.json(); // Returns { access_token, token_type, user_name }
};

// All other endpoints work automatically with the new Supabase backend
```

---

## 8. Troubleshooting

### Issue: "Connection to Supabase failed"

- ✅ Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- ✅ Check Supabase project is running (Dashboard should be accessible)
- ✅ Verify project URL matches your actual project URL

### Issue: "Email already registered" on signup with new email

- ❌ Database migration issue - check schema creation
- ✅ Drop all tables and recreate from `supabase_schema.sql`

### Issue: "Transaction not found" on GET after POST

- ❌ Supabase RLS policies too restrictive
- ✅ Disable RLS initially for testing, re-enable after verification

### Issue: "Invalid credentials" on login

- ✅ Verify user exists in Supabase `users` table (check dashboard)
- ✅ Verify password hash is stored correctly

---

## 9. Migration Checklist

- [ ] Supabase project created
- [ ] `.env` file updated with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] All database tables created (via SQL schema file)
- [ ] RLS policies enabled (optional for production)
- [ ] Backend compiled successfully (`python -m py_compile app/**/*.py`)
- [ ] Login endpoint tested and working
- [ ] Create transaction endpoint tested
- [ ] Get transactions endpoint tested
- [ ] Multi-month data verified (no deletion)
- [ ] Frontend login page working (no code changes needed)
- [ ] Excel export tested

---

## 10. Summary: What Changed & What Didn't

### ✅ Changed (Backend Only):

- Database layer: MongoDB → Supabase
- Data access: PyMongo → Supabase REST API
- ID format: MongoDB ObjectId → UUID strings
- Query format: Mongo operators → Supabase REST params
- Primary storage: Mongo collections → Postgres tables
- Startup: No longer need MongoDB Atlas credentials

### ❌ No Changes (Frontend & API):

- Login form UI - exactly the same
- API endpoints - same URLs and response format
- Token management - same JWT approach
- Frontend data structures - same shape
- Excel export - still available on demand

---

## 11. Environment Variables Reference

```env
# Supabase credentials
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_ANON_KEY=[your-anon-key]

# Auth settings (unchanged)
SECRET_KEY=your-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Optional: if you have other configs
DEBUG=False
```

This completes the migration! The app is now using Supabase as the primary database with full transaction history persistence.
