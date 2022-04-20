const _ = require('lodash');

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
exports.delay = (value, delay = 2000) => new Promise((resolve) => setTimeout(resolve, delay, value));

exports.docsToArray = (snapshot) => {
  const array = [];

  snapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      array.push({ id: doc.id, ...doc.data() });
    }
  });

  return array;
};
