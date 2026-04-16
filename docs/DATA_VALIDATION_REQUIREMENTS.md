# Data Validation Requirements for Import

## Registration Number Validation Rules

### Valid Format:
```
UG{YY}/{FACULTY}{DEPT}/{NUMBER}

Example: UG18/SCZO/1080
         ^^   ^^^^  ^^^^
         |    |     └─ Sequential number (usually 3-4 digits)
         |    └─────── Faculty code (2-4 letters)
         └─────────── Year (15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25...)
```

### Requirements:
- ✅ Must start with "UG"
- ✅ Must contain "/" characters
- ✅ Minimum length: 5 characters (UG00/X or similar)
- ✅ Cannot be empty or whitespace-only

### Will Be REJECTED:
```
❌ "" (empty)
❌ "   " (whitespace only)
❌ "UG" (too short)
❌ "123" (no UG prefix)
❌ "UG1" (too short)
❌ "2018" (year only)
```

---

## Name Validation Rules

### At Least ONE of These Required:
1. **FULLNAME** column has content (full name in one field)
2. **SURNAME** column has content (family name)
3. **OTHERNAME** / **OTHER NAMES** column has content (first/middle names)

### Examples:

**✅ VALID:**
```
| REG.NO      | FULLNAME     | SURNAME | OTHERNAME |
|-------------|--------------|---------|-----------|
| UG18/SC/123 | John Smith   |         |           |  ← fullName provided
| UG18/SC/124 |              | Smith   | John      |  ← surname + othernames
| UG18/SC/125 |              | Doe     |           |  ← surname provided
```

**❌ INVALID:**
```
| REG.NO      | FULLNAME | SURNAME | OTHERNAME |
|-------------|----------|---------|-----------|
| UG18/SC/126 |          |         |           |  ← all name fields empty → REJECTED
| UG18/SC/127 |          |         |    .      |  ← only punctuation → REJECTED
```

---

## Other Validation Rules

### Sex/Gender Field:
- ✅ "M" → Male
- ✅ "F" → Female
- ✅ Empty/blank → Acceptable (marked as unknown)
- ❌ "M/F", "Male", "MALE" → Not recognized (treated as unknown)

### Degree Class:
Valid values (any of these formats accepted):
- ✅ "1", "FIRST CLASS", "FIRST_CLASS", "WITH FIRST CLASS HONOURS"
- ✅ "2.1", "SECOND CLASS UPPER", "2ND CLASS UPPER"
- ✅ "2.2", "SECOND CLASS LOWER", "2ND CLASS LOWER"
- ✅ "3", "THIRD CLASS", "WITH THIRD CLASS HONOURS"
- ✅ "PASS"
- ✅ Empty/blank → Acceptable (marked as unknown)

### CGPA/GPA:
- ✅ Numeric value: 3.45, 3.5, 4.0
- ✅ Empty/blank → Acceptable
- ❌ Non-numeric: "3.45 out of 4", "GOOD" → Treated as null

### State of Origin:
- ✅ Valid Nigerian state names (e.g., "Lagos", "Oyo", "Abuja")
- ✅ Empty/blank → Acceptable
- ❌ Abbreviations: "LG" for Lagos → Not recognized

### Faculty & Department:
- ✅ Extracted from registration number automatically
- ✅ Can be overridden if faculty/department columns provided
- ✅ Empty → Uses registration number extraction

---

## How to Check Your Excel File

### Using Excel Filters:

1. **Find empty registration numbers:**
   - Select "REG.NO" column
   - Apply AutoFilter (Data → Filter)
   - Filter for blanks (empty cells)
   - Delete or fix these rows

2. **Find short registration numbers:**
   - Add a helper column with formula: `=LEN(A2)`
   - Filter for values < 5
   - Review and fix these rows

3. **Find missing names:**
   - Add a helper column: `=IF(AND(B2="", C2="", D2=""), "MISSING", "OK")`
   - Filter for "MISSING"
   - Add name data or delete rows

4. **Find duplicate registration numbers:**
   - Select "REG.NO" column
   - Use Data → Remove Duplicates (or manually check)
   - Keep only one row per registration number

### Using Excel Formulas:

```excel
=AND(LEN(A2)>=5, A2<>"", OR(B2<>"", C2<>"", D2<>""))
```
This formula returns TRUE if row 2 is valid (all requirements met).

---

## Import Process

### Before Upload:
1. ✅ Run validation checks above
2. ✅ Remove or fix invalid rows
3. ✅ Verify no empty registration numbers
4. ✅ Ensure all rows have at least a name

### During Upload:
1. Select the cleaned Excel file
2. Choose the graduation year sheets to import
3. Click "Import Graduates"
4. Wait for processing

### After Upload:
1. Review the import results:
   - Created: number of new accounts
   - Updated: number of existing accounts updated
   - Failed: any rows that failed import (should be minimal)
   
2. Download error report if any failures
3. Review and fix reported issues
4. Re-import if needed

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 908 rows failed | Missing/invalid registration numbers | Check REG.NO column for empty/short values |
| 200 created, 0 updated | New data | Normal - accounts created for first time |
| Duplicates in report | Same reg.no in multiple sheets | Keep in first occurrence, remove from others |
| Names showing as "Unknown" | Both name fields empty | Fill FULLNAME or SURNAME + OTHERNAME |

---

## Contact Support

If you encounter issues after following these steps:
1. Note the specific rows/records failing
2. Include the error messages from the import report
3. Prepare a sample of the problematic data (with sensitive info removed)
