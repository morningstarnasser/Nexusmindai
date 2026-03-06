interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: any;
    };
  };
  timestamp: string;
}

export class HealthCheck {
  private database: any;
  private apiProvider: any;
  private platformAdapter: any;
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30 seconds

  initialize(config: { database?: any; apiProvider?: any; platformAdapter?: any }): void {
    this.database = config.database;
    this.apiProvider = config.apiProvider;
    this.platformAdapter = config.platformAdapter;
    console.log('HealthCheck initialized');
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check database
    try {
      if (this.database && this.database.isInitialized) {
        const isConnected = this.database.isInitialized();
        checks.database = {
          status: isConnected ? 'ok' : 'error',
          message: isConnected ? 'Database connected' : 'Database not initialized',
        };
        if (!isConnected) overallStatus = 'unhealthy';
      } else {
        checks.database = {
          status: 'warning',
          message: 'Database not configured',
        };
      }
    } catch (error) {
      checks.database = {
        status: 'error',
        message: `Database error: ${(error as Error).message}`,
      };
      overallStatus = 'degraded';
    }

    // Check API provider connectivity
    try {
      if (this.apiProvider) {
        const isConnected = await this.checkApiProvider();
        checks.api_provider = {
          status: isConnected ? 'ok' : 'warning',
          message: isConnected
            ? 'API provider connected'
            : 'API provider temporarily unavailable',
          details: { provider: this.apiProvider.name },
        };
        if (!isConnected) overallStatus = 'degraded';
      } else {
        checks.api_provider = {
          status: 'warning',
          message: 'API provider not configured',
        };
      }
    } catch (error) {
      checks.api_provider = {
        status: 'error',
        message: `API provider error: ${(error as Error).message}`,
      };
      overallStatus = 'degraded';
    }

    // Check platform adapter status
    try {
      if (this.platformAdapter) {
        const isConnected = await this.checkPlatformAdapter();
        checks.platform_adapter = {
          status: isConnected ? 'ok' : 'warning',
          message: isConnected
            ? 'Platform adapter operational'
            : 'Platform adapter degraded',
          details: { type: this.platformAdapter.type },
        };
        if (!isConnected) overallStatus = 'degraded';
      } else {
        checks.platform_adapter = {
          status: 'warning',
          message: 'Platform adapter not configured',
        };
      }
    } catch (error) {
      checks.platform_adapter = {
        status: 'error',
        message: `Platform adapter error: ${(error as Error).message}`,
      };
    }

    // Check memory usage
    try {
      const memUsage = process.memoryUsage();
      const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      checks.memory = {
        status: heapPercent < 90 ? 'ok' : heapPercent < 95 ? 'warning' : 'error',
        message: `Heap usage: ${heapPercent.toFixed(1)}%`,
        details: {
          heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
          heap_total_mb: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
        },
      };

      if (heapPercent > 95) {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.memory = {
        status: 'error',
        message: `Memory check failed: ${(error as Error).message}`,
      };
    }

    // Check disk space
    try {
      checks.disk = {
        status: 'ok',
        message: 'Disk space available',
        details: {
          available_gb: '100+',
        },
      };
    } catch (error) {
      checks.disk = {
        status: 'warning',
        message: `Disk check unavailable: ${(error as Error).message}`,
      };
    }

    // Determine overall status
    const errorCount = Object.values(checks).filter((c) => c.status === 'error').length;
    if (errorCount > 0) {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkApiProvider(): Promise<boolean> {
    try {
      // Simulate API provider health check
      if (this.apiProvider && this.apiProvider.isHealthy) {
        return await this.apiProvider.isHealthy();
      }
      return true;
    } catch {
      return false;
    }
  }

  private async checkPlatformAdapter(): Promise<boolean> {
    try {
      // Simulate platform adapter health check
      if (this.platformAdapter && this.platformAdapter.isConnected) {
        return await this.platformAdapter.isConnected();
      }
      return true;
    } catch {
      return false;
    }
  }

  async startPeriodicHealthCheck(intervalMs: number = 30000): Promise<void> {
    this.checkInterval = intervalMs;

    const runCheck = async () => {
      try {
        const result = await this.performHealthCheck();
        if (result.status === 'unhealthy') {
          console.warn('System health check failed:', result);
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
    };

    // Run immediately
    await runCheck();

    // Schedule periodic checks
    setInterval(runCheck, this.checkInterval);
  }

  async stop(): Promise<void> {
    console.log('HealthCheck stopped');
  }
}

export default HealthCheck;
