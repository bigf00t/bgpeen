#!/usr/bin/env node
// Run from the project root:
//   GOOGLE_APPLICATION_CREDENTIALS="bgpeen-1fc16-firebase-adminsdk-lmnwz-98e62a436b.json" node scripts/find-zero-score-games.js

const path = require('path');
const adminRoot = path.join(__dirname, '../functions/node_modules/firebase-admin');
const { initializeApp, getApps } = require(path.join(adminRoot, 'lib/app/index.js'));
const { getFirestore } = require(path.join(adminRoot, 'lib/firestore/index.js'));

if (!getApps().length) initializeApp({ projectId: 'bgpeen-1fc16' });
const db = getFirestore();

async function main() {
  const snap = await db.collection('games')
    .where('totalScores', '==', 0)
    .get();

  if (snap.empty) {
    console.log('No games with totalScores === 0 found.');
    return;
  }

  const sorted = snap.docs.slice().sort((a, b) => a.data().name?.localeCompare(b.data().name));
  console.log(`Found ${sorted.length} game(s) with totalScores === 0:\n`);
  for (const doc of sorted) {
    const d = doc.data();
    console.log(`  ${d.name}  (id: ${doc.id}, totalPlays: ${d.totalPlays ?? 'n/a'})`);
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
