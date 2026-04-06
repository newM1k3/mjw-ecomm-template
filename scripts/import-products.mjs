/**
 * import-products.mjs
 * -------------------
 * One-time migration script: reads Camera_Gear_Master_Catalog_CAD.xlsx
 * and imports all products into PocketBase.
 *
 * Usage:
 *   node scripts/import-products.mjs
 *
 * Prerequisites:
 *   npm install xlsx pocketbase   (run once in the scripts/ folder or project root)
 *
 * Environment variables (set in .env or export before running):
 *   PB_URL           PocketBase instance URL  e.g. https://mjwdesign-core.pockethost.io
 *   PB_ADMIN_EMAIL   Superuser email
 *   PB_ADMIN_PASSWORD Superuser password
 *
 * The script is safe to re-run: it checks for an existing record with the
 * same brand_model + category before creating, so duplicates are skipped.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import PocketBase from 'pocketbase';

// ─── Config ──────────────────────────────────────────────────────────────────

const PB_URL           = process.env.PB_URL            || 'https://mjwdesign-core.pockethost.io';
const PB_ADMIN_EMAIL   = process.env.PB_ADMIN_EMAIL    || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

const __dirname = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = resolve(__dirname, '../Camera_Gear_Master_Catalog_CAD.xlsx');

// ─── Category normalisation map ───────────────────────────────────────────────
// Spreadsheet value → PocketBase category value (must match config.ts CATEGORIES)
const CATEGORY_MAP = {
  'Camera':      'Cameras',
  'Lens':        'Lenses',
  'Accessory':   'Accessories',
  'Flash':       'Flashes',
  'Film':        'Film',
  // Merge small categories into Accessories
  'Meter':       'Accessories',
  'Module':      'Accessories',
  'Collectible': 'Accessories',
  'Bulbs':       'Accessories',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseCategory(raw) {
  const trimmed = (raw ?? '').trim();
  return CATEGORY_MAP[trimmed] ?? 'Accessories';
}

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function cleanNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.error('ERROR: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set.');
    console.error('  export PB_ADMIN_EMAIL=you@example.com');
    console.error('  export PB_ADMIN_PASSWORD=yourpassword');
    process.exit(1);
  }

  // ── 1. Read spreadsheet ──
  console.log(`\nReading spreadsheet: ${XLSX_PATH}`);
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rows     = XLSX.utils.sheet_to_json(sheet);
  console.log(`  Found ${rows.length} rows.`);

  // ── 2. Authenticate ──
  console.log(`\nConnecting to PocketBase: ${PB_URL}`);
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log('  Authenticated as superuser.');

  // ── 3. Import rows ──
  let created = 0;
  let skipped = 0;
  let errors  = 0;

  console.log('\nImporting products...\n');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const brand_model       = cleanString(row['Brand/Model']);
    const category          = normaliseCategory(row['Category']);
    const details           = cleanString(row['Details']);
    const condition_rating  = cleanString(row['Condition']);
    const quick_sale_price  = cleanNumber(row['Quick-Sale Price (CAD)']);
    const collector_price   = cleanNumber(row['Collector/Online Price (CAD)']);
    const special_notes     = cleanString(row['Special Notes']);

    if (!brand_model) {
      console.warn(`  [Row ${i + 2}] Skipping — no Brand/Model value.`);
      skipped++;
      continue;
    }

    // Check for duplicate (same brand_model + category)
    try {
      const existing = await pb.collection('products').getFirstListItem(
        `brand_model = "${brand_model.replace(/"/g, '\\"')}" && category = "${category}"`
      );
      if (existing) {
        console.log(`  [${i + 2}] SKIP  ${brand_model} (${category}) — already exists`);
        skipped++;
        continue;
      }
    } catch {
      // getFirstListItem throws a 404 when no record found — that's expected, continue to create
    }

    try {
      await pb.collection('products').create({
        category,
        brand_model,
        details,
        condition_rating,
        quick_sale_price,
        collector_price,
        special_notes,
        is_sold:      false,
        is_available: true,
        is_featured:  false,
      });
      console.log(`  [${i + 2}] OK    ${brand_model} (${category})`);
      created++;
    } catch (err) {
      console.error(`  [${i + 2}] ERROR ${brand_model}: ${err.message}`);
      errors++;
    }

    // Small delay to avoid hammering the API
    await new Promise(r => setTimeout(r, 80));
  }

  // ── 4. Summary ──
  console.log('\n─────────────────────────────────────────');
  console.log(`  Import complete`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${skipped}  (already existed)`);
  console.log(`  Errors  : ${errors}`);
  console.log('─────────────────────────────────────────\n');

  if (errors > 0) {
    console.warn('Some records failed. Check the error messages above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
