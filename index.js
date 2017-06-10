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

module.exports = async (req, res) => {
  currentToken = await getAccesToken();
  if (currentToken === null) {
    send(res, 401, 'No access token');
    return;
  }

  const { token_type, access_token } = currentToken;

  const term = req.url.replace(/\//, '');

  log(`Looking for ${term}`);

  const result = await request(
    `https://api.spotify.com/v1/search?type=track&market=DE&limit=1&q=${term.replace(/\s/g, '+')}`,
    {
      method: 'GET',
      json: true,
      resolveWithFullResponse: true,
      simple: false,
      headers: {
        Authorization: `${token_type} ${access_token}`
      }
    }
  );

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

  const { body: { release_date } } = await request(item.album.href, {
    method: 'GET',
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    headers: {
      Authorization: `${token_type} ${access_token}`
    }
  });

  return {
    artist: item.artists[0].name,
    album: item.album.name,
    cover64: item.album.images[0].url,
    title: item.name,
    year: release_date.substring(0, 4)
  };
};
