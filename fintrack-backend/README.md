# FinTrack Backend API

**Personal Finance Tracking & Planning Web Application**  
NSU Jamshedpur · BCA Final Year Project 2023–2026

**Team:** Jay Prakash Shaw · Sourav Bhattacharjee · Sujay Kumar Giri  
**Guide:** Ritesh Kumar Jha (Assistant Professor, CS & IT)

---

## Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Runtime     | Node.js v18+                  |
| Framework   | Express.js v4                 |
| Database    | PostgreSQL v15+               |
| ORM         | Prisma v5                     |
| Auth        | JWT + Firebase Admin SDK      |
| Security    | bcryptjs, helmet, rate-limit  |
| Validation  | express-validator             |

---

## Project Structure

```
fintrack-backend/
├── prisma/
│   ├── schema.prisma       # Database schema (all 7 tables)
│   └── seed.js             # Sample data seeder
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── transaction.controller.js
│   │   ├── asset.controller.js
│   │   ├── liability.controller.js
│   │   ├── loan.controller.js
│   │   ├── goal.controller.js
│   │   ├── budget.controller.js
│   │   └── analysis.controller.js
│   ├── middleware/
│   │   └── auth.js         # JWT + Firebase token verification
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── transaction.routes.js
│   │   ├── asset.routes.js
│   │   ├── liability.routes.js
│   │   ├── loan.routes.js
│   │   ├── goal.routes.js
│   │   ├── budget.routes.js
│   │   └── analysis.routes.js
│   ├── utils/
│   │   ├── prisma.js       # Prisma client singleton
│   │   └── response.js     # Standard response helpers
│   └── index.js            # Express server entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## Setup Instructions

### Step 1 — Prerequisites

Make sure you have these installed:
- Node.js v18 or higher → https://nodejs.org
- PostgreSQL v15 or higher → https://postgresql.org
- npm or yarn

### Step 2 — Clone & Install

```bash
cd fintrack-backend
npm install
```

### Step 3 — Create PostgreSQL Database

Open pgAdmin or psql terminal and run:

```sql
CREATE DATABASE fintrack_db;
```

### Step 4 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/fintrack_db"
JWT_SECRET="generate_a_random_64_char_string_here"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:3000"
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 5 — Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Optional: Seed with sample data
npm run db:seed
```

### Step 6 — Start the Server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server will start at: **http://localhost:5000**

---

## API Endpoints

### Authentication
| Method | Endpoint              | Description                          | Auth Required |
|--------|-----------------------|--------------------------------------|---------------|
| POST   | /api/auth/register    | Register new account                 | No            |
| POST   | /api/auth/login       | Login with email/password            | No            |
| POST   | /api/auth/firebase    | Login/register via Google Firebase   | Firebase Token|
| GET    | /api/auth/me          | Get current user profile             | Yes           |
| PATCH  | /api/auth/profile     | Update name/profile                  | Yes           |

### Transactions
| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | /api/transactions              | Get all (filter: type, category, date)|
| GET    | /api/transactions/summary      | Monthly income/expense summary        |
| POST   | /api/transactions              | Add transaction                       |
| PATCH  | /api/transactions/:id          | Edit transaction                      |
| DELETE | /api/transactions/:id          | Delete transaction                    |

### Assets & Liabilities
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| GET    | /api/assets           | Get all assets     |
| POST   | /api/assets           | Add asset          |
| PATCH  | /api/assets/:id       | Edit asset         |
| DELETE | /api/assets/:id       | Delete asset       |
| GET    | /api/liabilities      | Get all liabilities|
| POST   | /api/liabilities      | Add liability      |
| PATCH  | /api/liabilities/:id  | Edit liability     |
| DELETE | /api/liabilities/:id  | Delete liability   |

### Loans & EMI
| Method | Endpoint                    | Description                      |
|--------|-----------------------------|----------------------------------|
| GET    | /api/loans                  | Get all loans                    |
| GET    | /api/loans/:id              | Get one loan with payment history|
| POST   | /api/loans                  | Add loan (auto-calculates EMI)   |
| PATCH  | /api/loans/:id              | Edit loan                        |
| PATCH  | /api/loans/:id/close        | Mark loan as closed              |
| POST   | /api/loans/:id/payments     | Record a payment                 |
| DELETE | /api/loans/:id              | Delete loan                      |

### Goals
| Method | Endpoint                       | Description               |
|--------|--------------------------------|---------------------------|
| GET    | /api/goals                     | Get all goals with summary|
| POST   | /api/goals                     | Create goal               |
| PATCH  | /api/goals/:id                 | Edit goal                 |
| POST   | /api/goals/:id/add-savings     | Add savings to goal       |
| DELETE | /api/goals/:id                 | Delete goal               |

### Budget
| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | /api/budgets          | Get budgets (filter: month, year)    |
| POST   | /api/budgets          | Set budget (upserts if exists)       |
| PATCH  | /api/budgets/:id      | Edit budget                          |
| DELETE | /api/budgets/:id      | Delete budget                        |

### Analysis (AI Insights)
| Method | Endpoint                       | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | /api/analysis/score            | Financial Health Score (0–100)       |
| GET    | /api/analysis/networth         | Net worth calculation                |
| GET    | /api/analysis/report           | 6-month income/expense report        |
| GET    | /api/analysis/categories       | Expense breakdown by category        |

---

## Request / Response Format

### All requests need this header (after login):
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Standard response format:
```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

### Error response:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

---

## Example API Calls

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jay Shaw","email":"jay@example.com","password":"secure123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jay@example.com","password":"secure123"}'
```

### Add Transaction
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":1200,"category":"Food","description":"Lunch","date":"2025-04-25"}'
```

### Get Health Score
```bash
curl http://localhost:5000/api/analysis/score \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Schema

All tables use UUID primary keys. The schema follows the synopsis exactly:

```
users           → stores all registered users
transactions    → income and expense records (linked to user)
assets          → cash, investments, property (linked to user)
liabilities     → loans, credit cards (linked to user)
loans           → loan details with EMI info (linked to user)
loan_payments   → month-by-month payment history (linked to loan)
goals           → savings goals (linked to user)
budgets         → monthly category budgets (linked to user)
```

---

## Deployment on Railway (Recommended)

1. Push code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add a PostgreSQL plugin inside the project
4. Set environment variables (Railway auto-fills DATABASE_URL)
5. Set start command: `npm start`
6. Railway will give you a URL like `https://fintrack-api.railway.app`

Then update `CLIENT_URL` in Railway env to your Netlify/Vercel frontend URL.

---

## Connecting Frontend to Backend

After deploying backend, update the frontend (`App.js`) to call the API instead of using localStorage:

```js
const API = "https://your-backend.railway.app";

// Example: fetch transactions
const res = await fetch(`${API}/api/transactions`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
```

---

*FinTrack Backend · NSU Jamshedpur · BCA Final Year 2023–2026*
