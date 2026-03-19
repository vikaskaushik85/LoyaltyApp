# Quick Testing Guide for QR Scanner

## 🚀 Quick Start (5 minutes)

### Step 1: Generate Test QR Codes Online
Go to: https://www.qr-code-generator.com/

Create 3 QR codes with these text values:
1. `CAFE-001` → Save as cafe-001.png
2. `CAFE-002` → Save as cafe-002.png  
3. `CAFE-003` → Save as cafe-003.png

### Step 2: Set Up Supabase Tables
Go to Supabase Dashboard → SQL Editor → Run this:

```sql
-- Create cafes table
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Insert test cafes
INSERT INTO cafes (name, location, qr_code) VALUES
('Curtis Stone', 'Melbourne, VIC', 'CAFE-001'),
('The Espresso Lab', 'Sydney, NSW', 'CAFE-002'),
('Brew & Bean', 'Melbourne, VIC', 'CAFE-003');

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
```

### Step 3: Test the Scanner

**On your phone:**
1. Open the app
2. Tap "Scan QR Code" button
3. Print or display one of the QR codes you created
4. Point camera at it
5. Wait for success alert showing stamps added

**Example success response:**
```
✅ Stamp Added
Stamp added at Curtis Stone
Stamps: 1/10
```

### Step 4: Verify in Supabase

Go to Supabase Dashboard → Database:

**Check Table 1: `scans`**
```
user_id: test-user-123
cafe_id: (UUID of Curtis Stone)
qr_code: CAFE-001
scanned_at: 2026-03-19 14:32:45
```

**Check Table 2: `user_loyalty_cards`**
```
user_id: test-user-123
cafe_id: (UUID of Curtis Stone)
stamps: 1
```

## 📋 Testing Checklist

- [ ] QR codes generated (3 codes)
- [ ] Supabase tables created
- [ ] Camera permission granted
- [ ] First scan successful
- [ ] Alert shows cafe name
- [ ] Supabase `scans` table has record
- [ ] Supabase `user_loyalty_cards` shows stamps = 1
- [ ] Second scan increments to stamps = 2
- [ ] 10th scan triggers reward message: "🎉 Reward Earned!"

## 🔧 Testing Different Users

To test with different users, edit [scanner.tsx](../app/scanner.tsx) line:
```typescript
const testUserId = 'test-user-123'; // ← Change this value
```

Examples:
- `const testUserId = 'user-alice';` → Tests Alice's account
- `const testUserId = 'user-bob';` → Tests Bob's account

Each user will have separate loyalty cards.

## 🐛 Troubleshooting

### QR code won't scan
- ✅ Ensure good lighting
- ✅ Hold phone steady for 2-3 seconds
- ✅ Try different angles
- ✅ Print the QR code (don't use phone screen)

### Camera permission denied
- ✅ Settings → App Permissions → CafeLoyalty
- ✅ Enable Camera
- ✅ Restart the app

### Data not in Supabase
- ✅ Check `env.local` has correct credentials
- ✅ Verify table names match exactly
- ✅ Open browser console (F12) to see errors
- ✅ Run `SELECT * FROM scans;` in Supabase SQL editor

### "Unknown QR Code" error
- ✅ Cafe not in database - run INSERT query above
- ✅ QR code value doesn't match (check capitalization)

## 💡 Pro Tips

1. **Test with 10 scans** to see the 🎉 reward trigger
2. **Test multiple users** by changing `testUserId`
3. **Test multiple cafes** by scanning CAFE-001, CAFE-002, etc.
4. **Monitor live** by keeping Supabase dashboard open while scanning

## 📱 Next Steps (Production)

When ready for production:
1. Replace `testUserId` with actual user authentication
2. Use `supabase.auth.getUser()` to get current user
3. Implement proper error handling and logging
4. Add analytics to track scan success rates
