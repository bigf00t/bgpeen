var _ = require('lodash');

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
exports.delay = (value, delay = 2000) => {
  return new Promise((resolve) => setTimeout(resolve, delay, value));
};

exports.docsToArray = (snapshot) => {
  let array = [];

  snapshot.forEach((doc) => {
    if (!_.isEmpty(doc.data())) {
      array.push(doc.data());
    }
  });

  return array;
};
