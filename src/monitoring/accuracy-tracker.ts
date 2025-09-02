import * as fs from 'fs/promises';
import * as path from 'path';
import type { Usage } from '../providers/base/provider.interface';
import type { CostEstimate } from '../core/cost-engine';

export interface Prediction {
  id: string;
  timestamp: number;
  provider: string;
  usage: Usage;
  predicted: {
    monthly: number;
    yearly: number;
    breakdown: Record<string, number>;
  };
  actual?: {
    monthly: number;
    yearly: number;
    breakdown?: Record<string, number>;
    reportedAt: number;
  };
  variance?: {
    percentage: number;
    absolute: number;
    byService?: Record<string, number>;
  };
  metadata?: {
    userId?: string;
    projectId?: string;
    environment?: string;
    notes?: string;
  };
}

export interface AccuracyReport {
  provider: string;
  totalPredictions: number;
  predictionsWithActuals: number;
  averageAccuracy: number;
  medianAccuracy: number;
  worstCase: {
    accuracy: number;
    predictionId: string;
    variance: number;
  } | null;
  bestCase: {
    accuracy: number;
    predictionId: string;
    variance: number;
  } | null;
  commonMistakes: Array<{
    pattern: string;
    frequency: number;
    averageError: number;
  }>;
  improvementSuggestions: string[];
}

export interface LearningInsight {
  provider: string;
  service: string;
  pattern: string;
  adjustment: number;
  confidence: number;
  samples: number;
}

export class AccuracyTracker {
  private dataDir: string;
  private predictions: Map<string, Prediction> = new Map();
  private learnings: LearningInsight[] = [];
  
  constructor(dataDir: string = './data/accuracy') {
    this.dataDir = dataDir;
    this.initialize();
  }
  
  private async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadPredictions();
      await this.loadLearnings();
    } catch (error) {
      console.error('Failed to initialize AccuracyTracker:', error);
    }
  }
  
  /**
   * Record a new cost prediction
   */
  async recordPrediction(
    provider: string,
    usage: Usage,
    estimate: CostEstimate,
    metadata?: any
  ): Promise<string> {
    const id = this.generateId();
    
    const prediction: Prediction = {
      id,
      timestamp: Date.now(),
      provider,
      usage,
      predicted: {
        monthly: estimate.monthly,
        yearly: estimate.yearly,
        breakdown: estimate.breakdown.serviceCosts
      },
      metadata
    };
    
    this.predictions.set(id, prediction);
    await this.savePrediction(prediction);
    
    return id;
  }
  
  /**
   * Record actual costs for a prediction
   */
  async recordActual(
    predictionId: string,
    actualMonthly: number,
    breakdown?: Record<string, number>
  ): Promise<void> {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new Error(`Prediction ${predictionId} not found`);
    }
    
    // Record actual costs
    prediction.actual = {
      monthly: actualMonthly,
      yearly: actualMonthly * 12,
      breakdown,
      reportedAt: Date.now()
    };
    
    // Calculate variance
    const variance = this.calculateVariance(prediction);
    prediction.variance = variance;
    
    // Learn from the variance
    await this.learnFromMistake(prediction);
    
    // Save updated prediction
    await this.savePrediction(prediction);
    
    // Alert if variance is significant
    if (Math.abs(variance.percentage) > 20) {
      await this.alertHighVariance(prediction);
    }
  }
  
  /**
   * Get accuracy report for a provider
   */
  async getAccuracyReport(provider: string): Promise<AccuracyReport> {
    const providerPredictions = Array.from(this.predictions.values())
      .filter(p => p.provider === provider);
    
    const withActuals = providerPredictions.filter(p => p.actual);
    
    if (withActuals.length === 0) {
      return {
        provider,
        totalPredictions: providerPredictions.length,
        predictionsWithActuals: 0,
        averageAccuracy: 0,
        medianAccuracy: 0,
        worstCase: { accuracy: 0, predictionId: '', variance: 0 },
        bestCase: { accuracy: 100, predictionId: '', variance: 0 },
        commonMistakes: [],
        improvementSuggestions: ['Need more actual data to generate insights']
      };
    }
    
    // Calculate accuracies
    const accuracies = withActuals.map(p => ({
      id: p.id,
      accuracy: 100 - Math.abs(p.variance!.percentage),
      variance: p.variance!.percentage
    }));
    
    // Sort for median
    const sorted = [...accuracies].sort((a, b) => a.accuracy - b.accuracy);
    const medianIndex = Math.floor(sorted.length / 2);
    const median = sorted.length > 0 && sorted[medianIndex] ? sorted[medianIndex]!.accuracy : 0;
    
    // Find best and worst
    const worst = sorted.length > 0 ? sorted[0] : null;
    const best = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    
    // Calculate average
    const average = accuracies.reduce((sum, a) => sum + a.accuracy, 0) / accuracies.length;
    
    // Find common mistakes
    const mistakes = this.findCommonMistakes(withActuals);
    
    // Generate improvement suggestions
    const suggestions = this.generateImprovementSuggestions(withActuals);
    
    return {
      provider,
      totalPredictions: providerPredictions.length,
      predictionsWithActuals: withActuals.length,
      averageAccuracy: average,
      medianAccuracy: median,
      worstCase: worst ? {
        accuracy: worst.accuracy,
        predictionId: worst.id,
        variance: worst.variance
      } : null,
      bestCase: best ? {
        accuracy: best.accuracy,
        predictionId: best.id,
        variance: best.variance
      } : null,
      commonMistakes: mistakes,
      improvementSuggestions: suggestions
    };
  }
  
  /**
   * Get learning adjustments for a provider
   */
  getLearningAdjustments(provider: string, service: string): number {
    const relevantLearnings = this.learnings.filter(
      l => l.provider === provider && l.service === service
    );
    
    if (relevantLearnings.length === 0) return 1.0;
    
    // Weight adjustments by confidence and sample size
    const weightedSum = relevantLearnings.reduce(
      (sum, l) => sum + l.adjustment * l.confidence * Math.log(l.samples + 1),
      0
    );
    
    const totalWeight = relevantLearnings.reduce(
      (sum, l) => sum + l.confidence * Math.log(l.samples + 1),
      0
    );
    
    return totalWeight > 0 ? weightedSum / totalWeight : 1.0;
  }
  
  /**
   * Calculate variance between predicted and actual
   */
  private calculateVariance(prediction: Prediction): any {
    if (!prediction.actual) return null;
    
    const percentageError = ((prediction.actual.monthly - prediction.predicted.monthly) / 
                             prediction.predicted.monthly) * 100;
    
    const absoluteError = Math.abs(prediction.actual.monthly - prediction.predicted.monthly);
    
    // Calculate per-service variance if breakdown available
    let byService: Record<string, number> = {};
    if (prediction.actual.breakdown) {
      for (const [service, actualCost] of Object.entries(prediction.actual.breakdown)) {
        const predictedCost = prediction.predicted.breakdown[service] || 0;
        if (predictedCost > 0) {
          byService[service] = ((actualCost - predictedCost) / predictedCost) * 100;
        }
      }
    }
    
    return {
      percentage: percentageError,
      absolute: absoluteError,
      byService
    };
  }
  
  /**
   * Learn from prediction mistakes
   */
  private async learnFromMistake(prediction: Prediction) {
    if (!prediction.variance) return;
    
    // Find or create learning insight for each service
    for (const [service, variance] of Object.entries(prediction.variance.byService || {})) {
      const existingLearning = this.learnings.find(
        l => l.provider === prediction.provider && l.service === service
      );
      
      if (existingLearning) {
        // Update existing learning
        const newSamples = existingLearning.samples + 1;
        const oldAdjustment = existingLearning.adjustment;
        const newAdjustment = 1 + (variance / 100); // Convert percentage to multiplier
        
        // Weighted average of adjustments
        existingLearning.adjustment = (oldAdjustment * existingLearning.samples + newAdjustment) / newSamples;
        existingLearning.samples = newSamples;
        existingLearning.confidence = Math.min(0.95, 0.5 + newSamples * 0.05); // Increase confidence with samples
      } else {
        // Create new learning
        this.learnings.push({
          provider: prediction.provider,
          service,
          pattern: this.detectPattern(prediction.usage),
          adjustment: 1 + (variance / 100),
          confidence: 0.5,
          samples: 1
        });
      }
    }
    
    await this.saveLearnings();
  }
  
  /**
   * Detect usage patterns
   */
  private detectPattern(usage: Usage): string {
    const patterns: string[] = [];
    
    if (usage.bandwidth && usage.bandwidth > 1000) patterns.push('high-bandwidth');
    if (usage.requests && usage.requests > 10000000) patterns.push('high-traffic');
    if (usage.storage && usage.storage > 500) patterns.push('storage-intensive');
    if (usage.compute && usage.compute > 1000) patterns.push('compute-intensive');
    
    return patterns.join(',') || 'standard';
  }
  
  /**
   * Find common mistakes in predictions
   */
  private findCommonMistakes(predictions: Prediction[]): any[] {
    const mistakes: Map<string, { count: number; totalError: number }> = new Map();
    
    for (const pred of predictions) {
      if (!pred.variance?.byService) continue;
      
      for (const [service, error] of Object.entries(pred.variance.byService)) {
        if (Math.abs(error) > 10) { // Only significant errors
          const key = `${service}-${error > 0 ? 'underestimated' : 'overestimated'}`;
          const existing = mistakes.get(key) || { count: 0, totalError: 0 };
          existing.count++;
          existing.totalError += Math.abs(error);
          mistakes.set(key, existing);
        }
      }
    }
    
    return Array.from(mistakes.entries())
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        averageError: data.totalError / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(predictions: Prediction[]): string[] {
    const suggestions: string[] = [];
    
    // Check for consistent underestimation
    const avgVariance = predictions.reduce((sum, p) => sum + (p.variance?.percentage || 0), 0) / predictions.length;
    
    if (avgVariance > 10) {
      suggestions.push('Predictions consistently underestimate by ' + avgVariance.toFixed(0) + '% - consider adjusting base rates');
    } else if (avgVariance < -10) {
      suggestions.push('Predictions consistently overestimate by ' + Math.abs(avgVariance).toFixed(0) + '% - consider reducing estimates');
    }
    
    // Check for specific service issues
    const serviceErrors: Map<string, number> = new Map();
    for (const pred of predictions) {
      if (pred.variance?.byService) {
        for (const [service, error] of Object.entries(pred.variance.byService)) {
          serviceErrors.set(service, (serviceErrors.get(service) || 0) + error);
        }
      }
    }
    
    for (const [service, totalError] of serviceErrors) {
      const avgError = totalError / predictions.length;
      if (Math.abs(avgError) > 15) {
        suggestions.push(`${service} costs are off by ${avgError.toFixed(0)}% on average`);
      }
    }
    
    // Check for hidden costs
    const hiddenCostPredictions = predictions.filter(p => 
      p.actual && p.actual.monthly > p.predicted.monthly * 1.3
    );
    
    if (hiddenCostPredictions.length > predictions.length * 0.2) {
      suggestions.push('Consider hidden costs - 20%+ of predictions miss significant expenses');
    }
    
    return suggestions;
  }
  
  /**
   * Alert on high variance
   */
  private async alertHighVariance(prediction: Prediction) {
    console.warn(`⚠️ High variance detected for ${prediction.provider}:`);
    console.warn(`   Predicted: $${prediction.predicted.monthly.toFixed(2)}`);
    console.warn(`   Actual: $${prediction.actual!.monthly.toFixed(2)}`);
    console.warn(`   Variance: ${prediction.variance!.percentage.toFixed(1)}%`);
    
    // In production, this could send alerts to monitoring systems
  }
  
  /**
   * Save and load predictions
   */
  private async savePrediction(prediction: Prediction) {
    const filePath = path.join(this.dataDir, `${prediction.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(prediction, null, 2));
  }
  
  private async loadPredictions() {
    try {
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'learnings.json');
      
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(this.dataDir, file), 'utf-8');
        const prediction = JSON.parse(content) as Prediction;
        this.predictions.set(prediction.id, prediction);
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  }
  
  private async saveLearnings() {
    const filePath = path.join(this.dataDir, 'learnings.json');
    await fs.writeFile(filePath, JSON.stringify(this.learnings, null, 2));
  }
  
  private async loadLearnings() {
    try {
      const filePath = path.join(this.dataDir, 'learnings.json');
      const content = await fs.readFile(filePath, 'utf-8');
      this.learnings = JSON.parse(content);
    } catch (error) {
      // File might not exist yet
      this.learnings = [];
    }
  }
  
  private generateId(): string {
    return `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}