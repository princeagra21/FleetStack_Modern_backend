import cluster from 'cluster';
import { cpus } from 'os';
import { Logger } from '@nestjs/common';

const logger = new Logger('ClusterManager');

/**
 * 🚀 ENTERPRISE CLUSTERING FOR 10K+ CONCURRENT REQUESTS
 * Multi-core utilization for maximum performance scaling
 */
export class ClusterManager {
  private static readonly maxWorkers = parseInt(process.env.CLUSTER_WORKERS || '0') || cpus().length;
  private static readonly isDevelopment = process.env.NODE_ENV !== 'production';
  
  static async startCluster() {
    // Skip clustering in development for easier debugging
    if (this.isDevelopment) {
      logger.log('🔧 Development mode: Clustering disabled for easier debugging');
      return false;
    }

    if (cluster.isPrimary) {
      logger.log(`🚀 Master process ${process.pid} starting cluster with ${this.maxWorkers} workers`);
      
      // Fork workers equal to CPU cores for maximum utilization
      for (let i = 0; i < this.maxWorkers; i++) {
        this.forkWorker(i);
      }

      // Handle worker failures with automatic restart
      cluster.on('exit', (worker, code, signal) => {
        logger.error(`💥 Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        this.forkWorker();
      });

      // Handle graceful cluster shutdown
      process.on('SIGTERM', () => {
        logger.log('🔄 Master process shutting down cluster...');
        for (const id in cluster.workers) {
          cluster.workers[id]?.kill();
        }
      });

      process.on('SIGINT', () => {
        logger.log('🔄 Master process shutting down cluster...');
        for (const id in cluster.workers) {
          cluster.workers[id]?.kill();
        }
      });

      logger.log(`✅ Cluster initialized: Master ${process.pid} managing ${this.maxWorkers} workers`);
      return true; // Indicates this is the master process
    }
    
    // This is a worker process
    logger.log(`👷 Worker ${process.pid} starting...`);
    return false; // Indicates this is a worker process
  }

  private static forkWorker(workerId?: number) {
    const worker = cluster.fork();
    const id = workerId !== undefined ? workerId : Object.keys(cluster.workers || {}).length;
    
    worker.on('online', () => {
      logger.log(`✅ Worker ${worker.process.pid} (ID: ${id}) online and ready`);
    });

    worker.on('error', (error) => {
      logger.error(`❌ Worker ${worker.process.pid} error:`, error);
    });

    return worker;
  }

  /**
   * 📊 Get cluster performance metrics
   */
  static getClusterStats() {
    if (!cluster.isPrimary) return null;

    const workers = Object.values(cluster.workers || {}).filter(w => w);
    return {
      master: process.pid,
      workers: workers.map(w => w ? ({
        id: w.id,
        pid: w.process.pid,
        isDead: w.isDead(),
      }) : null).filter(Boolean),
      totalWorkers: workers.length,
      maxWorkers: this.maxWorkers,
      cpuCores: cpus().length,
    };
  }
}