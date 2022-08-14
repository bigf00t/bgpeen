const _ = require('lodash');
const axios = require('axios');
const { getStorage } = require('firebase-admin/storage');
const storage = getStorage();

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

exports.uploadGameImage = async (dir, id, url) => {
  const bucketName = 'bgpeen-1fc16.appspot.com';
  const name = `${dir}/${id}.${url.split('.').pop()}`;
  const file = storage.bucket(bucketName).file(name);

  console.log(file.publicUrl());

  const result = await axios.get(url, { responseType: 'arraybuffer' });
  await file.save(result.data);
  await file.makePublic();

  return file.publicUrl();
};
