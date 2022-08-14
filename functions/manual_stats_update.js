// const { getFirestore } = require('firebase-admin/firestore');
// const firestore = getFirestore();

// const _ = require('lodash');

// const util = require('./util');
// const update = require('./update_results');

// exports.manualStatsUpdate = (games) =>
//   firestore
//     .collection('games')
//     .where('id', 'in', games)
//     .get()
//     .then((gamesSnapshot) =>
//       Promise.all(
//         _.map(util.docsToArray(gamesSnapshot), (game) => {
//           console.info(`Started updating stats for: ${game.name}`);

//           // Expensive query!
//           const playsRef = firestore.collection('games').doc(game.id).collection('plays');

//           return playsRef
//             .get()
//             .then((playsSnapshot) => update.updateResults(game, util.docsToArray(playsSnapshot), true));
//         })
//       )
//     );
