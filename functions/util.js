const _ = require('lodash');
const axios = require('axios');
const { getStorage } = require('firebase-admin/storage');

// BGG blocks requests with bot-like User-Agent strings (e.g. "axios/1.x.x" from cloud IPs)
axios.defaults.headers.common['User-Agent'] =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

exports.BUCKET = 'bgpeen-1fc16.appspot.com';

exports.getApiKey = () => {
  const key = process.env.BGG_API_KEY;
  if (!key) throw new Error('BGG_API_KEY environment variable is not set');
  return key.trim();
};

exports.withRetry = async (fn, { retries = 3, delayMs = 2000 } = {}) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

// From https://stackoverflow.com/questions/22707475/how-to-make-a-promise-from-settimeout
exports.delay = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const name = `${dir}/${id}.${url.split('.').pop()}`;
  const file = getStorage().bucket(exports.BUCKET).file(name);

  try {
    const result = await axios.get(url, { responseType: 'arraybuffer' });
    await file.save(result.data);
    await file.makePublic();
    console.info(`Uploaded image: ${file.publicUrl()}`);
    return file.publicUrl();
  } catch (e) {
    console.error(`Failed to upload image ${url} to ${name}: ${e.message}`);
    throw e;
  }
};
