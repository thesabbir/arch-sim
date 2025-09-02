/**
 * Geographic Latency Calculator
 * Calculates realistic network latency based on physical distance between data centers
 * and end-user locations, accounting for network topology and CDN usage.
 */

interface DataCenter {
  lat: number;
  lon: number;
  city: string;
  providers: string[];
}

interface CDNProvider {
  locations: number;
  latencyReduction: number;
}

interface LatencyOptions {
  cdn?: string;
  caching?: boolean;
  cacheHitRatio?: number;
  cacheLatency?: number;
  multiService?: boolean;
  services?: ServiceConfig[];
}

interface ServiceConfig {
  region: string;
  callFrequency?: number;
}

interface LatencyResult {
  distance: number;
  baseLatency: number;
  cdnImpact: number;
  cacheImpact: number;
  totalLatency: number;
  interServiceLatency?: number;
  breakdown: Record<string, any>;
}

interface WeightedLatencyResult {
  weightedLatency: number;
  breakdown: Array<{
    region: string;
    percentage: number;
    latency: number;
    contribution: number;
  }>;
}

interface RegionRecommendation {
  region: string;
  averageLatency: number;
  datacenter: string;
}

interface UserDistribution {
  region: string;
  percentage: number;
}

export class LatencyCalculator {
  private datacenters: Record<string, DataCenter>;
  private fiberOpticSpeed: number;
  private networkOverhead: {
    routing: number;
    processing: number;
    congestion: number;
    lastMile: number;
  };
  private cdnProviders: Record<string, CDNProvider>;

  constructor() {
    // Data center locations (approximate coordinates for major regions)
    this.datacenters = {
      'us-east': { lat: 38.7, lon: -77.5, city: 'Virginia', providers: ['aws', 'gcp', 'azure'] },
      'us-west': { lat: 37.4, lon: -122.1, city: 'California', providers: ['aws', 'gcp', 'azure'] },
      'us-central': { lat: 41.8, lon: -87.6, city: 'Chicago', providers: ['aws', 'azure'] },
      'eu-west': { lat: 53.4, lon: -6.3, city: 'Dublin', providers: ['aws', 'gcp', 'azure'] },
      'eu-central': { lat: 50.1, lon: 8.6, city: 'Frankfurt', providers: ['aws', 'gcp', 'azure'] },
      'asia-pacific': { lat: 35.6, lon: 139.6, city: 'Tokyo', providers: ['aws', 'gcp', 'azure'] },
      'asia-southeast': {
        lat: 1.3,
        lon: 103.8,
        city: 'Singapore',
        providers: ['aws', 'gcp', 'azure'],
      },
      'south-america': { lat: -23.5, lon: -46.6, city: 'São Paulo', providers: ['aws', 'azure'] },
      africa: { lat: -26.2, lon: 28.0, city: 'Johannesburg', providers: ['azure', 'aws'] },
      australia: { lat: -33.8, lon: 151.2, city: 'Sydney', providers: ['aws', 'gcp', 'azure'] },
    };

    // Speed of light in fiber optic cable (approximately 200,000 km/s)
    // This accounts for the refractive index of fiber optic cables
    this.fiberOpticSpeed = 200000; // km/s

    // Network overhead factors
    this.networkOverhead = {
      routing: 1.3, // Routing inefficiency (non-direct paths)
      processing: 1.2, // Switch/router processing time
      congestion: 1.1, // Network congestion factor
      lastMile: 5, // Last mile latency addition (ms)
    };

    // CDN edge location impact
    this.cdnProviders = {
      cloudflare: { locations: 275, latencyReduction: 0.3 },
      fastly: { locations: 70, latencyReduction: 0.4 },
      akamai: { locations: 4100, latencyReduction: 0.25 },
      aws_cloudfront: { locations: 450, latencyReduction: 0.35 },
      azure_cdn: { locations: 130, latencyReduction: 0.4 },
    };
  }

  /**
   * Calculate the great circle distance between two points on Earth
   * @param {DataCenter} point1 - First point with lat/lon
   * @param {DataCenter} point2 - Second point with lat/lon
   * @returns {number} Distance in kilometers
   */
  private calculateDistance(point1: DataCenter, point2: DataCenter): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lon - point1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate base network latency between two geographic points
   * @param {number} distance - Distance in kilometers
   * @returns {number} Base latency in milliseconds
   */
  private calculateBaseLatency(distance: number): number {
    // Time for light to travel the distance in fiber
    const lightTime = (distance / this.fiberOpticSpeed) * 1000; // Convert to ms

    // Apply network overhead factors
    const withRouting = lightTime * this.networkOverhead.routing;
    const withProcessing = withRouting * this.networkOverhead.processing;
    const withCongestion = withProcessing * this.networkOverhead.congestion;
    const totalLatency = withCongestion + this.networkOverhead.lastMile;

    // Round trip time (RTT) is typically what we measure
    return totalLatency * 2;
  }

  /**
   * Calculate latency between service datacenter and user region
   * @param {string} serviceRegion - The region where the service is hosted
   * @param {string} userRegion - The region where the user is located
   * @param {LatencyOptions} options - Additional options (cdn, caching, etc.)
   * @returns {LatencyResult} Latency breakdown and total
   */
  calculateLatency(
    serviceRegion: string,
    userRegion: string,
    options: LatencyOptions = {}
  ): LatencyResult {
    const result: LatencyResult = {
      distance: 0,
      baseLatency: 0,
      cdnImpact: 0,
      cacheImpact: 0,
      totalLatency: 0,
      breakdown: {},
    };

    // If regions are the same, minimal latency
    if (serviceRegion === userRegion) {
      result.baseLatency = 2; // Same region, typically 1-3ms
      result.breakdown.sameRegion = true;
    } else {
      // Get datacenter locations
      const serviceLocation = this.datacenters[serviceRegion];
      const userLocation = this.datacenters[userRegion];

      if (!serviceLocation || !userLocation) {
        // Fallback to estimated latency if regions unknown
        result.baseLatency = this.estimateFallbackLatency(serviceRegion, userRegion);
        result.breakdown.estimated = true;
      } else {
        // Calculate actual distance
        result.distance = this.calculateDistance(serviceLocation, userLocation);
        result.baseLatency = this.calculateBaseLatency(result.distance);
        result.breakdown.distance = result.distance;
      }
    }

    // Apply CDN optimization if present
    if (options.cdn) {
      const cdnProvider = this.cdnProviders[options.cdn];
      if (cdnProvider) {
        result.cdnImpact = -result.baseLatency * cdnProvider.latencyReduction;
        result.breakdown.cdnOptimization = `${cdnProvider.latencyReduction * 100}%`;
      }
    }

    // Apply caching optimization
    if (options.caching) {
      // Cache hits dramatically reduce latency
      const cacheHitRatio = options.cacheHitRatio || 0.7;
      const cacheLatency = options.cacheLatency || 2; // Redis/Memcached typical latency

      // Weighted average: cache hits use cache latency, misses use full latency
      const effectiveLatency =
        cacheHitRatio * cacheLatency + (1 - cacheHitRatio) * result.baseLatency;
      result.cacheImpact = effectiveLatency - result.baseLatency;
      result.breakdown.cacheHitRatio = cacheHitRatio;
    }

    // Calculate total latency
    result.totalLatency = Math.max(
      1, // Minimum 1ms latency
      result.baseLatency + result.cdnImpact + result.cacheImpact
    );

    // Add inter-service latency if multiple services
    if (options.multiService) {
      result.interServiceLatency = this.calculateInterServiceLatency(options.services);
      result.totalLatency += result.interServiceLatency;
    }

    return result;
  }

  /**
   * Calculate latency between multiple services
   * @param {ServiceConfig[]} services - Array of service configurations
   * @returns {number} Total inter-service latency
   */
  private calculateInterServiceLatency(services?: ServiceConfig[]): number {
    if (!services || services.length < 2) return 0;

    let totalLatency = 0;

    // Calculate latency between each service pair that communicates
    for (let i = 0; i < services.length - 1; i++) {
      const service1 = services[i];
      const service2 = services[i + 1];

      if (service1 && service2 && service1.region !== service2.region) {
        const latency = this.calculateLatency(service1.region, service2.region);
        totalLatency += latency.totalLatency * (service1.callFrequency || 1);
      } else if (service1) {
        // Same region, minimal latency
        totalLatency += 1 * (service1.callFrequency || 1);
      }
    }

    return totalLatency;
  }

  /**
   * Estimate fallback latency when exact locations are unknown
   * @param {string} region1 - First region
   * @param {string} region2 - Second region
   * @returns {number} Estimated latency in ms
   */
  private estimateFallbackLatency(region1: string, region2: string): number {
    // Continental groupings for estimation
    const continents: Record<string, string> = {
      'us-east': 'north-america',
      'us-west': 'north-america',
      'us-central': 'north-america',
      'eu-west': 'europe',
      'eu-central': 'europe',
      'asia-pacific': 'asia',
      'asia-southeast': 'asia',
      'south-america': 'south-america',
      africa: 'africa',
      australia: 'oceania',
    };

    const continent1 = continents[region1] || 'unknown';
    const continent2 = continents[region2] || 'unknown';

    // Estimated latencies between continents (ms)
    const intercontinentalLatency: Record<string, number> = {
      same: 20,
      'north-america-europe': 80,
      'north-america-asia': 150,
      'europe-asia': 120,
      'north-america-south-america': 100,
      'europe-south-america': 150,
      'asia-oceania': 100,
      default: 200,
    };

    if (continent1 === continent2) {
      return intercontinentalLatency.same ?? 20;
    }

    const key1 = `${continent1}-${continent2}`;
    const key2 = `${continent2}-${continent1}`;

    return (
      intercontinentalLatency[key1] ??
      intercontinentalLatency[key2] ??
      intercontinentalLatency.default ??
      200
    );
  }

  /**
   * Calculate weighted average latency for geographic distribution
   * @param {string} serviceRegion - Where the service is hosted
   * @param {UserDistribution[]} userDistribution - Array of {region, percentage} objects
   * @param {LatencyOptions} options - Additional options
   * @returns {WeightedLatencyResult} Weighted latency calculation
   */
  calculateWeightedLatency(
    serviceRegion: string,
    userDistribution: UserDistribution[],
    options: LatencyOptions = {}
  ): WeightedLatencyResult {
    if (!userDistribution || userDistribution.length === 0) {
      return { weightedLatency: 0, breakdown: [] };
    }

    let totalWeightedLatency = 0;
    const breakdown: WeightedLatencyResult['breakdown'] = [];

    for (const distribution of userDistribution) {
      const latencyResult = this.calculateLatency(serviceRegion, distribution.region, options);

      const weightedLatency = latencyResult.totalLatency * (distribution.percentage / 100);
      totalWeightedLatency += weightedLatency;

      breakdown.push({
        region: distribution.region,
        percentage: distribution.percentage,
        latency: latencyResult.totalLatency,
        contribution: weightedLatency,
      });
    }

    return {
      weightedLatency: Math.round(totalWeightedLatency),
      breakdown,
    };
  }

  /**
   * Recommend optimal regions for deployment based on user distribution
   * @param {UserDistribution[]} userDistribution - Array of {region, percentage} objects
   * @param {string[]} availableRegions - Regions where deployment is possible
   * @returns {RegionRecommendation[]} Ranked recommendations
   */
  recommendOptimalRegions(
    userDistribution: UserDistribution[],
    availableRegions: string[]
  ): RegionRecommendation[] {
    const recommendations: RegionRecommendation[] = [];

    for (const deployRegion of availableRegions) {
      const result = this.calculateWeightedLatency(deployRegion, userDistribution);
      recommendations.push({
        region: deployRegion,
        averageLatency: result.weightedLatency,
        datacenter: this.datacenters[deployRegion]?.city || 'Unknown',
      });
    }

    // Sort by lowest average latency
    return recommendations.sort((a, b) => a.averageLatency - b.averageLatency);
  }
}

// Export singleton instance
export const latencyCalculator = new LatencyCalculator();
