module.exports = {
  apps: [
    {
      name: 'fleetstack-api',
      script: './dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        CLUSTER_WORKERS: 'max', // Use all CPU cores in production
      },
      // 🚀 PERFORMANCE OPTIMIZATIONS FOR 10K+ REQUESTS
      max_memory_restart: '3GB', // Restart if memory exceeds 3GB
      min_uptime: '10s', // Minimum uptime before considering successful
      max_restarts: 10, // Maximum restarts within unstable_restarts time
      kill_timeout: 5000, // Time to wait for graceful shutdown
      wait_ready: true, // Wait for ready signal from app
      listen_timeout: 10000, // Time to wait for app to be ready
      
      // 🔥 CLUSTERING OPTIMIZATIONS
      instance_var: 'INSTANCE_ID',
      increment_var: 'PORT_INCREMENT',
      
      // 📊 LOG MANAGEMENT
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 🛡️ ADVANCED PROCESS MANAGEMENT
      autorestart: true,
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // 🚀 PERFORMANCE MONITORING
      pmx: true,
      monitoring: true,
    }
  ],

  // 🔧 DEVELOPMENT CONFIGURATION
  development: {
    apps: [
      {
        name: 'fleetstack-dev',
        script: './dist/main.js',
        instances: 1, // Single instance for development debugging
        exec_mode: 'fork',
        env: {
          NODE_ENV: 'development',
          PORT: 5000,
        },
        watch: true,
        watch_delay: 1000,
        ignore_watch: ['node_modules', 'logs', '.git'],
      }
    ]
  }
};