# 🚀 QR Scanner Testing Complete Setup

Everything is now set up! Here's your complete guide to test the QR code scanner and verify backend stamping.

---

## 📱 What's Been Done

✅ **QR Scanner Implementation**
- Camera permission handling
- Real-time QR code detection  
- Supabase integration for data storage
- Loading states and error handling

✅ **Supabase Backend Connection**
- Configured with your credentials
- All dependencies installed
- Ready for stamp recording

✅ **Testing Documentation**
- SQL setup scripts
- QR code generation guide
- Verification procedures

---

## 🎯 Next Steps: 5-Minute Setup

### Step 1: Create Database Tables (Supabase)

Go to **Supabase Dashboard** → **SQL Editor** → Copy & run:

```sql
-- Create cafes table
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create loyalty cards table
CREATE TABLE user_loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id),
  stamps INT DEFAULT 0,
  rewards_redeemed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, cafe_id)
);

-- Create scans log table
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id),
  qr_code TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT now()
);

-- Insert test cafes
INSERT INTO cafes (name, location, qr_code) VALUES
('Curtis Stone', 'Melbourne, VIC', 'CAFE-001'),
('The Espresso Lab', 'Sydney, NSW', 'CAFE-002'),
('Brew & Bean', 'Melbourne, VIC', 'CAFE-003');
```

### Step 2: Generate QR Codes

**Option A: Online Generator (Easiest)**
1. Go to https://www.qr-code-generator.com/
2. Enter text: `CAFE-001` → Download
3. Repeat for `CAFE-002` and `CAFE-003`
4. Print or have them ready on another device

**Option B: Command Line** (if qrencode installed)
```bash
brew install qrencode
qrencode -o cafe-001.png "CAFE-001"
qrencode -o cafe-002.png "CAFE-002"
qrencode -o cafe-003.png "CAFE-003"
open cafe-001.png  # View in Preview
```

### Step 3: Test the Scanner

**On your phone:**
1. Open CafeLoyalty app
2. Tap **"Scan QR Code"** button
3. Grant camera permission if prompted
4. Point camera at a QR code
5. Hold steady for 2-3 seconds
6. Success alert should appear showing stamps

**Expected success message:**
```
✅ Stamp Added
Stamp added at Curtis Stone
Stamps: 1/10
```

**Reward trigger (10 stamps):**
```
🎉 Reward Earned!
You've earned a free coffee at Curtis Stone!
Total stamps: 10
```

### Step 4: Verify Backend

Go to **Supabase Dashboard** → **Database** → Check tables:

#### Table 1: `scans` 
Should have a new row with:
- `user_id`: test-user-123
- `cafe_id`: UUID of the cafe
- `qr_code`: CAFE-001
- `scanned_at`: Current timestamp

#### Table 2: `user_loyalty_cards`
Should have a new row with:
- `user_id`: test-user-123
- `cafe_id`: UUID of the cafe
- `stamps`: 1

---

## 🧪 Testing Scenarios

### Test 1: Basic Scan
```
1. Scan CAFE-001
2. Check Supabase `scans` table → Should have 1 row
3. Check `user_loyalty_cards` → Should show stamps: 1
```

### Test 2: Multiple Scans (Same Cafe)
```
1. Scan CAFE-001 10 times
2. Check `user_loyalty_cards.stamps` → Should be 10
3. Last scan should trigger reward alert
4. Check `scans` table → Should have 10 rows
```

### Test 3: Multiple Cafes
```
1. Scan CAFE-001 (stamps: 1)
2. Scan CAFE-002 (stamps: 1) 
3. Check `user_loyalty_cards` → Should have 2 rows (separate cards)
```

### Test 4: Different Users
Edit [app/scanner.tsx](app/scanner.tsx) line 82:
```typescript
const testUserId = 'test-user-123'; // ← Change this
```

Examples:
```typescript
const testUserId = 'alice@example.com';   // Test as Alice
const testUserId = 'bob@example.com';     // Test as Bob  
const testUserId = 'unknown-user';       // Test new user
```

Each user has separate loyalty cards per cafe.

---

## ✅ Troubleshooting Checklist

### QR Code Won't Scan
- [ ] Good lighting (not too bright/dark)
- [ ] Steady hand (hold 2-3 seconds)
- [ ] Good focus (camera is focused)
- [ ] Try printout instead of phone screen

### Camera Permission Denied
- [ ] Settings → CafeLoyalty → Permissions → Camera
- [ ] Enable camera access
- [ ] Restart the app

### "Unknown QR Code" Error
- [ ] Check cafe was inserted in database
- [ ] Verify `qr_code` matches exactly (case-sensitive)
- [ ] Run SQL: `SELECT qr_code FROM cafes;`

### Data Not in Supabase
- [ ] Check `env.local` has correct API URL and key
- [ ] Verify table names match (case-sensitive)
- [ ] Check browser F12 console for errors
- [ ] Make sure internet connection is active

### App Crashes on Scan
- [ ] Check browser console (F12) for JavaScript errors
- [ ] Verify Supabase tables exist
- [ ] Test with simple user ID (no special chars)

---

## 📊 Expected Database Schema

After 3 scans (1 per cafe):

**scans table:**
```
id | user_id | cafe_id | qr_code | scanned_at
---|---------|---------|---------|----------
1  | test-user-123 | UUID-1 | CAFE-001 | 2026-03-19 14:00:00
2  | test-user-123 | UUID-2 | CAFE-002 | 2026-03-19 14:00:30
3  | test-user-123 | UUID-3 | CAFE-003 | 2026-03-19 14:01:00
```

**user_loyalty_cards table:**
```
id | user_id | cafe_id | stamps | rewards_redeemed
---|---------|---------|--------|------------------
1  | test-user-123 | UUID-1 | 1 | 0
2  | test-user-123 | UUID-2 | 1 | 0
3  | test-user-123 | UUID-3 | 1 | 0
```

---

## 🎓 How It Works

**Scanner Flow:**
1. User taps "Scan QR Code"
2. Camera opens with visual frame overlay
3. Scan QRcode (text value = cafe ID, e.g., "CAFE-001")
4. System queries `cafes` table to find matching cafe
5. If found:
   - Records scan in `scans` table
   - Updates or creates loyalty card in `user_loyalty_cards`
   - Shows "Stamp Added" alert
6. If 10 stamps reached:
   - Triggers reward alert
   - Ready for redemption logic

---

## 📝 Files Modified

- `app/scanner.tsx` - QR code scanning with Supabase integration
- `app/(tabs)/index.tsx` - Added onPress handler to scan button
- `app/_layout.tsx` - Registered scanner screen
- `package.json` - Added Supabase dependencies
- `QUICK_TEST.md` - Quick start guide
- `TESTING_GUIDE.md` - Detailed testing steps

---

## 🚀 Production Ready Checklist

Before deploying to production:

- [ ] Replace `testUserId` with real user authentication
- [ ] Add error logging/analytics
- [ ] Implement proper error UI for users
- [ ] Add sound/haptic feedback on successful scan
- [ ] Test with 100+ stamps (reward system scaling)
- [ ] Add backend validation (prevent double-scanning)
- [ ] Implement rate limiting on scans
- [ ] Add user notifications via email/push
- [ ] Set up database backups
- [ ] Add admin dashboard for cafe managers

---

## 💡 Next Features to Build

1. **User Authentication** - Replace test user ID
2. **Reward Redemption** - Allow users to claim rewards
3. **Receipt/History** - Show scan history
4. **Admin Dashboard** - Cafe stats and QR management
5. **Notifications** - Alert on rewards earned
6. **Analytics** - Track popular cafes, peak times

---

**Happy Testing! 🎉**
