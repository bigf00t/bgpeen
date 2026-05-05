#!/usr/bin/env node
// Re-run the two-phase BGG fetch for every game with totalScores === 0.
//
// Run from the functions directory:
//   GOOGLE_APPLICATION_CREDENTIALS="../bgpeen-1fc16-firebase-adminsdk-lmnwz-98e62a436b.json" node reprocess-zero-score-games.js
//
// Optional: process a single game by ID:
//   ... node reprocess-zero-score-games.js 162886

const { initializeApp, getApps } = require('firebase-admin/app');
if (!getApps().length) initializeApp({ projectId: 'bgpeen-1fc16' });

const { getFirestore } = require('firebase-admin/firestore');
const updatePlays = require('./updatePlays');
const updateResults = require('./updateResults');

const db = getFirestore();

const DELAY_MS = 5000; // 5s between games — BGG rate limit is ~1 req/s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processGame(game) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Processing: ${game.name} (${game.id})`);

  // Phase 1
  const batch1 = db.batch();
  const plays1 = await updatePlays.updateGamePlays(game, batch1, 5);
  await updateResults.updateResults(game, batch1, plays1, false);
  await batch1.commit();

  // Re-fetch between phases
  const snap = await db.collection('games').doc(game.id).get();
  const game2 = { id: game.id, ...snap.data() };

  // Phase 2
  const batch2 = db.batch();
  const plays2 = await updatePlays.updateGamePlays(game2, batch2, 100);
  await updateResults.updateResults(game2, batch2, plays2, false);
  await batch2.commit();

  const finalSnap = await db.collection('games').doc(game.id).get();
  const { totalScores } = finalSnap.data() ?? {};
  console.log(`Done: ${game.name} → totalScores: ${totalScores ?? 0}`);
}

async function main() {
  const singleId = process.argv[2];

  let games;
  if (singleId) {
    const snap = await db.collection('games').doc(singleId).get();
    if (!snap.exists) { console.error(`Game ${singleId} not found.`); process.exit(1); }
    games = [{ id: snap.id, ...snap.data() }];
  } else {
    const snap = await db.collection('games').where('totalScores', '==', 0).get();
    games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    games.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  console.log(`Found ${games.length} game(s) to process.\n`);

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
      console.log(`Waiting ${DELAY_MS / 1000}s before next game…`);
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
