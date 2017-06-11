const { send } = require('micro');
const request = require('request-promise-native');
const log = require('debug')('songinfo');

const isTokenValid = token => {
  if (token === null) {
    return false;
  }
  const age = Date.now() - parseInt(token['issued_at']);
  const maxage = parseInt(token['expires_in']) * 1000;
  log(`Token: age: ${age}, maxage: ${maxage}`);
  return maxage - age > 4000; //private limit...
};

let currentToken = null;

const getAccesToken = () => {
  if (isTokenValid(currentToken)) {
    return currentToken;
  }
  log('Requesting token...');
  const { CLIENT_ID, CLIENT_SECRET } = process.env;
  const code = new Buffer(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  return request('https://accounts.spotify.com/api/token', {
    json: true,
    simple: false,
    resolveWithFullResponse: true,
    method: 'POST',
    form: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${code}`
    }
  }).then(x => {
    return x.statusCode === 200
      ? Object.assign({}, x.body, { issued_at: Date.now() })
      : null;
  });
};

const spoitfy = url => {
  const { token_type, access_token } = currentToken;
  return request(url, {
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    headers: {
      Authorization: `${token_type} ${access_token}`
    }
  });
};

const search = term =>
  spoitfy(
    `https://api.spotify.com/v1/search?type=track&market=DE&limit=1&q=${term.replace(/\s/g, '+')}`
  );

module.exports = async (req, res) => {
  currentToken = await getAccesToken();
  if (currentToken === null) {
    send(res, 401, 'No access token');
    return;
  }

  const term = req.url.replace(/\//, '');

  const result = await search(term);

  if (result.statusCode !== 200) {
    send(res, 500, 'Remote server error');
    return;
  }

  const { body: { tracks: { items } } } = result;
  const [item] = items;
  if (item === undefined) {
    send(res, 404, 'Not Found');
    return;
  }

  const { artists, album, name, external_urls } = item;
  const { body: { release_date } } = await spoitfy(album.href);

  return {
    artist: artists[0].name,
    album: album.name,
    title: name,
    release_date,
    cover: album.images[0].url,
    external_urls
  };
};
