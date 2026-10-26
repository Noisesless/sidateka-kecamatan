module.exports = {
  apps: [
    {
      name: 'sidateka',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      // Log ke PM2 default
      out_file: undefined,
      error_file: undefined,
    },
  ],
};
