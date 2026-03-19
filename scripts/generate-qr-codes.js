#!/usr/bin/env node

/**
 * Generate test QR codes for the Loyalty App
 * Usage: node scripts/generate-qr-codes.js
 * 
 * Requires: qrencode to be installed
 * Install: brew install qrencode (macOS) or apt-get install qrencode (Linux)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testCafes = [
  { id: 'CAFE-001', name: 'Curtis Stone' },
  { id: 'CAFE-002', name: 'The Espresso Lab' },
  { id: 'CAFE-003', name: 'Brew & Bean' },
];

const outputDir = path.join(__dirname, '../test-qr-codes');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created directory: ${outputDir}`);
}

console.log('📱 Generating test QR codes...\n');

testCafes.forEach((cafe) => {
  try {
    const fileName = path.join(outputDir, `${cafe.id}.png`);
    execSync(`qrencode -o "${fileName}" "${cafe.id}"`);
    console.log(`✅ Generated: ${cafe.id} (${cafe.name})`);
  } catch (error) {
    console.error(
      `❌ Error generating QR for ${cafe.id}:`,
      error.message
    );
    console.log('   Install qrencode: brew install qrencode');
  }
});

// Also create a markdown file with instructions
const instructionsFile = path.join(outputDir, 'README.md');
const instructions = `# Test QR Codes

Generated test QR codes for the Loyalty App scanner testing.

## QR Codes

${testCafes.map((cafe) => `- **${cafe.id}** - ${cafe.name}`).join('\n')}

## How to Use

1. Print each QR code or display on another device
2. Open the Loyalty App and tap "Scan QR Code"
3. Point camera at the QR code
4. Check database for recorded stamps

## Testing the Backend

After scanning, run these queries in Supabase SQL Editor:

### Check recent scans:
\`\`\`sql
SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 5;
\`\`\`

### Check loyalty card stamps:
\`\`\`sql
SELECT ulc.*, c.name FROM user_loyalty_cards ulc
JOIN cafes c ON ulc.cafe_id = c.id
ORDER BY ulc.created_at DESC;
\`\`\`
`;

fs.writeFileSync(instructionsFile, instructions);
console.log(`\n✅ Created: ${instructionsFile}`);
console.log(`\n📁 QR codes saved to: ${outputDir}`);
console.log('💡 You can now print these or display them on another device for testing');
