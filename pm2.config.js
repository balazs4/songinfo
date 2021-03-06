module.exports = {
  apps: [
    {
      name: 'songinfo',
      cwd: '/srv/songinfo/',
      script: 'npx',
      args: ['micro', '-l', 'tcp://localhost:5551', 'index.js'],
      env: {
        DEBUG: 'songinfo',
        SPOTIFY_CLIENT_ID: '6aa10a7ead854a088f4bc28e66a039fd',
        SPOTIFY_CLIENT_SECRET: '2c5dd0d2866449fab1b1fe6a8e494d68'
      }
    }
  ]
};
