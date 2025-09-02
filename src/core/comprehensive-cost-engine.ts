import { CostEngine } from './cost-engine';
import { HiddenCostDetector } from './hidden-cost-detector';
import type { Usage, CostBreakdown } from '../providers/base/provider.interface';
import type { CostEstimate } from './cost-engine';
import { getRegistry } from './provider-registry';
import { getDataLoader } from '../index';

export interface ComprehensiveCostBreakdown extends CostBreakdown {
  hiddenCosts: {
    items: Array<{
      name: string;
      amount: number;
      description: string;
      avoidable: boolean;
    }>;
    total: number;
  };
  optimizations: {
    potential: number;
    recommendations: string[];
  };
  confidence: number;
  warnings: string[];
}

export interface DetailedCostEstimate extends CostEstimate {
  comprehensiveBreakdown: ComprehensiveCostBreakdown;
  actualEstimate: {
    low: number;
    likely: number;
    high: number;
  };
}

export class ComprehensiveCostEngine extends CostEngine {
  private hiddenCostDetector: HiddenCostDetector;
  
  constructor() {
    super(getRegistry(), getDataLoader());
    this.hiddenCostDetector = new HiddenCostDetector();
  }
  
  /**
   * Calculate comprehensive cost including hidden costs
   */
  async calculateComprehensiveCost(
    provider: string,
    usage: Usage
  ): Promise<DetailedCostEstimate> {
    // Get base estimate
    const baseEstimate = await this.calculateCost(provider, usage);
    
    // Detect hidden costs
    const hiddenCostReport = this.hiddenCostDetector.detectHiddenCosts(
      provider,
      usage,
      baseEstimate.monthly
    );
    
    // Build comprehensive breakdown
    const comprehensiveBreakdown: ComprehensiveCostBreakdown = {
      ...baseEstimate.breakdown,
      hiddenCosts: {
        items: hiddenCostReport.detectedCosts.map(cost => ({
          name: cost.name,
          amount: cost.amount,
          description: cost.description,
          avoidable: cost.avoidable
        })),
        total: hiddenCostReport.totalHidden
      },
      optimizations: {
        potential: this.calculateOptimizationPotential(hiddenCostReport),
        recommendations: hiddenCostReport.recommendations
      },
      confidence: this.calculateComprehensiveConfidence(hiddenCostReport),
      warnings: hiddenCostReport.warnings
    };
    
    // Calculate actual estimates (with confidence intervals)
    const totalMonthly = baseEstimate.monthly + hiddenCostReport.totalHidden;
    const confidence = comprehensiveBreakdown.confidence;
    
    const actualEstimate = {
      low: totalMonthly * (1 - (1 - confidence) * 0.3), // -30% at worst confidence
      likely: totalMonthly,
      high: totalMonthly * (1 + (1 - confidence) * 0.5) // +50% at worst confidence
    };
    
    return {
      ...baseEstimate,
      monthly: totalMonthly,
      yearly: totalMonthly * 12,
      comprehensiveBreakdown,
      actualEstimate
    };
  }
  
  /**
   * Compare providers with hidden costs included
   */
  async compareProvidersComprehensive(usage: Usage): Promise<{
    providers: DetailedCostEstimate[];
    cheapest: DetailedCostEstimate;
    mostExpensive: DetailedCostEstimate;
    bestValue: DetailedCostEstimate;
    insights: string[];
  }> {
    const providers = this.registry.getAllProviders();
    const estimates: DetailedCostEstimate[] = [];
    
    for (const provider of providers) {
      try {
        const estimate = await this.calculateComprehensiveCost(provider.name, usage);
        estimates.push(estimate);
      } catch (error) {
        console.warn(`Failed to calculate for ${provider.name}:`, error);
      }
    }
    
    // Sort by total cost (including hidden)
    estimates.sort((a, b) => a.monthly - b.monthly);
    
    const cheapest = estimates[0];
    const mostExpensive = estimates[estimates.length - 1];
    
    // Find best value (considering optimization potential)
    const bestValue = estimates.reduce((best, current) => {
      const currentValue = current.monthly - current.comprehensiveBreakdown.optimizations.potential;
      const bestValue = best.monthly - best.comprehensiveBreakdown.optimizations.potential;
      return currentValue < bestValue ? current : best;
    });
    
    // Generate insights
    const insights = this.generateInsights(estimates, usage);
    
    return {
      providers: estimates,
      cheapest: cheapest!,
      mostExpensive: mostExpensive!,
      bestValue,
      insights
    };
  }
  
  /**
   * Generate detailed cost report
   */
  generateDetailedReport(estimate: DetailedCostEstimate): string {
    let report = `\n📊 Comprehensive Cost Analysis for ${estimate.provider}\n`;
    report += '═'.repeat(60) + '\n\n';
    
    // Base costs
    report += '💰 Base Costs:\n';
    report += `   Monthly: $${estimate.monthly.toFixed(2)}\n`;
    report += `   Yearly: $${estimate.yearly.toFixed(2)}\n\n`;
    
    // Service breakdown
    report += '📦 Service Breakdown:\n';
    Object.entries(estimate.breakdown.serviceCosts).forEach(([service, cost]) => {
      report += `   ${service}: $${cost.toFixed(2)}\n`;
    });
    
    // Hidden costs
    if (estimate.comprehensiveBreakdown.hiddenCosts.items.length > 0) {
      report += '\n🔍 Hidden Costs Detected:\n';
      report += '─'.repeat(40) + '\n';
      
      estimate.comprehensiveBreakdown.hiddenCosts.items.forEach(item => {
        const icon = item.avoidable ? '🔧' : '📌';
        report += `   ${icon} ${item.name}: $${item.amount.toFixed(2)}\n`;
        report += `      ${item.description}\n`;
      });
      
      report += `\n   Total Hidden: $${estimate.comprehensiveBreakdown.hiddenCosts.total.toFixed(2)}\n`;
    }
    
    // Actual estimates with confidence
    report += '\n📈 Estimated Monthly Cost Range:\n';
    report += `   Low: $${estimate.actualEstimate.low.toFixed(2)}\n`;
    report += `   Likely: $${estimate.actualEstimate.likely.toFixed(2)}\n`;
    report += `   High: $${estimate.actualEstimate.high.toFixed(2)}\n`;
    report += `   Confidence: ${(estimate.comprehensiveBreakdown.confidence * 100).toFixed(0)}%\n`;
    
    // Optimization potential
    if (estimate.comprehensiveBreakdown.optimizations.potential > 0) {
      report += '\n💡 Optimization Potential:\n';
      report += `   Potential Savings: $${estimate.comprehensiveBreakdown.optimizations.potential.toFixed(2)}/mo\n`;
      
      if (estimate.comprehensiveBreakdown.optimizations.recommendations.length > 0) {
        report += '   Recommendations:\n';
        estimate.comprehensiveBreakdown.optimizations.recommendations.forEach(rec => {
          report += `   • ${rec}\n`;
        });
      }
    }
    
    // Warnings
    if (estimate.comprehensiveBreakdown.warnings.length > 0) {
      report += '\n⚠️ Warnings:\n';
      estimate.comprehensiveBreakdown.warnings.forEach(warning => {
        report += `   • ${warning}\n`;
      });
    }
    
    return report;
  }
  
  /**
   * Calculate optimization potential from hidden costs
   */
  private calculateOptimizationPotential(report: any): number {
    return report.detectedCosts
      .filter((cost: any) => cost.avoidable)
      .reduce((sum: number, cost: any) => sum + cost.amount, 0);
  }
  
  /**
   * Calculate confidence score based on detected costs
   */
  private calculateComprehensiveConfidence(report: any): number {
    if (report.detectedCosts.length === 0) return 0.95;
    
    const avgConfidence = report.detectedCosts.reduce(
      (sum: number, cost: any) => sum + cost.confidence,
      0
    ) / report.detectedCosts.length;
    
    // Reduce confidence if hidden costs are high
    const hiddenRatio = report.percentOfBase / 100;
    const confidencePenalty = Math.min(0.2, hiddenRatio * 0.3);
    
    return Math.max(0.5, avgConfidence - confidencePenalty);
  }
  
  /**
   * Generate insights from provider comparison
   */
  private generateInsights(estimates: DetailedCostEstimate[], usage: Usage): string[] {
    const insights: string[] = [];
    
    // Find providers with high hidden costs
    const highHiddenCosts = estimates.filter(e => 
      e.comprehensiveBreakdown.hiddenCosts.total > e.monthly * 0.3
    );
    
    if (highHiddenCosts.length > 0) {
      insights.push(`⚠️ ${highHiddenCosts.length} providers have hidden costs >30% of base price`);
    }
    
    // Check for data transfer dominance
    const avgBandwidthCost = estimates.reduce((sum, e) => 
      sum + (e.breakdown.serviceCosts.bandwidth || 0), 0
    ) / estimates.length;
    
    if (usage.bandwidth && estimates[0] && avgBandwidthCost > (estimates[0].monthly || 0) * 0.4) {
      insights.push('💾 Data transfer costs dominate - consider CDN or edge caching');
    }
    
    // Find best for specific use cases
    if (usage.requests && usage.requests > 10000000) {
      const bestForHighTraffic = estimates
        .filter(e => e.provider.toLowerCase().includes('cloudflare') || 
                     e.provider.toLowerCase().includes('vercel'))
        .sort((a, b) => a.monthly - b.monthly)[0];
      
      if (bestForHighTraffic) {
        insights.push(`🚀 For high traffic: Consider ${bestForHighTraffic.provider}`);
      }
    }
    
    // Optimization opportunities
    const totalOptimizable = estimates.reduce((sum, e) => 
      sum + e.comprehensiveBreakdown.optimizations.potential, 0
    );
    
    if (totalOptimizable > 100) {
      insights.push(`💰 Average optimization potential: $${(totalOptimizable / estimates.length).toFixed(0)}/mo`);
    }
    
    return insights;
  }
}