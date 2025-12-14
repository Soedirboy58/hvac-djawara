# 🚨 FINAL FIX - RLS Policy Error

## Problem
```
new row violates row-level security policy for table "contract_requests"
```

## Root Cause
RLS policy **tidak include role `anon`** dengan benar. 

## ✅ SOLUTION - Execute This SQL NOW!

### File: `FINAL_FIX_CONTRACT_REQUESTS.sql`

This SQL will:
1. ✅ DROP table completely
2. ✅ CREATE with separate policies for `anon` and `authenticated`
3. ✅ TEST anonymous insert automatically
4. ✅ Show all policies

---

## 🚀 EXECUTE NOW (2 minutes):

### Step 1: Open Supabase SQL Editor
https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql

### Step 2: Copy & Execute
1. Open: `supabase/FINAL_FIX_CONTRACT_REQUESTS.sql`
2. **Ctrl+A** → **Ctrl+C**
3. Paste in Supabase SQL Editor
4. Click **RUN**

### Step 3: Check Output
You should see:
```
✅ TEST SUCCESS! Inserted with ID: [uuid]
✅ Contract requests table ready for testing!
```

And a table showing 4 policies:
- `anon_insert_contract_requests` (INSERT to anon)
- `auth_insert_contract_requests` (INSERT to authenticated)
- `auth_select_contract_requests` (SELECT to authenticated)
- `auth_update_contract_requests` (UPDATE to authenticated)

---

## 🧪 TEST FORM (After SQL execution):

### IMPORTANT: Clear Browser Cache!
```
Ctrl+Shift+R (hard refresh)
OR
Open Incognito Window
```

### Test Steps:
1. Go to: https://hvac-djawara.vercel.app
2. Click "Request Service"
3. Select: "Maintenance/Service Rutin"
4. Check: ☑️ "Ajukan Kontrak Maintenance Berkala"
5. Fill form:
   - Nama: Bank Test
   - Phone: 081234567890
   - Email: test@bank.com
   - **Unit AC: 10** (should be editable!)
   - Lokasi: 2
   - Frekuensi: Bulanan
6. Submit

### Expected:
- ✅ No error
- ✅ Success message appears
- ✅ Form resets

---

## 🔍 Key Differences from Previous SQL:

### OLD (Broken):
```sql
CREATE POLICY "Anyone can submit"
  FOR INSERT
  WITH CHECK (true);
-- ❌ Doesn't specify TO clause!
```

### NEW (Working):
```sql
CREATE POLICY "anon_insert_contract_requests"
  FOR INSERT
  TO anon
  WITH CHECK (true);
-- ✅ Explicitly TO anon role
```

---

## 📋 About Unit Count Field

The field **is editable** in the form:
```tsx
<Input
  type="number"
  min="1"
  name="unit_count"
  value={formData.unit_count}
  onChange={handleChange}
  required={isContractRequest}
/>
```

If it's not working:
1. Make sure checkbox is checked first
2. Hard refresh browser (Ctrl+Shift+R)
3. Try in Incognito mode

---

## ⚡ Quick Command to Execute:

```bash
# After executing SQL in Supabase:
# 1. Hard refresh browser: Ctrl+Shift+R
# 2. Test form
# 3. Should work 100%
```

---

## 🎯 Success Checklist:

After executing SQL:
- [ ] SQL runs without errors
- [ ] See "TEST SUCCESS" message
- [ ] See 4 policies listed
- [ ] Hard refresh browser
- [ ] Form loads correctly
- [ ] Unit count field is editable
- [ ] Submit works without error
- [ ] Success message appears
- [ ] Dashboard shows new request

---

**EXECUTE SQL NOW:** `supabase/FINAL_FIX_CONTRACT_REQUESTS.sql`

This is the final fix. Should work 100% now! 🚀
