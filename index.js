const request = require('request-promise-native');

const client = (url, options) = > request(url,
                                          Object.assign({}, {
                                            method : 'GET',
                                            json : true,
                                            simple : false,
                                            resolveWithFullResponse : true
                                          },
                                                        options));

let myToken = null;

module.exports = async(req, res) = > {
  const cache = await get(`${process.env.DB} / $ { req.url }`);
  if (cache.statusCode == = 200) {
    return cache.body;
  }

  if (myToken == = null) {
    myToken = await client('https://accounts.spotify.com/api/token', {
      headers : {
        authorizaton : 'Basic' +
                           new Buffer(
            `process.env.CLIENT_ID
                               : process.env.CLIENT_SECRET` )
                               .toString('base64')
      }
    });
    setTimeout(() => 
      myToken = null;
  }, myToken['expires_in']);
}

const spotify = await client(
    `https
     : // api.spotify.com/v1/search?type=track&market=DE&limit=1&q=${req.url}`
    );

if (spotify.statusCode == = 200) {
}
}
;
