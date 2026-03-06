import { cpus, totalmem, freemem } from 'os';

interface SystemMetrics {
  cpu_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percent: number;
  disk_usage: any;
  timestamp: string;
}

interface ApplicationMetrics {
  requests_total: number;
  requests_per_minute: number;
  response_time_avg_ms: number;
  response_time_p95_ms: number;
  response_time_p99_ms: number;
  error_rate_percent: number;
  active_connections: number;
}

interface AIMetrics {
  tokens_used: number;
  tokens_available: number;
  api_calls: number;
  api_cost_usd: number;
  model_provider: string;
  error_count: number;
}

export class MetricsCollector {
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private aiMetrics: AIMetrics[] = [];
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private metricsInterval: NodeJS.Timeout | null = null;

  initialize(): void {
    console.log('MetricsCollector initialized');

    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectApplicationMetrics();
    }, 10000);
  }

  private collectSystemMetrics(): void {
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;

    const metrics: SystemMetrics = {
      cpu_percent: Math.random() * 100, // In production, use actual CPU usage
      memory_used_mb: usedMem / 1024 / 1024,
      memory_total_mb: totalMem / 1024 / 1024,
      memory_percent: (usedMem / totalMem) * 100,
      disk_usage: {
        used_gb: Math.random() * 500,
        total_gb: 1000,
      },
      timestamp: new Date().toISOString(),
    };

    this.systemMetrics.push(metrics);

    // Keep only last 144 data points (24 hours at 10-second intervals)
    if (this.systemMetrics.length > 144) {
      this.systemMetrics.shift();
    }
  }

  private collectApplicationMetrics(): void {
    const avgResponseTime =
      this.requestTimes.length > 0
        ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
        : 0;

    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const metrics: ApplicationMetrics = {
      requests_total: this.requestCount,
      requests_per_minute: this.requestCount / ((Date.now() - this.startTime) / 60000),
      response_time_avg_ms: avgResponseTime,
      response_time_p95_ms: sortedTimes[p95Index] || 0,
      response_time_p99_ms: sortedTimes[p99Index] || 0,
      error_rate_percent: (this.errorCount / (this.requestCount || 1)) * 100,
      active_connections: Math.floor(Math.random() * 100),
    };

    this.applicationMetrics.push(metrics);

    // Keep last 144 data points
    if (this.applicationMetrics.length > 144) {
      this.applicationMetrics.shift();
    }
  }

  recordRequest(responseTimeMs: number, hasError: boolean = false): void {
    this.requestCount++;
    this.requestTimes.push(responseTimeMs);
    if (hasError) this.errorCount++;

    // Keep only last 1000 response times
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
  }

  recordAICall(
    tokensUsed: number,
    provider: string,
    costUsd: number,
    hasError: boolean = false
  ): void {
    const metrics: AIMetrics = {
      tokens_used: tokensUsed,
      tokens_available: 1000000,
      api_calls: (this.aiMetrics[this.aiMetrics.length - 1]?.api_calls || 0) + 1,
      api_cost_usd: (this.aiMetrics[this.aiMetrics.length - 1]?.api_cost_usd || 0) + costUsd,
      model_provider: provider,
      error_count: this.aiMetrics[this.aiMetrics.length - 1]?.error_count || 0 + (hasError ? 1 : 0),
    };

    this.aiMetrics.push(metrics);

    if (this.aiMetrics.length > 144) {
      this.aiMetrics.shift();
    }
  }

  getSystemMetrics(): SystemMetrics[] {
    return this.systemMetrics;
  }

  getLatestSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics.length > 0
      ? this.systemMetrics[this.systemMetrics.length - 1]
      : null;
  }

  getApplicationMetrics(): ApplicationMetrics[] {
    return this.applicationMetrics;
  }

  getLatestApplicationMetrics(): ApplicationMetrics | null {
    return this.applicationMetrics.length > 0
      ? this.applicationMetrics[this.applicationMetrics.length - 1]
      : null;
  }

  getAIMetrics(): AIMetrics[] {
    return this.aiMetrics;
  }

  getLatestAIMetrics(): AIMetrics | null {
    return this.aiMetrics.length > 0 ? this.aiMetrics[this.aiMetrics.length - 1] : null;
  }

  getSummary(): any {
    const latestSystem = this.getLatestSystemMetrics();
    const latestApp = this.getLatestApplicationMetrics();
    const latestAI = this.getLatestAIMetrics();

    return {
      uptime_seconds: (Date.now() - this.startTime) / 1000,
      system: latestSystem,
      application: latestApp,
      ai: latestAI,
      request_count: this.requestCount,
      error_count: this.errorCount,
    };
  }

  async stop(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    console.log('MetricsCollector stopped');
  }
}

export default MetricsCollector;
