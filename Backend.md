# ⚙️ Backend Documentation — CA Firm Internal App

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18.x+ | Runtime |
| Express.js | 4.x | API Framework |
| PostgreSQL | 15.x | Main Database |
| Neon | — | Serverless PostgreSQL Hosting |
| Firebase Admin SDK | 12.x | Token Verification |
| pg | 8.x | PostgreSQL Client |
| dotenv | 16.x | Environment Variables |
| cors | 2.x | Cross-Origin Requests |

---

## Project Structure

```
backend/
├── server.js                    # Entry point — Express app + route mounting
├── package.json
├── seedAdmin.js                 # Script to seed admin user
├── .env                         # Secret keys (never commit)
├── .env.example                 # Template for .env
│
├── config/
│   ├── db.js                    # PostgreSQL pool (Neon connection)
│   └── firebase.js              # Firebase Admin SDK init
│
├── middleware/
│   └── authMiddleware.js        # verifyToken + isAdmin
│
├── models/
│   └── schema.sql               # All CREATE TABLE statements — run once
│
├── controllers/
│   ├── authController.js        # registerUser, getMe
│   ├── userController.js        # getProfile, updateProfile
│   ├── serviceController.js     # CRUD for services
│   ├── employeeController.js    # Employee directory + skill 
│   ├── learningController.js    # Learning interests
│   ├── resourceController.js    # Resources / lecture links
│   └── adminController.js       # Stats, user management
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── serviceRoutes.js
│   ├── employeeRoutes.js
│   ├── learningRoutes.js
│   ├── resourceRoutes.js
│   └── adminRoutes.js
│
└── utils/
    └── driveUpload.js           # Google Drive upload utility
```

---

## Environment Variables (.env)

```env
PORT=5000
NODE_ENV=development

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# JWT (reserved for future use)
JWT_SECRET=your_super_secret_key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com

# CORS
FRONTEND_URL=http://localhost:5173
```

> **How to get Firebase Admin credentials:**
> Firebase Console → Project Settings → Service Accounts → Generate New Private Key → download JSON → copy values into .env

---

## Database Schema

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | Auto increment |
| firebase_uid | VARCHAR(128) UNIQUE | Primary identifier across all tables |
| email | VARCHAR(255) UNIQUE | |
| full_name | VARCHAR(255) | |
| role | VARCHAR(20) | `employee` or `admin` (default: employee) |
| designation | VARCHAR(255) | e.g. CA, Article Assistant |
| department | VARCHAR(255) | |
| phone | VARCHAR(20) | |
| avatar_url | TEXT | Firebase Storage URL |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `services`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| title | VARCHAR(255) | Service name |
| description | TEXT | |
| category | VARCHAR(100) | e.g. Audit, GST, ITR |
| created_by | VARCHAR(128) FK→users | firebase_uid |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `employee_services` (who KNOWS what)
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| firebase_uid | VARCHAR FK→users | |
| service_id | INT FK→services | |
| proficiency | VARCHAR(50) | beginner / intermediate / expert |
| added_at | TIMESTAMP | |
| UNIQUE | (firebase_uid, service_id) | No duplicates |

#### `learning_interests` (who WANTS to learn what)
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| firebase_uid | VARCHAR FK→users | |
| service_id | INT FK→services | |
| status | VARCHAR(50) | interested / in_progress / completed |
| added_at | TIMESTAMP | |
| UNIQUE | (firebase_uid, service_id) | No duplicates |

#### `resources`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| title | VARCHAR(255) | |
| description | TEXT | |
| url | TEXT | YouTube / Drive / External |
| resource_type | VARCHAR(50) | video / article / pdf / other |
| service_id | INT FK→services | Optional link to service |
| added_by | VARCHAR FK→users | firebase_uid |
| created_at | TIMESTAMP | |

---

## API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ Public | Save Firebase user to DB after signup |
| GET | `/me` | ✅ Token | Get current user's DB record |

**POST /register body:**
```json
{
  "firebase_uid": "abc123",
  "email": "user@firm.com",
  "full_name": "Rahul Sharma",
  "designation": "CA",
  "department": "Audit"
}
```

---

### User Routes — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ Token | Full profile with known services + learning interests |
| PUT | `/profile` | ✅ Token | Update name, designation, avatar_url, etc. |

---

### Service Routes — `/api/services`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ Token | All services with employee count |
| GET | `/:id` | ✅ Token | Single service + employees + resources |
| POST | `/` | ✅ Token | Create new service |
| PUT | `/:id` | ✅ Token | Update service |
| DELETE | `/:id` | 🔑 Admin | Delete service |

---

### Employee Routes — `/api/employees`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ Token | All employees with their services |
| GET | `/:uid` | ✅ Token | Single employee profile |
| POST | `/services` | ✅ Token | Add service to own profile |
| DELETE | `/services/:serviceId` | ✅ Token | Remove service from own profile |

---

### Learning Routes — `/api/learning`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ Token | My learning interests |
| GET | `/all` | 🔑 Admin | All employees' learning interests |
| POST | `/` | ✅ Token | Mark interest in a service |
| PUT | `/:serviceId` | ✅ Token | Update status (in_progress, completed) |
| DELETE | `/:serviceId` | ✅ Token | Remove learning interest |

---

### Resource Routes — `/api/resources`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/?service_id=` | ✅ Token | All resources (filter by service optional) |
| POST | `/` | ✅ Token | Add new resource |
| DELETE | `/:id` | 🔑 Admin | Delete resource |

---

### Admin Routes — `/api/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats` | 🔑 Admin | Dashboard: counts, top wanted, skill gaps |
| GET | `/users` | 🔑 Admin | All users |
| PUT | `/users/:uid/role` | 🔑 Admin | Change user role (employee/admin) |
| DELETE | `/users/:uid` | 🔑 Admin | Delete user |

---

## Middleware

### `verifyToken`
- Reads `Authorization: Bearer <token>` header
- Verifies Firebase ID Token using Admin SDK
- Attaches `req.user = { uid, email, ... }` to request

### `isAdmin`
- Must be used AFTER `verifyToken`
- Queries DB: checks `users.role = 'admin'` for `req.user.uid`
- Returns 403 if not admin

**Usage:**
```js
router.delete('/:id', verifyToken, isAdmin, deleteService);
```

---

## Setup & Run

```bash
cd backend
npm install

# Create .env from template
cp .env.example .env
# → Fill in DATABASE_URL, Firebase credentials, etc.

# Run schema on Neon (one-time)
# Copy models/schema.sql → paste in Neon SQL Editor → Run

# Start dev server
npm run dev
# → http://localhost:5000
```

---

## Important Rules

1. ❌ Never use Firebase as the main database — only Auth + Storage
2. ✅ All DB reads/writes go through Express API
3. 🖼️ Store only Firebase Storage URLs in DB, never raw files
4. 🔑 Use `firebase_uid` as the user identifier across all tables
5. 🔒 Always protect routes with `verifyToken`; admin routes also need `isAdmin`