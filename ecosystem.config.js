module.exports = {
  apps: [
    {
      name: 'woashe-bloom',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 9090,
        HOST: '127.0.0.1'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9090,
        HOST: '127.0.0.1',
        SESSION_SECRET: 'woashe_bloom_production_secret_key_change_me'
      }
    }
  ]
};
