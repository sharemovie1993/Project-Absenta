import fs from 'fs';
import path from 'path';
import { PaymentGateway } from '@prisma/client';

export interface TestResult {
  id: string;
  type: 'webhook' | 'comprehensive' | 'signature' | 'health' | 'idempotency';
  gateway?: PaymentGateway | 'ALL';
  status: 'success' | 'failed' | 'error';
  timestamp: string;
  duration?: number;
  data?: any;
  error?: string;
}

export interface TestReport {
  reportId: string;
  generatedAt: string;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    errorTests: number;
    successRate: string;
    averageDuration: string;
  };
  testsByType: Record<string, any>;
  testsByGateway: Record<string, any>;
  detailedResults: TestResult[];
  recommendations: string[];
}

export class TestReportService {
  private logDir: string;
  private reportDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.reportDir = path.join(process.cwd(), 'reports');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async logTestResult(
    type: TestResult['type'],
    gateway: PaymentGateway | 'ALL' | undefined,
    status: TestResult['status'],
    data?: any,
    duration?: number,
    error?: string
  ): Promise<string> {
    const testResult: TestResult = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      gateway,
      status,
      timestamp: new Date().toISOString(),
      duration,
      data,
      error
    };

    // Log to file
    const logEntry = `[${testResult.timestamp}] TEST-${type.toUpperCase()}-${gateway || 'UNKNOWN'}: ${status.toUpperCase()}\n${JSON.stringify(testResult, null, 2)}\n\n`;
    const logFile = path.join(this.logDir, 'PaymentGatewayTestReport.log');
    
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write test log:', error);
    }

    return testResult.id;
  }

  async generateReport(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<TestReport> {
    const reportId = `report_${Date.now()}`;
    const generatedAt = new Date().toISOString();

    // Read test results from log file
    const testResults = await this.readTestResults(timeRange);

    // Generate summary
    const summary = this.generateSummary(testResults);

    // Group by type and gateway
    const testsByType = this.groupByType(testResults);
    const testsByGateway = this.groupByGateway(testResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(testResults, summary);

    const report: TestReport = {
      reportId,
      generatedAt,
      summary,
      testsByType,
      testsByGateway,
      detailedResults: testResults,
      recommendations
    };

    // Save report to file
    await this.saveReport(report);

    return report;
  }

  private async readTestResults(timeRange: string): Promise<TestResult[]> {
    const logFile = path.join(this.logDir, 'PaymentGatewayTestReport.log');
    
    if (!fs.existsSync(logFile)) {
      return [];
    }

    try {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logEntries = logContent.split('\n\n').filter(entry => entry.trim());
      
      const cutoffTime = this.getCutoffTime(timeRange);
      const results: TestResult[] = [];

      for (const entry of logEntries) {
        try {
          const jsonMatch = entry.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const testResult = JSON.parse(jsonMatch[0]) as TestResult;
            const testTime = new Date(testResult.timestamp);
            
            if (testTime >= cutoffTime) {
              results.push(testResult);
            }
          }
        } catch (e) {
          // Skip invalid entries
        }
      }

      return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to read test results:', error);
      return [];
    }
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private generateSummary(results: TestResult[]) {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'success').length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const errorTests = results.filter(r => r.status === 'error').length;
    
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00';
    
    const durations = results.filter(r => r.duration).map(r => r.duration!);
    const averageDuration = durations.length > 0 
      ? `${Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)}ms`
      : '0ms';

    return {
      totalTests,
      passedTests,
      failedTests,
      errorTests,
      successRate: `${successRate}%`,
      averageDuration
    };
  }

  private groupByType(results: TestResult[]) {
    const grouped: Record<string, any> = {};

    results.forEach(result => {
      if (!grouped[result.type]) {
        grouped[result.type] = {
          total: 0,
          passed: 0,
          failed: 0,
          error: 0,
          successRate: '0%'
        };
      }

      grouped[result.type].total++;
      grouped[result.type][result.status]++;
    });

    // Calculate success rates
    Object.keys(grouped).forEach(type => {
      const data = grouped[type];
      data.successRate = data.total > 0 
        ? `${((data.passed / data.total) * 100).toFixed(2)}%`
        : '0%';
    });

    return grouped;
  }

  private groupByGateway(results: TestResult[]) {
    const grouped: Record<string, any> = {};

    results.forEach(result => {
      const gateway = result.gateway || 'UNKNOWN';
      if (!grouped[gateway]) {
        grouped[gateway] = {
          total: 0,
          passed: 0,
          failed: 0,
          error: 0,
          successRate: '0%'
        };
      }

      grouped[gateway].total++;
      grouped[gateway][result.status]++;
    });

    // Calculate success rates
    Object.keys(grouped).forEach(gateway => {
      const data = grouped[gateway];
      data.successRate = data.total > 0 
        ? `${((data.passed / data.total) * 100).toFixed(2)}%`
        : '0%';
    });

    return grouped;
  }

  private generateRecommendations(results: TestResult[], summary: any): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    const successRate = parseFloat(summary.successRate.replace('%', ''));
    if (successRate < 90) {
      recommendations.push(`⚠️ Success rate is ${summary.successRate}, which is below the recommended 90%. Review failed tests and improve error handling.`);
    } else if (successRate >= 95) {
      recommendations.push(`✅ Excellent success rate of ${summary.successRate}. System is performing well.`);
    }

    // Gateway-specific recommendations
    const gatewayStats = this.groupByGateway(results);
    Object.entries(gatewayStats).forEach(([gateway, stats]: [string, any]) => {
      const gatewaySuccessRate = parseFloat(stats.successRate.replace('%', ''));
      if (gatewaySuccessRate < 85) {
        recommendations.push(`🔧 ${gateway} gateway has low success rate (${stats.successRate}). Check gateway configuration and connectivity.`);
      }
    });

    // Performance recommendations
    const durations = results.filter(r => r.duration).map(r => r.duration!);
    if (durations.length > 0) {
      const maxDuration = Math.max(...durations);
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      if (maxDuration > 5000) {
        recommendations.push(`⏱️ Some tests took longer than 5 seconds (max: ${maxDuration}ms). Consider optimizing webhook processing.`);
      }
      
      if (avgDuration > 2000) {
        recommendations.push(`⏱️ Average test duration is ${Math.round(avgDuration)}ms. Consider performance optimization.`);
      }
    }

    // Error pattern recommendations
    const errorTests = results.filter(r => r.status === 'error');
    if (errorTests.length > 0) {
      const errorPatterns = errorTests.reduce((patterns: Record<string, number>, test) => {
        const errorType = test.error?.split(':')[0] || 'Unknown';
        patterns[errorType] = (patterns[errorType] || 0) + 1;
        return patterns;
      }, {});

      Object.entries(errorPatterns).forEach(([errorType, count]) => {
        if (count > 1) {
          recommendations.push(`🚨 Recurring error pattern: "${errorType}" occurred ${count} times. Investigate root cause.`);
        }
      });
    }

    // Test coverage recommendations
    const testTypes = Object.keys(this.groupByType(results));
    const expectedTypes = ['webhook', 'comprehensive', 'signature', 'health', 'idempotency'];
    const missingTypes = expectedTypes.filter(type => !testTypes.includes(type));
    
    if (missingTypes.length > 0) {
      recommendations.push(`📋 Missing test coverage for: ${missingTypes.join(', ')}. Consider adding these test types.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests are performing well. No immediate action required.');
    }

    return recommendations;
  }

  private async saveReport(report: TestReport): Promise<void> {
    const reportFile = path.join(this.reportDir, `payment-gateway-test-report-${report.reportId}.json`);
    
    try {
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Also create a human-readable version
      const readableReport = this.generateReadableReport(report);
      const readableFile = path.join(this.reportDir, `payment-gateway-test-report-${report.reportId}.md`);
      fs.writeFileSync(readableFile, readableReport);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  private generateReadableReport(report: TestReport): string {
    return `# Payment Gateway Test Report

**Report ID:** ${report.reportId}  
**Generated:** ${new Date(report.generatedAt).toLocaleString()}

## Summary
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}
- **Errors:** ${report.summary.errorTests}
- **Success Rate:** ${report.summary.successRate}
- **Average Duration:** ${report.summary.averageDuration}

## Tests by Type
${Object.entries(report.testsByType).map(([type, stats]: [string, any]) => 
  `- **${type.toUpperCase()}:** ${stats.total} tests, ${stats.successRate} success rate`
).join('\n')}

## Tests by Gateway
${Object.entries(report.testsByGateway).map(([gateway, stats]: [string, any]) => 
  `- **${gateway}:** ${stats.total} tests, ${stats.successRate} success rate`
).join('\n')}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Results
${report.detailedResults.slice(0, 10).map(result => 
  `### ${result.type.toUpperCase()} - ${result.gateway || 'N/A'} - ${result.status.toUpperCase()}
- **Time:** ${new Date(result.timestamp).toLocaleString()}
- **Duration:** ${result.duration || 'N/A'}ms
${result.error ? `- **Error:** ${result.error}` : ''}
`
).join('\n')}

${report.detailedResults.length > 10 ? `\n*Showing first 10 of ${report.detailedResults.length} results. See JSON report for complete details.*` : ''}
`;
  }

  async getLatestReport(): Promise<TestReport | null> {
    try {
      const reportFiles = fs.readdirSync(this.reportDir)
        .filter(file => file.startsWith('payment-gateway-test-report-') && file.endsWith('.json'))
        .sort()
        .reverse();

      if (reportFiles.length === 0) {
        return null;
      }

      const latestFile = path.join(this.reportDir, reportFiles[0]);
      const reportContent = fs.readFileSync(latestFile, 'utf8');
      return JSON.parse(reportContent) as TestReport;
    } catch (error) {
      console.error('Failed to get latest report:', error);
      return null;
    }
  }

  async cleanupOldReports(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      const files = fs.readdirSync(this.reportDir);

      for (const file of files) {
        const filePath = path.join(this.reportDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffTime) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old reports:', error);
    }
  }
}