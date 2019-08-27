const { URLSearchParams } = require('url');
const { send } = require('micro');
const fetch = require('node-fetch');
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
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  const code = new Buffer(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  return fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: params,
    headers: {
      Authorization: `Basic ${code}`
    }
  })
    .then(x => x.json())
    .then(x => ({ ...x, issued_at: Date.now() }));
};

const spoitfy = url => {
  const { token_type, access_token } = currentToken;
  return fetch(url, {
    headers: {
      Authorization: `${token_type} ${access_token}`
    }
  }).then(x => x.json());
};

const search = term =>
  spoitfy(
    `https://api.spotify.com/v1/search?type=track&market=DE&limit=1&q=${term.replace(
      /\s/g,
      '+'
    )}`
  );

module.exports = async (req, res) => {
  currentToken = await getAccesToken();
  if (currentToken === null) {
    send(res, 401, 'No access token');
    return;
  }

  const term = req.url.replace(/\//, '');

  log(`Looking for '${term}'`);
  const result = await search(term);

  const {
    tracks: { items }
  } = result;
  const [item] = items;
  if (item === undefined) {
    send(res, 404, 'Not Found');
    return;
  }

  const { artists, album, name, external_urls } = item;
  const { release_date } = await spoitfy(album.href);

  return {
    artist: artists[0].name,
    album: album.name,
    title: name,
    release_date,
    cover: album.images[0].url,
    external_urls
  };
};
