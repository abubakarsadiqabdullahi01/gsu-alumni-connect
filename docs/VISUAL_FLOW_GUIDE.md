# 🎯 Visual Admin Setup & Upload Flow

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADMIN SETUP JOURNEY                                │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Create Admin User (Terminal)
─────────────────────────────────────
┌─────────────────────────────────────────────────┐
│ $ pnpm admin:create                             │
│   --registration-no UG19/ADMIN/001              │
│   --password "AdminPass123!"                    │
│   --name "Admin User"                           │
└─────────────────────────────────────────────────┘
            ↓
       Creates user in database:
       ┌────────────────────────────────┐
       │ User Table                     │
       │ ├─ id: 550e8400-...           │
       │ ├─ registrationNo: UG19/...   │
       │ ├─ role: "admin" ✓            │
       │ ├─ accountStatus: "ACTIVE"    │
       │ └─ accounts: [credential]     │
       │                                │
       │ Account Table                  │
       │ ├─ userId: 550e8400-...       │
       │ ├─ password: "scrypt.hash"    │
       │ └─ providerId: "credential"   │
       └────────────────────────────────┘


STEP 2: Admin Login (Browser)
──────────────────────────────
┌────────────────────────────────────────────┐
│  http://localhost:3000/login               │
├────────────────────────────────────────────┤
│  Username: UG19/ADMIN/001                  │
│  Password: ••••••••••••                    │
│  [Login Button]                            │
└────────────────────────────────────────────┘
            ↓
    ┌──────────────────────┐
    │ Verify Credentials   │
    │ ├─ Find user by regNo│
    │ ├─ Hash password     │
    │ ├─ Compare hash      │
    │ └─ Match? ✓          │
    └──────────────────────┘
            ↓
    ┌──────────────────────┐
    │ Create Session       │
    │ ├─ Generate JWT      │
    │ ├─ Check role        │
    │ └─ role='admin' ✓    │
    └──────────────────────┘
            ↓
  ┌─────────────────────────────────┐
  │ Redirect to /admin Dashboard    │
  │ ✅ Access Granted!              │
  └─────────────────────────────────┘


STEP 3: Download Template (Admin Dashboard)
──────────────────────────────────────────────
┌─────────────────────────────────────────────────┐
│  /admin/graduates                               │
│  ┌───────────────────────────────────────────┐  │
│  │ Alumni Directory                          │  │
│  │ [Upload Graduates] ← Click here           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
            ↓
  ┌────────────────────────────────────┐
  │ Upload Dialog Opens                │
  │ ┌──────────────────────────────┐   │
  │ │ [Download CSV Template] ← Click  │
  │ └──────────────────────────────┘   │
  └────────────────────────────────────┘
            ↓
  ┌────────────────────────────────────┐
  │ API: GET /api/admin/uploads/template
  │ Returns: graduate-template.csv     │
  │ ├─ Headers                         │
  │ ├─ Sample rows                     │
  │ └─ Instructions                    │
  └────────────────────────────────────┘


STEP 4: Fill in Data (Excel/Sheets)
──────────────────────────────────────
┌──────────────────────────────────────────────┐
│ REG.NO        │ SURNAME │ OTHER_NAMES │ SEX  │
├──────────────────────────────────────────────┤
│ UG19/AS/1001  │ Smith   │ John        │ M    │
│ UG19/AS/1002  │ Johnson │ Mary        │ F    │
│ UG19/AS/1003  │ Brown   │ Michael     │ M    │
└──────────────────────────────────────────────┘
            ↓
     Save as CSV
            ↓
   graduates.csv


STEP 5: Upload CSV (Admin Dashboard)
──────────────────────────────────────
┌──────────────────────────────────────────────┐
│ Upload Dialog                                │
│ ┌──────────────────────────────────────────┐ │
│ │  Drag CSV file here                      │ │
│ │  ────────────────────────────────────────│ │
│ │        ↓ DROP FILE ↓                      │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
            ↓
      FormData sent
            ↓
  POST /api/admin/uploads
       with CSV file


STEP 6: Process on Server
──────────────────────────
┌────────────────────────────────┐
│ 1. Check auth                  │
│    ├─ Verify session ✓         │
│    └─ Check role='admin' ✓     │
├────────────────────────────────┤
│ 2. Parse CSV file              │
│    ├─ Handle quoted fields     │
│    └─ Split into rows          │
├────────────────────────────────┤
│ 3. Validate each row           │
│    ├─ Required fields? ✓       │
│    ├─ Format valid? ✓          │
│    ├─ Enum values? ✓           │
│    └─ CGPA 0-5? ✓              │
├────────────────────────────────┤
│ 4. Process graduates           │
│    ├─ Exists? → UPDATE         │
│    └─ New? → CREATE            │
├────────────────────────────────┤
│ 5. Log audit trail             │
│    ├─ Admin ID                 │
│    ├─ File name                │
│    ├─ Created/Updated/Failed   │
│    └─ Timestamp                │
└────────────────────────────────┘
            ↓
     Return results


STEP 7: View Results (UI)
──────────────────────────
┌─────────────────────────────────────┐
│ ✅ Upload Successful                │
│                                     │
│ File: graduates.csv                 │
│                                     │
│ Results:                            │
│ ├─ Created: 150 ✓                   │
│ ├─ Updated: 25 ✓                    │
│ └─ Failed:  2 ⚠️                     │
│                                     │
│ Validation Errors:                  │
│ ├─ Row 15: Invalid degree class    │
│ └─ Row 42: CGPA must be 0-5        │
│                                     │
│ [Done Button]                       │
└─────────────────────────────────────┘


RESULT: Graduates in Database
──────────────────────────────
┌──────────────────────────────────┐
│ Graduate Table                   │
│ ├─ 150 new records created       │
│ ├─ 25 existing records updated   │
│ ├─ All linked to User accounts   │
│ └─ Ready for alumni platform     │
└──────────────────────────────────┘

```

---

## Access Control Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    REQUEST TO /ADMIN/GRADUATES                │
└────────────────────────────────────────────────────────────────┘

         Request comes in
              ↓
    ┌─────────────────────────┐
    │ LAYER 1: Route Guard    │
    │ /app/(admin)/layout.tsx │
    │                         │
    │ requireAdminUser()      │
    └─────────────────────────┘
              ↓
    ┌────────────────────────────┐
    │ Check Session              │
    │ ├─ Valid token? YES ✓      │
    │ └─ Expires? NO ✓           │
    └────────────────────────────┘
              ↓
    ┌────────────────────────────┐
    │ Check Role                 │
    │ ├─ role='admin'? YES ✓     │
    │ └─ NOT 'user'              │
    └────────────────────────────┘
              ↓
    ┌────────────────────────────┐
    │ LAYER 2: API Endpoint      │
    │ /app/api/admin/uploads/    │
    │                            │
    │ Validate session again     │
    │ Validate role again        │
    └────────────────────────────┘
              ↓
    ┌────────────────────────────┐
    │ LAYER 3: Component         │
    │ Check session for render   │
    │ Conditionally show button  │
    └────────────────────────────┘
              ↓
        ✅ ACCESS GRANTED

   If any check fails → Redirect to /login or /dashboard
```

---

## Data Flow: CSV → Database

```
Input CSV:
┌──────────────────────────────────┐
│ UG19/AS/1001, Smith, John, M,... │
│ UG19/AS/1002, Jones, Mary, F,... │
│ UG19/AS/1003, Brown, Mike, M,... │
└──────────────────────────────────┘
         ↓
    [PARSE CSV]
         ↓
Row Objects:
┌────────────────────────────┐
│ {                          │
│   registrationNo: "UG19...",│
│   surname: "Smith",        │
│   otherNames: "John",      │
│   sex: "M",                │
│   ...                      │
│ }                          │
└────────────────────────────┘
         ↓
  [VALIDATE EACH ROW]
         ↓
    ┌─ Check required fields
    ├─ Check field formats
    ├─ Check enum values
    ├─ Collect errors
    └─ Keep valid rows
         ↓
  [CHECK DUPLICATES]
         ↓
  For each valid row:
    ├─ Find by registrationNo
    │  ├─ EXISTS → UPDATE
    │  └─ NEW → CREATE
    └─ Link to User account
         ↓
  [DATABASE UPDATES]
         ↓
Graduate Table:
┌─────────────────────────┐
│ registrationNo │ name   │
├─────────────────────────┤
│ UG19/AS/1001  │ S. John│
│ UG19/AS/1002  │ J. Mary│
│ UG19/AS/1003  │ B. Mike│
└─────────────────────────┘
         ↓
  [LOG AUDIT TRAIL]
         ↓
UploadAuditLog:
┌──────────────────────────────┐
│ uploadedBy: "admin-id"       │
│ fileName: "graduates.csv"    │
│ createdCount: 150            │
│ updatedCount: 25             │
│ failedCount: 2               │
│ createdAt: "2026-03-09..."   │
└──────────────────────────────┘
         ↓
  ✅ DONE - Return Results
```

---

## Database Schema Relationships

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK)          │
│ registrationNo   │
│ role = "admin"   │
│ accountStatus    │
│ defaultPassword  │
└────────┬─────────┘
         │
      1:N│
         │
         ├─────────────────────┐
         │                     │
    ┌────┴───────┐      ┌──────┴─────┐
    │   Account   │      │   Session   │
    ├─────────────┤      ├─────────────┤
    │ id (PK)     │      │ id (PK)     │
    │ userId (FK) │      │ userId (FK) │
    │ password    │      │ token       │
    │ providerId  │      │ expiresAt   │
    └─────────────┘      └─────────────┘
         
         1:N
    ┌────┴───────┐
    │  Graduate   │
    ├─────────────┤
    │ userId (FK) │
    │ fullName    │
    │ registNo    │
    │ facultyCode │
    │ degreeClass │
    └─────────────┘

Admin uploads CSV → Creates User + Graduate records → Session tracks in audit log
```

---

## Error Handling Flow

```
CSV Upload Request
       ↓
┌──────────────────────────────┐
│ Check if authenticated       │
├──────────────────────────────┤
│ YES → Continue               │
│ NO  → Return 401 Unauthorized│
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│ Check if admin role          │
├──────────────────────────────┤
│ YES → Continue               │
│ NO  → Return 403 Forbidden   │
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│ Parse CSV file               │
├──────────────────────────────┤
│ SUCCESS → Continue           │
│ FAILURE → Return 400 Bad Req │
│          (empty CSV, etc)    │
└──────────────────────────────┘
       ↓
┌────────────────────────────────────┐
│ Validate each row                  │
├────────────────────────────────────┤
│ FOR EACH ROW:                      │
│  ├─ Missing field?                 │
│  │  → Add error, skip row          │
│  ├─ Invalid enum?                  │
│  │  → Add error, skip row          │
│  ├─ Invalid CGPA?                  │
│  │  → Add error, skip row          │
│  └─ All valid?                     │
│     → Add to process queue         │
└────────────────────────────────────┘
       ↓
┌────────────────────────────────────┐
│ Process valid rows (create/update) │
├────────────────────────────────────┤
│ FOR EACH VALID ROW:                │
│  ├─ Try: Create/Update graduate    │
│  ├─ Success → Count++              │
│  └─ Failure → stats.failed++       │
└────────────────────────────────────┘
       ↓
┌────────────────────────────────────┐
│ Return Results                     │
├────────────────────────────────────┤
│ {                                  │
│   success: true,                   │
│   created: 150,                    │
│   updated: 25,                     │
│   failed: 2,                       │
│   validationErrors: [              │
│     { row: 15, message: "..." }    │
│   ]                                │
│ }                                  │
└────────────────────────────────────┘
```

---

## Security Layers Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   REQUEST TO /ADMIN                     │
└─────────────────────────────────────────────────────────┘

        ↓ Layer 1: Route Protection
        
┌─────────────────────────────────────────────────────────┐
│  app/(admin)/layout.tsx                                 │
│  ├─ await requireAdminUser()                            │
│  └─ Checks: session + role = 'admin'                    │
│                                                          │
│  ❌ Not authenticated → /login                          │
│  ❌ role ≠ 'admin'   → /dashboard                       │
│  ✅ All good        → Render children                   │
└─────────────────────────────────────────────────────────┘

        ↓ Layer 2: API Endpoint Protection
        
┌─────────────────────────────────────────────────────────┐
│  app/api/admin/uploads/route.ts                         │
│  ├─ const session = auth.api.getSession()              │
│  ├─ if (!session) return 401                           │
│  └─ if (session.user.role !== 'admin') return 403      │
│                                                          │
│  ❌ Invalid session → 401 Unauthorized                  │
│  ❌ role ≠ 'admin'  → 403 Forbidden                     │
│  ✅ All good        → Process upload                    │
└─────────────────────────────────────────────────────────┘

        ↓ Layer 3: Component Level
        
┌─────────────────────────────────────────────────────────┐
│  AdminGraduateUpload Component                          │
│  ├─ if (session?.user.role !== 'admin')               │
│  │  └─ return null (don't render)                      │
│  └─ else render upload UI                             │
│                                                          │
│  ❌ Not admin → Button doesn't show                     │
│  ✅ Is admin  → Button visible & functional            │
└─────────────────────────────────────────────────────────┘

        ↓ Layer 4: Data Validation
        
┌─────────────────────────────────────────────────────────┐
│  CSV Parsing & Validation                               │
│  ├─ Field validation (required, type)                   │
│  ├─ Enum validation (CLASS, SEX)                        │
│  ├─ Range validation (CGPA 0-5)                         │
│  ├─ Uniqueness check (registrationNo)                   │
│  └─ Detailed error messages per row                     │
└─────────────────────────────────────────────────────────┘

Result: 🔒 MULTI-LAYERED SECURITY
```

---

## Summary

✅ **4 Layers of Security** - Route, API, Component, Data
✅ **3 Ways to Create Admin** - Script, Promotion, Manual
✅ **Complete Error Handling** - Row-by-row feedback
✅ **Audit Trail** - Every upload logged
✅ **Professional Grade** - Like Google, GitHub, AWS

**Your admin panel is ready!** 🚀
