/**
 * One-time data migration script.
 *
 * What it does:
 *   games collection:
 *     - playerCounts: "2,3,4" → [2, 3, 4]
 *     - mean: "83.45" → 83.45
 *     - id: remove redundant field (doc ID is already the game ID)
 *   plays collection:
 *     - minDatePlayIds: "123,456" → ["123", "456"]
 *     - maxDatePlayIds: "123,456" → ["123", "456"]
 *
 * The script is idempotent — already-migrated fields are skipped.
 *
 * Usage:
 *   Authenticate first (one of):
 *     gcloud auth application-default login
 *     GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node migrate.js
 *
 *   Dry run (logs changes, writes nothing):
 *     DRY_RUN=true node migrate.js
 *
 *   Live run:
 *     node migrate.js
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: 'bgpeen-1fc16' });

const firestore = getFirestore();
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 400;

// ---------------------------------------------------------------------------

const commitInBatches = async (updates) => {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    if (!DRY_RUN) {
      const batch = firestore.batch();
      for (const { ref, data } of chunk) {
        batch.update(ref, data);
      }
      await batch.commit();
    }
    console.log(`  ${DRY_RUN ? '[DRY RUN] would commit' : 'committed'} ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`);
  }
};

// ---------------------------------------------------------------------------

const migrateGames = async () => {
  console.log('\n=== games ===');
  const snapshot = await firestore.collection('games').get();
  console.log(`${snapshot.size} documents found`);

  const updates = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const update = {};

    // playerCounts: "2,3,4" → [2, 3, 4]
    if (typeof data.playerCounts === 'string') {
      const converted = data.playerCounts
        ? data.playerCounts.split(',').map(Number).filter((n) => !isNaN(n))
        : [];
      console.log(`  ${doc.id}  playerCounts  ${JSON.stringify(data.playerCounts)} → ${JSON.stringify(converted)}`);
      update.playerCounts = converted;
    }

    // mean: "83.45" → 83.45
    if (typeof data.mean === 'string') {
      const converted = parseFloat(data.mean) || 0;
      console.log(`  ${doc.id}  mean  ${JSON.stringify(data.mean)} → ${converted}`);
      update.mean = converted;
    }

    // id: remove redundant field
    if ('id' in data) {
      console.log(`  ${doc.id}  id  "${data.id}" → (deleted)`);
      update.id = FieldValue.delete();
    }

    if (Object.keys(update).length > 0) {
      updates.push({ ref: doc.ref, data: update });
    }
  }

  const skipped = snapshot.size - updates.length;
  console.log(`\n${updates.length} to update, ${skipped} already up to date`);
  if (updates.length > 0) await commitInBatches(updates);
};

// ---------------------------------------------------------------------------

const migratePlays = async () => {
  console.log('\n=== plays ===');
  const snapshot = await firestore.collection('plays').get();
  console.log(`${snapshot.size} documents found`);

  const updates = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const update = {};

    // minDatePlayIds: "123,456" → ["123", "456"]
    if (typeof data.minDatePlayIds === 'string') {
      const converted = data.minDatePlayIds
        ? data.minDatePlayIds.split(',').filter(Boolean)
        : [];
      console.log(`  ${doc.id}  minDatePlayIds  ${JSON.stringify(data.minDatePlayIds)} → ${JSON.stringify(converted)}`);
      update.minDatePlayIds = converted;
    }

    // maxDatePlayIds: "123,456" → ["123", "456"]
    if (typeof data.maxDatePlayIds === 'string') {
      const converted = data.maxDatePlayIds
        ? data.maxDatePlayIds.split(',').filter(Boolean)
        : [];
      console.log(`  ${doc.id}  maxDatePlayIds  ${JSON.stringify(data.maxDatePlayIds)} → ${JSON.stringify(converted)}`);
      update.maxDatePlayIds = converted;
    }

    if (Object.keys(update).length > 0) {
      updates.push({ ref: doc.ref, data: update });
    }
  }

  const skipped = snapshot.size - updates.length;
  console.log(`\n${updates.length} to update, ${skipped} already up to date`);
  if (updates.length > 0) await commitInBatches(updates);
};

// ---------------------------------------------------------------------------

const main = async () => {
  console.log(`Migration starting — DRY_RUN=${DRY_RUN}`);
  if (DRY_RUN) console.log('No writes will be made.\n');

  try {
    await migrateGames();
    await migratePlays();
    console.log('\nDone.');
  } catch (e) {
    console.error('\nMigration failed:', e);
    process.exit(1);
  }
};

main();
