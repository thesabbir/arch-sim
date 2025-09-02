import type { Usage } from '../providers/base/provider.interface';

// Extended usage interface for provider-specific hidden cost detection
interface ExtendedUsage extends Usage {
  privateSubnets?: boolean;
  multiAZ?: boolean;
  elasticIPs?: number;
  instances?: number;
  backupSize?: number;
  monitoring?: 'basic' | 'detailed';
  cloudTrail?: boolean;
  loadBalancer?: boolean;
  teamMembers?: number;
  images?: number;
  analyticsEvents?: number;
  buildMinutes?: number;
  realtimeConnections?: number;
  vectors?: number;
  customDomains?: number;
}

export interface HiddenCost {
  name: string;
  amount: number;
  description: string;
  category: 'network' | 'storage' | 'compute' | 'management' | 'compliance';
  avoidable: boolean;
  tip?: string;
  confidence: number; // 0-1 scale
}

export interface HiddenCostReport {
  provider: string;
  detectedCosts: HiddenCost[];
  totalHidden: number;
  percentOfBase: number;
  warnings: string[];
  recommendations: string[];
}

export class HiddenCostDetector {
  /**
   * Detect hidden costs for AWS
   */
  detectAWSHiddenCosts(usage: Usage): HiddenCost[] {
    const extUsage = usage as ExtendedUsage;
    const costs: HiddenCost[] = [];
    
    // Data Transfer Costs (often 20-40% of bill!)
    if (usage.bandwidth && usage.bandwidth > 100) {
      costs.push({
        name: 'Data Transfer Out',
        amount: (usage.bandwidth - 100) * 0.09,
        description: 'Internet egress charges after 100GB free tier',
        category: 'network',
        avoidable: false,
        tip: 'Use CloudFlare or AWS CloudFront to reduce egress costs',
        confidence: 0.95
      });
    }
    
    // NAT Gateway (sneaky recurring cost)
    if (extUsage.privateSubnets) {
      const natHours = 730; // Monthly hours
      const natDataProcessing = (usage.bandwidth || 0) * 0.045;
      costs.push({
        name: 'NAT Gateway',
        amount: natHours * 0.045 + natDataProcessing,
        description: 'NAT Gateway hourly charge + data processing',
        category: 'network',
        avoidable: true,
        tip: 'Use public subnets or NAT instances for low traffic workloads',
        confidence: 0.9
      });
    }
    
    // Cross-AZ Data Transfer
    if (extUsage.multiAZ) {
      const crossAZTransfer = (usage.bandwidth || 0) * 0.01;
      costs.push({
        name: 'Cross-AZ Data Transfer',
        amount: crossAZTransfer,
        description: 'Data transfer between availability zones',
        category: 'network',
        avoidable: true,
        tip: 'Keep traffic within same AZ when possible',
        confidence: 0.85
      });
    }
    
    // Elastic IP (unused)
    if (extUsage.elasticIPs && extUsage.instances && extUsage.elasticIPs > extUsage.instances) {
      const unusedIPs = extUsage.elasticIPs - extUsage.instances;
      costs.push({
        name: 'Unused Elastic IPs',
        amount: unusedIPs * 0.005 * 730, // $0.005/hour
        description: 'Unattached Elastic IP addresses',
        category: 'network',
        avoidable: true,
        tip: 'Release unused Elastic IPs immediately',
        confidence: 1.0
      });
    }
    
    // EBS Snapshots
    if (usage.storage && usage.storage > 50) {
      const snapshotCost = usage.storage * 0.05; // Assume snapshots = storage size
      costs.push({
        name: 'EBS Snapshots',
        amount: snapshotCost,
        description: 'Backup snapshots for EBS volumes',
        category: 'storage',
        avoidable: false,
        tip: 'Use lifecycle policies to delete old snapshots',
        confidence: 0.7
      });
    }
    
    // CloudWatch Detailed Monitoring
    if (extUsage.instances && extUsage.instances > 0) {
      costs.push({
        name: 'CloudWatch Monitoring',
        amount: extUsage.instances * 7, // $7/instance for detailed monitoring
        description: 'Detailed CloudWatch metrics',
        category: 'management',
        avoidable: true,
        tip: 'Use basic monitoring unless detailed metrics are required',
        confidence: 0.8
      });
    }
    
    // Load Balancer
    if (extUsage.loadBalancer) {
      const albHours = 730;
      const lcuHours = Math.max(1, (usage.requests || 0) / 1000000) * 730;
      costs.push({
        name: 'Application Load Balancer',
        amount: albHours * 0.0225 + lcuHours * 0.008,
        description: 'ALB hourly charge + LCU hours',
        category: 'network',
        avoidable: false,
        tip: 'Consider using CloudFront for static content',
        confidence: 0.9
      });
    }
    
    return costs;
  }
  
  /**
   * Detect hidden costs for Vercel
   */
  detectVercelHiddenCosts(usage: Usage): HiddenCost[] {
    const extUsage = usage as ExtendedUsage;
    const costs: HiddenCost[] = [];
    
    // Team seats (often forgotten)
    if (extUsage.teamMembers && extUsage.teamMembers > 1) {
      costs.push({
        name: 'Additional Team Seats',
        amount: (extUsage.teamMembers - 1) * 20,
        description: 'Extra team members on Pro plan',
        category: 'management',
        avoidable: false,
        tip: 'Review team access regularly',
        confidence: 1.0
      });
    }
    
    // Image Optimization
    if (extUsage.images && extUsage.images > 1000) {
      const imageOptCost = Math.ceil((extUsage.images - 1000) / 1000) * 5;
      costs.push({
        name: 'Image Optimization',
        amount: imageOptCost,
        description: 'Optimized image delivery',
        category: 'network',
        avoidable: true,
        tip: 'Pre-optimize images in build process',
        confidence: 0.8
      });
    }
    
    // Analytics Events
    if (extUsage.analyticsEvents && extUsage.analyticsEvents > 10000) {
      const analyticsCost = (extUsage.analyticsEvents - 10000) * 0.00001;
      costs.push({
        name: 'Analytics Events',
        amount: analyticsCost,
        description: 'Web analytics tracking',
        category: 'management',
        avoidable: true,
        tip: 'Use client-side analytics or reduce event tracking',
        confidence: 0.9
      });
    }
    
    // Build Minutes
    if (extUsage.buildMinutes && extUsage.buildMinutes > 6000) {
      const buildCost = (extUsage.buildMinutes - 6000) * 0.01;
      costs.push({
        name: 'Build Minutes Overage',
        amount: buildCost,
        description: 'CI/CD build time overage',
        category: 'compute',
        avoidable: true,
        tip: 'Optimize build times and use caching',
        confidence: 0.95
      });
    }
    
    return costs;
  }
  
  /**
   * Detect hidden costs for Supabase
   */
  detectSupabaseHiddenCosts(usage: Usage): HiddenCost[] {
    const extUsage = usage as ExtendedUsage;
    const costs: HiddenCost[] = [];
    
    // Realtime connections
    if (extUsage.realtimeConnections && extUsage.realtimeConnections > 200) {
      const connectionCost = Math.ceil((extUsage.realtimeConnections - 200) / 1000) * 10;
      costs.push({
        name: 'Realtime Connections',
        amount: connectionCost,
        description: 'Concurrent websocket connections',
        category: 'network',
        avoidable: false,
        tip: 'Implement connection pooling and cleanup',
        confidence: 0.85
      });
    }
    
    // Database backups (point-in-time recovery)
    if (usage.storage && usage.storage > 8) {
      costs.push({
        name: 'Point-in-time Recovery',
        amount: usage.storage * 0.125 * 0.2, // 20% of storage cost
        description: 'Database backup retention',
        category: 'storage',
        avoidable: false,
        tip: 'Adjust backup retention period based on needs',
        confidence: 0.7
      });
    }
    
    // Vector embeddings storage
    if (extUsage.vectors && extUsage.vectors > 0) {
      costs.push({
        name: 'Vector Embeddings',
        amount: extUsage.vectors * 0.01, // Per million dimensions
        description: 'pgvector storage for AI features',
        category: 'storage',
        avoidable: true,
        tip: 'Consider external vector databases for large scale',
        confidence: 0.6
      });
    }
    
    return costs;
  }
  
  /**
   * Detect hidden costs for any provider
   */
  detectHiddenCosts(provider: string, usage: Usage, baseCost: number): HiddenCostReport {
    let detectedCosts: HiddenCost[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Provider-specific detection
    switch (provider.toLowerCase()) {
      case 'aws':
        detectedCosts = this.detectAWSHiddenCosts(usage);
        break;
      case 'vercel':
        detectedCosts = this.detectVercelHiddenCosts(usage);
        break;
      case 'supabase':
        detectedCosts = this.detectSupabaseHiddenCosts(usage);
        break;
      default:
        // Generic hidden costs applicable to most providers
        detectedCosts = this.detectGenericHiddenCosts(usage);
    }
    
    // Calculate total hidden costs
    const totalHidden = detectedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const percentOfBase = baseCost > 0 ? (totalHidden / baseCost) * 100 : 0;
    
    // Generate warnings
    if (percentOfBase > 50) {
      warnings.push(`⚠️ Hidden costs are ${percentOfBase.toFixed(0)}% of your base cost!`);
    }
    
    const networkCosts = detectedCosts
      .filter(c => c.category === 'network')
      .reduce((sum, c) => sum + c.amount, 0);
    
    if (networkCosts > totalHidden * 0.4) {
      warnings.push('📊 Network costs dominate your hidden expenses');
      recommendations.push('Consider using a CDN to reduce data transfer costs');
    }
    
    // Find avoidable costs
    const avoidableCosts = detectedCosts.filter(c => c.avoidable);
    if (avoidableCosts.length > 0) {
      const avoidableTotal = avoidableCosts.reduce((sum, c) => sum + c.amount, 0);
      recommendations.push(`💰 You could save $${avoidableTotal.toFixed(2)}/mo by addressing avoidable costs`);
    }
    
    // Sort costs by amount (highest first)
    detectedCosts.sort((a, b) => b.amount - a.amount);
    
    return {
      provider,
      detectedCosts,
      totalHidden,
      percentOfBase,
      warnings,
      recommendations
    };
  }
  
  /**
   * Generic hidden costs that apply to most cloud providers
   */
  private detectGenericHiddenCosts(usage: Usage): HiddenCost[] {
    const extUsage = usage as ExtendedUsage;
    const costs: HiddenCost[] = [];
    
    // DNS queries (often overlooked)
    if (usage.requests && usage.requests > 1000000) {
      const dnsQueries = usage.requests / 10; // Estimate 1 DNS query per 10 requests
      const dnsCost = (dnsQueries / 1000000) * 0.40;
      costs.push({
        name: 'DNS Queries',
        amount: dnsCost,
        description: 'Route53/Cloud DNS query charges',
        category: 'network',
        avoidable: false,
        tip: 'Use longer TTLs to reduce DNS queries',
        confidence: 0.6
      });
    }
    
    // SSL certificates (for custom domains)
    if (extUsage.customDomains && extUsage.customDomains > 0) {
      costs.push({
        name: 'SSL Certificates',
        amount: extUsage.customDomains * 20,
        description: 'Managed SSL certificate costs',
        category: 'network',
        avoidable: true,
        tip: 'Use Let\'s Encrypt for free certificates',
        confidence: 0.5
      });
    }
    
    // Monitoring/APM tools
    if (extUsage.monitoring) {
      costs.push({
        name: 'Application Monitoring',
        amount: 50, // Base APM cost
        description: 'Application performance monitoring',
        category: 'management',
        avoidable: true,
        tip: 'Use open-source monitoring for smaller projects',
        confidence: 0.7
      });
    }
    
    return costs;
  }
  
  /**
   * Generate cost optimization report
   */
  generateOptimizationReport(report: HiddenCostReport): string {
    let output = `\n🔍 Hidden Cost Analysis for ${report.provider}\n`;
    output += '═'.repeat(50) + '\n\n';
    
    if (report.detectedCosts.length === 0) {
      output += '✅ No significant hidden costs detected\n';
      return output;
    }
    
    output += `💸 Total Hidden Costs: $${report.totalHidden.toFixed(2)}/mo\n`;
    output += `📊 Percentage of Base: ${report.percentOfBase.toFixed(1)}%\n\n`;
    
    output += 'Detected Costs:\n';
    output += '─'.repeat(50) + '\n';
    
    for (const cost of report.detectedCosts) {
      const icon = cost.avoidable ? '🔧' : '📌';
      output += `\n${icon} ${cost.name}: $${cost.amount.toFixed(2)}/mo\n`;
      output += `   ${cost.description}\n`;
      if (cost.tip) {
        output += `   💡 Tip: ${cost.tip}\n`;
      }
      output += `   Confidence: ${(cost.confidence * 100).toFixed(0)}%\n`;
    }
    
    if (report.warnings.length > 0) {
      output += '\n⚠️ Warnings:\n';
      report.warnings.forEach(w => output += `   • ${w}\n`);
    }
    
    if (report.recommendations.length > 0) {
      output += '\n💡 Recommendations:\n';
      report.recommendations.forEach(r => output += `   • ${r}\n`);
    }
    
    return output;
  }
}