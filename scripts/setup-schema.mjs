/**
 * setup-schema.mjs
 * ----------------
 * One-time script: creates the products, orders, and settings collections
 * in PocketBase with the correct fields and API rules.
 *
 * Run BEFORE import-products.mjs.
 *
 * Usage:
 *   node scripts/setup-schema.mjs
 *
 * Environment variables:
 *   PB_URL            e.g. https://mjwdesign-core.pockethost.io
 *   PB_ADMIN_EMAIL    Superuser email
 *   PB_ADMIN_PASSWORD Superuser password
 *
 * Safe to re-run: existing collections are skipped, not overwritten.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PocketBase = require('pocketbase/cjs');

const PB_URL            = process.env.PB_URL            || 'https://mjwdesign-core.pockethost.io';
const PB_ADMIN_EMAIL    = process.env.PB_ADMIN_EMAIL    || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

// ─── Collection definitions ───────────────────────────────────────────────────

const COLLECTIONS = [
  {
    name: 'products',
    type: 'base',
    // Public read, superuser write
    listRule:   'is_available = true',
    viewRule:   'is_available = true',
    createRule: null,   // superuser only
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'category',         type: 'text',   required: true  },
      { name: 'brand_model',      type: 'text',   required: true  },
      { name: 'details',          type: 'text',   required: false },
      { name: 'condition_rating', type: 'text',   required: false },
      { name: 'quick_sale_price', type: 'number', required: true  },
      { name: 'collector_price',  type: 'number', required: true  },
      { name: 'special_notes',    type: 'text',   required: false },
      { name: 'image',            type: 'file',   required: false, options: { maxSelect: 4, maxSize: 5242880, mimeTypes: ['image/jpeg','image/png','image/webp'] } },
      { name: 'is_sold',          type: 'bool',   required: false },
      { name: 'is_available',     type: 'bool',   required: false },
      { name: 'is_featured',      type: 'bool',   required: false },
    ],
  },
  {
    name: 'orders',
    type: 'base',
    listRule:   null,
    viewRule:   null,
    createRule: '',     // any authenticated user (Netlify function uses superuser)
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'stripe_session_id', type: 'text',   required: true  },
      { name: 'customer_email',    type: 'email',  required: false },
      { name: 'customer_name',     type: 'text',   required: false },
      { name: 'total_amount',      type: 'number', required: true  },
      { name: 'currency',          type: 'text',   required: false },
      { name: 'status',            type: 'text',   required: false },
      { name: 'cart_session_id',   type: 'text',   required: false },
    ],
  },
  {
    name: 'settings',
    type: 'base',
    listRule:   null,
    viewRule:   null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'key',   type: 'text', required: true  },
      { name: 'value', type: 'text', required: false },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSchema(fields) {
  return fields.map(f => {
    const base = { name: f.name, type: f.type, required: !!f.required };
    if (f.options) base.options = f.options;
    return base;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.error('ERROR: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set.');
    process.exit(1);
  }

  console.log(`\nConnecting to PocketBase: ${PB_URL}`);
  const pb = new PocketBase(PB_URL);
  await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log('  Authenticated as superuser.\n');

  // Fetch existing collections
  let existing = [];
  try {
    const res = await pb.send('/api/collections', { method: 'GET' });
    existing = (res.items || []).map(c => c.name);
  } catch (e) {
    console.warn('  Could not fetch existing collections:', e.message);
  }

  for (const col of COLLECTIONS) {
    if (existing.includes(col.name)) {
      console.log(`  SKIP   "${col.name}" — already exists`);
      continue;
    }

    try {
      await pb.send('/api/collections', {
        method: 'POST',
        body: {
          name:       col.name,
          type:       col.type,
          listRule:   col.listRule,
          viewRule:   col.viewRule,
          createRule: col.createRule,
          updateRule: col.updateRule,
          deleteRule: col.deleteRule,
          fields:     buildSchema(col.fields),
        },
      });
      console.log(`  OK     "${col.name}" created`);
    } catch (err) {
      console.error(`  ERROR  "${col.name}": ${err.message}`);
    }
  }

  console.log('\nSchema setup complete. You can now run import-products.mjs.\n');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
