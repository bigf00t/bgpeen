#!/usr/bin/env node
// Rebuild result docs for all games so that 1-player plays are included.
// Resets each game's plays-tracking fields to force a full BGG re-download,
// then calls updateResults with clear=true to rebuild from scratch.
//
// Run from the functions directory:
//   GOOGLE_APPLICATION_CREDENTIALS="../bgpeen-1fc16-firebase-adminsdk-lmnwz-98e62a436b.json" node reprocess-all-games-solo.js
//
// Optional: process a single game by ID:
//   ... node reprocess-all-games-solo.js 162886
//
// Resume from a specific game (alphabetical order) by name prefix:
//   ... node reprocess-all-games-solo.js --from "Terraforming Mars"

const { initializeApp, getApps } = require('firebase-admin/app');
if (!getApps().length) initializeApp({ projectId: 'bgpeen-1fc16' });

const { getFirestore } = require('firebase-admin/firestore');
const updatePlays = require('./updatePlays');
const updateResults = require('./updateResults');

const db = getFirestore();

const DELAY_MS = 5000;
const MAX_PAGES = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processGame(game) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing: ${game.name} (${game.id})`);

  // Reset plays-tracking so updateGamePlays fetches all plays from the beginning
  await db.collection('plays').doc(game.id).update({
    minDate: '',
    maxDate: '',
    minDatePlayIds: [],
    maxDatePlayIds: [],
  });

  const batch = db.batch();
  const allPlays = await updatePlays.updateGamePlays(game, batch, MAX_PAGES);
  console.log(`  Downloaded ${allPlays.length} plays`);

  await updateResults.updateResults(game, batch, allPlays, true);
  await batch.commit();

  const snap = await db.collection('games').doc(game.id).get();
  const { totalScores } = snap.data() ?? {};
  console.log(`  Done → totalScores: ${totalScores ?? 0}`);
}

async function main() {
  const args = process.argv.slice(2);

  let games;

  if (args[0] && !args[0].startsWith('--')) {
    // Single game by ID
    const snap = await db.collection('games').doc(args[0]).get();
    if (!snap.exists) { console.error(`Game ${args[0]} not found.`); process.exit(1); }
    games = [{ id: snap.id, ...snap.data() }];
  } else {
    const snap = await db.collection('games').get();
    games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    games.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const fromIdx = args.indexOf('--from');
    if (fromIdx !== -1) {
      const fromName = args[fromIdx + 1];
      const start = games.findIndex((g) => g.name >= fromName);
      if (start === -1) { console.error(`No game found at or after "${fromName}".`); process.exit(1); }
      console.log(`Resuming from "${games[start].name}" (index ${start})`);
      games = games.slice(start);
    }
  }

  console.log(`Processing ${games.length} game(s).\n`);

  const failed = [];
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(`[${i + 1}/${games.length}]`);
    try {
      await processGame(game);
    } catch (err) {
      console.error(`FAILED: ${game.name} (${game.id}): ${err.message}`);
      failed.push(game);
    }
    if (i < games.length - 1) {
      console.log(`Waiting ${DELAY_MS / 1000}s…`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Done. ${games.length - failed.length}/${games.length} succeeded.`);
  if (failed.length) {
    console.log(`Failed games:`);
    failed.forEach((g) => console.log(`  ${g.name} (${g.id})`));
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
