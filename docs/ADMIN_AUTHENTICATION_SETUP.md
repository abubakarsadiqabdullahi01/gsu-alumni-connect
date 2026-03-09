# Admin Setup & Authentication Guide

## Overview

Your GSU Alumni Connect platform uses **Better Auth** with a **role-based access control (RBAC)** system. Here's how professionals handle admin authentication and access:

## How Admin Authentication Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

1. User enters credentials at /login
   └─> Registration No + Password
   └─> OR Email + Password

2. Better Auth validates credentials
   └─> Checks User.registrationNo or User.email
   └─> Verifies password hash in Account.password

3. Session created (JWT token)
   └─> User.role checked

4. Role-based redirect
   ├─> role='admin' → /admin (admin dashboard)
   └─> role='user'  → /dashboard (user dashboard)

5. Admin panel protected
   └─> /admin/* requires role='admin'
   └─> All API endpoints check session.user.role
```

## Creating Admin Users (3 Methods)

### Method 1: Create New Admin with Unique Credentials ⭐ **RECOMMENDED**

**Use this for initial admin setup or adding new admins.**

```bash
# Create admin with registration number
pnpm admin:create -- --registration-no UG19/ADMIN/001 --password "SecurePass123!" --name "Admin User"

# Create admin with email (for external admins)
pnpm admin:create -- --email admin@alumni.gsu.edu.ng --password "SecurePass123!" --name "John Admin"

# Preview without creating
pnpm admin:create:preview
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

Example strong passwords:
- `Gsu@Alumni2026`
- `AdminPanel#123`
- `SecurePass!001`

**Output:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║                        ✅ ADMIN CREATED SUCCESSFULLY                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Admin Details:
  ID:                 550e8400-e29b-41d4-a716-446655440000
  Name:               Admin User
  Registration No:    UG19/ADMIN/001
  Email:              [not set]
  Role:               admin ✓
  Status:             ACTIVE ✓

Login Credentials:
  Username: UG19/ADMIN/001
  Password: SecurePass123!

Next Steps:
  1. Share these credentials with the admin securely
  2. They can login at: /login
  3. They will be redirected to: /admin
  4. They can upload graduates at: /admin/graduates
```

### Method 2: Promote Existing User to Admin

**Use this if the user already exists in the database.**

```bash
# Find user by registration number
pnpm auth:make-admin -- --registration-no UG19/ASAC/1025

# Find user by email
pnpm auth:make-admin -- --email user@example.com

# Find user by ID
pnpm auth:make-admin -- --user-id 550e8400-e29b-41d4-a716-446655440000
```

### Method 3: Use Prisma Studio (Manual)

```bash
pnpm prisma studio
```

1. Navigate to `User` table
2. Find your user
3. Change `role` field from "user" to "admin"
4. Save

---

## Complete Admin Setup Flow

### Step 1: Create Database & Run Migrations
```bash
# Generate Prisma Client
pnpm db:generate

# Apply migrations
pnpm db:migrate -- --name init
```

### Step 2: Create First Admin User
```bash
pnpm admin:create -- --registration-no UG19/ADMIN/001 --password "YourSecurePass123!" --name "Initial Admin"
```

### Step 3: Start Development Server
```bash
pnpm dev
```

### Step 4: Login as Admin
1. Go to http://localhost:3000/login
2. Enter credentials:
   - **Username:** `UG19/ADMIN/001`
   - **Password:** `YourSecurePass123!`
3. Redirected to `/admin` dashboard
4. Click **"Upload Graduates"** button

### Step 5: Upload Graduates
1. Click **"Upload Graduates"** in admin panel
2. Download the CSV template
3. Fill in graduate data
4. Upload the file
5. View results and validation errors

---

## Admin Dashboard Access

### Who Can Access?
- Users with `role = 'admin'` in the User table
- Must be authenticated (have valid session)
- Session validated on every protected route

### What Can Admins Do?
✅ Upload graduate CSV files
✅ View all graduates
✅ View upload history
✅ Manage alumni groups
✅ Post jobs
✅ Manage mentorship programs
✅ View analytics & statistics

### Protected Routes
```
/admin/*              → Requires admin role
/api/admin/*          → Requires admin role + valid session
/admin/graduates      → Upload CSV, manage records
/admin/uploads        → View upload history
```

---

## Database Structure

### User Table (Auth)
```prisma
model User {
  id              String    @id @default(uuid())
  name            String
  email           String?   @unique
  registrationNo  String    @unique
  role            String?   @default("user")  // "user" or "admin"
  accountStatus   AccountStatus @default(PENDING)
  defaultPassword Boolean   @default(true)
  
  // Relations
  accounts        Account[]
  sessions        Session[]
  graduate        Graduate?
}
```

### Account Table (Credentials)
```prisma
model Account {
  id         String @id @default(uuid())
  userId     String
  providerId String // "credential" for password-based
  accountId  String
  password   String // scrypt hash
  
  user User @relation(fields: [userId], references: [id])
}
```

### Session Table (Login)
```prisma
model Session {
  id        String
  token     String    @unique
  userId    String
  expiresAt DateTime
  user      User @relation(fields: [userId], references: [id])
}
```

---

## Security Best Practices Implemented

### ✅ Password Security
- Passwords hashed with **scrypt** (industry-standard)
- Password strength validation (8+ chars, uppercase, number, special char)
- Default passwords replaced on first login

### ✅ Session Management
- JWT-based sessions via Better Auth
- Automatic token expiration
- Secure httpOnly cookies

### ✅ Role-Based Access Control
- Admin checks on every protected route
- Unauthorized users redirected to login
- API endpoints validate role before processing

### ✅ Audit Logging
- All admin uploads logged with:
  - Admin user ID
  - File name & size
  - Records created/updated/failed
  - Timestamp

---

## Troubleshooting

### Problem: "Unauthorized" when accessing /admin
**Solution:**
- User account doesn't have admin role
- Run: `pnpm auth:make-admin -- --registration-no UG19/ASAC/1025`

### Problem: "Invalid credentials" at login
**Solution:**
- Wrong registration number or email
- Wrong password
- Verify user exists: `pnpm prisma studio` → User table

### Problem: Can't find credentials for an admin
**Solution:**
1. Open Prisma Studio: `pnpm prisma studio`
2. Find user in `User` table (check role="admin")
3. Check `Account` table for that user
4. If account missing, create one with new password using `pnpm admin:create`

### Problem: "Password must contain..." error
**Solution:**
- Use a stronger password with:
  - At least 8 characters
  - At least one uppercase letter (A-Z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*)

Example: `Gsu@Alumni2026` ✅

---

## API Endpoints for Admin

### Authentication
```bash
# Login (Registration Number)
POST /api/auth/sign-in/registration
{
  "registrationNo": "UG19/ADMIN/001",
  "password": "SecurePass123!"
}

# Login (Email - if set)
POST /api/auth/sign-in/email
{
  "email": "admin@alumni.gsu.edu.ng",
  "password": "SecurePass123!"
}
```

### Uploads
```bash
# Upload graduates CSV
POST /api/admin/uploads
Content-Type: multipart/form-data
Authorization: Bearer <session_token>

file: <CSV file>

Response:
{
  "success": true,
  "uploadId": "uuid",
  "created": 150,
  "updated": 25,
  "failed": 2,
  "message": "Successfully imported..."
}

# Get upload history
GET /api/admin/uploads?page=1&limit=10
Authorization: Bearer <session_token>
```

---

## Professional Recommendations

### For Production:
1. **Require Email Verification**
   - Add email verification step
   - Send confirmation link

2. **Implement 2FA**
   - Two-factor authentication for admin accounts
   - TOTP or SMS-based

3. **Audit All Actions**
   - Log all admin actions
   - Track who uploaded what and when
   - Store in audit log table

4. **Role Hierarchy**
   - Super Admin (full access)
   - Admin (manage graduates, uploads)
   - Moderator (view-only)

5. **Admin Portal**
   - Dashboard with key metrics
   - User management UI
   - Settings & configuration

### For Now:
- ✅ Basic role-based access control implemented
- ✅ Password hashing with scrypt
- ✅ Session management via Better Auth
- ✅ Audit logging of uploads
- ✅ CSV validation & error handling

---

## Summary

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `pnpm db:migrate` | Set up database schema |
| 2 | `pnpm admin:create` | Create first admin user |
| 3 | `pnpm dev` | Start development server |
| 4 | Login at `/login` | Authenticate as admin |
| 5 | Go to `/admin/graduates` | Upload CSV file |

**Admin is now ready to upload graduate lists!** 🎓
