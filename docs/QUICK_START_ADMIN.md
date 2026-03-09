# ⚡ Quick Start: Create Admin & Upload Graduates

## Complete Setup in 5 Minutes

### ✅ Step 1: Create Your First Admin User

Open your terminal and run:

```bash
pnpm admin:create -- --registration-no UG19/ADMIN/001 --password "AdminPass123!" --name "Admin User"
```

**Password must have:**
- At least 8 characters ✓
- At least 1 UPPERCASE letter (A-Z) ✓
- At least 1 number (0-9) ✓
- At least 1 special character (!@#$%^&*) ✓

**Example strong passwords:**
- `Gsu@Alumni2026` ✓
- `AdminPanel#123` ✓
- `SecurePass!001` ✓

**You should see:**
```
✅ ADMIN CREATED SUCCESSFULLY

Admin Details:
  Registration No:   UG19/ADMIN/001
  Role:              admin ✓
  Status:            ACTIVE ✓

Login Credentials:
  Username: UG19/ADMIN/001
  Password: AdminPass123!
```

---

### ✅ Step 2: Start Development Server

```bash
pnpm dev
```

Wait for:
```
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  ✓ Ready in 2.5s
```

---

### ✅ Step 3: Login as Admin

1. Open http://localhost:3000/login
2. Enter credentials:
   - **Username:** `UG19/ADMIN/001`
   - **Password:** `AdminPass123!`
3. Click **Login**
4. You should see the **Admin Dashboard** (/admin)

---

### ✅ Step 4: Download CSV Template

1. Go to **Admin → Alumni Directory** (or click sidebar)
2. Click **"Upload Graduates"** button (top right)
3. Click **"Download CSV Template"**
4. Save file as `graduates.csv`

---

### ✅ Step 5: Prepare Graduate Data

Open `graduates.csv` in Excel or Google Sheets:

| REG.NO | SURNAME | OTHER_NAMES | SEX | STATE_OF_ORIGIN | LGA | FACULTY | COU | CLASS | CGPA | JAMB_NUMBER |
|--------|---------|-------------|-----|-----------------|-----|---------|-----|-------|------|------------|
| UG19/ASAC/1025 | ABDULLAHI | ABUBAKAR SADIQ | M | GOMBE | AKKO | AS | AC | SECOND_CLASS_UPPER | 4.12 | JAMB/2015/000001 |
| UG19/ASAC/1026 | SMITH | JOHN PAUL | M | LAGOS | IKEJA | AS | AC | FIRST_CLASS | 4.68 | JAMB/2015/000002 |
| UG19/SCZO/1080 | OBASIYA | JOSEPH | M | RIVERS | PORT HARCOURT | SC | ZO | FIRST_CLASS | 4.55 | JAMB/2014/000003 |

**Required columns:**
- REG.NO (unique registration number)
- SURNAME
- OTHER_NAMES
- FACULTY (Faculty code)
- COU (Department code)
- CLASS (must be one of: FIRST_CLASS, SECOND_CLASS_UPPER, SECOND_CLASS_LOWER, THIRD_CLASS, PASS)

**Optional columns:**
- SEX (M or F)
- STATE_OF_ORIGIN
- LGA (Local Government Area)
- CGPA (0-5)
- JAMB_NUMBER

---

### ✅ Step 6: Upload CSV File

1. Still in **"Upload Graduates"** dialog
2. Drag your `graduates.csv` into the dropzone OR click to browse
3. Wait for processing...

**You'll see:**
```
✅ Successfully imported 150 new graduates and updated 25 existing records.

Results:
  Created: 150
  Updated: 25
  Failed: 2

Validation Errors (if any):
  Row 15: Invalid degree class: FIRST
```

---

### ✅ Step 7: Review Graduates List

1. Close the upload dialog
2. You should see the **Alumni Directory** with all uploaded graduates
3. Graduates now appear in the system!

---

## 🔥 Common Issues & Fixes

### ❌ "Invalid credentials" at login
**Fix:**
- Check username: `UG19/ADMIN/001` (case-sensitive)
- Check password is correct
- Verify admin was created successfully

### ❌ "Password must contain..." error
**Fix:**
- Use a stronger password with all 4 types:
  - Uppercase: A-Z
  - Lowercase: a-z
  - Number: 0-9
  - Special: !@#$%^&*
- Example: `Admin@2026`

### ❌ "CSV file not recognized"
**Fix:**
- Save as `.csv` file (not `.xlsx`)
- Use **File > Save As > CSV UTF-8 (Comma delimited)**

### ❌ "Registration number already exists"
**Fix:**
- Each graduate must have unique REG.NO
- Check for duplicates in your CSV
- To update existing graduate, re-upload with same REG.NO (it will update)

### ❌ Upload shows validation errors for many rows
**Fix:**
- Download template again to check correct format
- Ensure CLASS values are exact: FIRST_CLASS, SECOND_CLASS_UPPER, etc.
- Verify FACULTY and COU (department) codes are correct
- Check CGPA is 0-5 if provided

---

## 📋 Checklist: Setup Complete?

- [ ] Created admin user with `pnpm admin:create`
- [ ] Saved admin credentials safely
- [ ] Started server with `pnpm dev`
- [ ] Logged in as admin at /login
- [ ] Downloaded CSV template
- [ ] Filled in graduate data
- [ ] Uploaded CSV file successfully
- [ ] Saw upload results (created/updated/failed)
- [ ] Verified graduates appear in directory

**If all checked:** ✅ **You're ready to manage alumni!**

---

## 🎯 Next Steps

Now that admin is set up and you can upload graduates:

1. **Invite other admins** (if needed)
   ```bash
   pnpm admin:create -- --registration-no UG19/ADMIN/002 --password "AdminPass123!" --name "Second Admin"
   ```

2. **Upload more graduates**
   - Repeat Steps 4-7 with new CSV files
   - System will update existing graduates if REG.NO matches

3. **Deploy to production**
   - Same admin creation process
   - Use production database URL in `.env.local`
   - Update `BETTER_AUTH_URL` to your production domain

---

## 💡 Admin Can Do:

✅ Upload graduate lists (CSV)
✅ View all graduates
✅ View upload history & validation errors
✅ Manage alumni groups
✅ Post job listings
✅ Manage mentorship programs
✅ View platform analytics
✅ Manage notifications
✅ Settings & configuration

---

## 🔐 Security Notes

- Admin credentials stored securely (scrypt hashing)
- Sessions expire automatically
- All uploads logged with timestamp & admin ID
- Role-based access control on every admin action
- CSV validation prevents invalid data

---

**Questions? See:**
- Full admin guide: `docs/ADMIN_AUTHENTICATION_SETUP.md`
- CSV upload details: `docs/ADMIN_FILE_UPLOAD_GUIDE.md`
- API reference: See `/api/admin/*` endpoints

**Good luck! 🎓**
