# QR Code Scanner Testing Guide

## Step 1: Set Up Supabase Database Tables

### 1.1 Create the `cafes` table
```sql
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 1.2 Create the `user_loyalty_cards` table
```sql
CREATE TABLE user_loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id),
  stamps INT DEFAULT 0,
  rewards_redeemed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, cafe_id),
  FOREIGN KEY (cafe_id) REFERENCES cafes(id)
);
```

### 1.3 Create the `scans` table (logs each scan/stamp)
```sql
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id),
  qr_code TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (cafe_id) REFERENCES cafes(id)
);
```

## Step 2: Insert Test Data

### Add sample cafes with QR codes:
```sql
INSERT INTO cafes (name, location, qr_code) VALUES
('Curtis Stone', 'Melbourne, VIC', 'CAFE-001'),
('The Espresso Lab', 'Sydney, NSW', 'CAFE-002'),
('Brew & Bean', 'Melbourne, VIC', 'CAFE-003');
```

## Step 3: Generate Test QR Codes

Use these online QR code generators:
- **https://www.qr-code-generator.com/** (Free)
- **https://qr.io/** (Simple & clean)

### Test QR Codes to Create:
1. **Cafe 1:** Text value: `CAFE-001`
2. **Cafe 2:** Text value: `CAFE-002`
3. **Cafe 3:** Text value: `CAFE-003`

### Quick way to generate: 
Use your terminal to print QR codes:
```bash
# Install qrencode if you haven't
brew install qrencode

# Generate QR codes
qrencode -o cafe-001.png "CAFE-001"
qrencode -o cafe-002.png "CAFE-002"
qrencode -o cafe-003.png "CAFE-003"

# Display in terminal
open cafe-001.png
```

## Step 4: Test the Scanner

### Testing checklist:
- [ ] Open app and tap "Scan QR Code" button
- [ ] Grant camera permission when prompted
- [ ] Point camera at one of the generated QR codes
- [ ] Check that QR code data is displayed in alert

## Step 5: Verify Backend Recording

### Check Supabase Dashboard:
1. Go to https://supabase.com → Your Project → Database
2. Check the **scans** table to see if your scan was recorded
3. Check **user_loyalty_cards** to see if stamps increased

### Alternative: Query via Terminal
```bash
# View all scans
SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 10;

# View loyalty cards with stamp count
SELECT ulc.*, c.name 
FROM user_loyalty_cards ulc
JOIN cafes c ON ulc.cafe_id = c.id
ORDER BY ulc.created_at DESC;
```

## Step 6: Test Complete Flow

1. **Scan QR code** → Should show cafeid in alert
2. **Open Supabase Dashboard** → Check if scan is recorded in `scans` table
3. **Verify stamps** → Check `user_loyalty_cards` shows +1 stamp
4. **Repeat 10 times** → Verify stamp counter reaches 10
5. **Check rewards** → Verify rewards logic triggers at stamp=10

## Troubleshooting

### QR Code not scanning?
- Ensure good lighting
- Hold steady for 2-3 seconds
- Try different angles
- Print QR code instead of phone screen

### Data not appearing in Supabase?
- Check Supabase connection string in `env.local`
- Verify columns exist in database
- Check browser console for errors (F12)
- Ensure user_id is set (currently hardcoded in scanner)

### Camera permission denied?
- Go to Settings → App Permissions → Camera
- Grant camera access and restart app
