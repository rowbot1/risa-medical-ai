module.exports = {
  apps: [{
    name: 'risa-medical-server',
    script: './server/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'data'],
    autorestart: true,
    max_restarts: 10,
    min_uptime: 10000,
    restart_delay: 4000
  }]
};