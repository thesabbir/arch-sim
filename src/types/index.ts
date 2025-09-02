// Core type definitions for Architecture Simulator

// ============================================================================
// Architecture Configuration Types
// ============================================================================

export interface Architecture {
  name: string;
  description?: string;
  region?: string;
  budget?: BudgetConfig;

  application?: ApplicationConfig;
  frontend?: FrontendConfig;
  databases?: DatabasesConfig;
  hosting?: HostingConfig;
  services?: ServicesConfig;
  load_profile?: LoadProfile;
  performance_targets?: PerformanceTargets;
  development?: DevelopmentConfig;
  cache?: CacheConfig;
  monitoring?: MonitoringConfig;
  authentication?: AuthConfig;
  security?: SecurityConfig;
}

export interface BudgetConfig {
  monthly_limit: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  alerts_at?: number; // percentage
  optimization_priority?: 'cost' | 'performance' | 'balanced';
}

export interface ApplicationConfig {
  language: ProgrammingLanguage;
  runtime: RuntimeEnvironment;
  framework: string;
  version?: string;
}

export type ProgrammingLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'php';

export type RuntimeEnvironment =
  | 'node'
  | 'deno'
  | 'bun'
  | 'python3'
  | 'go'
  | 'rust'
  | 'jvm'
  | 'dotnet'
  | 'ruby'
  | 'php';

export interface FrontendConfig {
  framework: FrontendFramework;
  version?: string;
  build_tool?: BuildTool;
  static_hosting?: StaticHostingConfig;
}

export type FrontendFramework =
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'nextjs'
  | 'nuxt'
  | 'gatsby'
  | 'vanilla';

export type BuildTool = 'webpack' | 'vite' | 'rollup' | 'parcel' | 'esbuild' | 'turbopack';

export interface StaticHostingConfig {
  provider: CDNProvider;
  cdn: boolean;
  custom_domain?: string;
}

// ============================================================================
// Database Configuration Types
// ============================================================================

export interface DatabasesConfig {
  primary?: DatabaseInstance;
  secondary?: DatabaseInstance;
  cache?: CacheInstance;
  vector?: VectorDatabaseInstance;
  timeseries?: TimeSeriesDatabaseInstance;
  [key: string]:
    | DatabaseInstance
    | CacheInstance
    | VectorDatabaseInstance
    | TimeSeriesDatabaseInstance
    | undefined;
}

export interface DatabaseInstance {
  type: DatabaseType;
  provider: DatabaseProvider;
  plan: DatabasePlan;
  size?: string;
  replicas?: number;
  backup?: BackupConfig;
  encryption?: EncryptionConfig;
}

export type DatabaseType = 'relational' | 'document' | 'graph' | 'key-value' | 'wide-column';

export type DatabaseProvider =
  | 'postgresql'
  | 'mysql'
  | 'mongodb'
  | 'dynamodb'
  | 'firestore'
  | 'cassandra'
  | 'neo4j'
  | 'redis';

export type DatabasePlan = 'free' | 'starter' | 'standard' | 'pro' | 'enterprise';

export interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  geo_redundant?: boolean;
}

export interface EncryptionConfig {
  at_rest: boolean;
  in_transit: boolean;
  key_management?: 'managed' | 'customer' | 'hsm';
}

export interface CacheInstance {
  provider: CacheProvider;
  plan: CachePlanType;
  size?: string;
  eviction_policy?: EvictionPolicy;
  ttl_seconds?: number;
}

export type CacheProvider = 'redis' | 'memcached' | 'upstash' | 'elasticache' | 'cloudflare';

export type CachePlanType = 'free' | 'pay_as_you_go' | 'standard' | 'pro';

export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'random';

export interface VectorDatabaseInstance {
  provider: 'pinecone' | 'weaviate' | 'qdrant' | 'milvus';
  plan: DatabasePlan;
  dimensions?: number;
  index_type?: 'hnsw' | 'ivf' | 'lsh';
}

export interface TimeSeriesDatabaseInstance {
  provider: 'influxdb' | 'timescaledb' | 'prometheus';
  plan: DatabasePlan;
  retention_policy?: string;
  aggregation_interval?: string;
}

// ============================================================================
// Hosting Configuration Types
// ============================================================================

export interface HostingConfig {
  backend?: HostingInstance;
  frontend?: HostingInstance;
  microservices?: MicroserviceHosting[];
}

export interface HostingInstance {
  provider: HostingProvider;
  service_type: ServiceType;
  instance_type: InstanceType;
  region?: AWSRegion | AzureRegion | GCPRegion;
  auto_scaling?: AutoScalingConfig;
  deployment_strategy?: DeploymentStrategy;
}

export type HostingProvider =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'vercel'
  | 'netlify'
  | 'railway'
  | 'render'
  | 'fly'
  | 'heroku';

export type ServiceType = 'serverless' | 'container' | 'vm' | 'static' | 'edge' | 'kubernetes';

export type InstanceType = 'free' | 'hobby' | 'starter' | 'standard' | 'pro' | 'enterprise';

export type AWSRegion =
  | 'us-east-1'
  | 'us-west-2'
  | 'eu-west-1'
  | 'ap-southeast-1'
  | 'ap-northeast-1';

export type AzureRegion = 'eastus' | 'westus' | 'northeurope' | 'westeurope' | 'eastasia';

export type GCPRegion =
  | 'us-central1'
  | 'us-east1'
  | 'europe-west1'
  | 'asia-east1'
  | 'asia-northeast1';

export interface AutoScalingConfig {
  enabled: boolean;
  min_instances: number;
  max_instances: number;
  target_cpu_percent?: number;
  target_memory_percent?: number;
  scale_up_cooldown?: number;
  scale_down_cooldown?: number;
}

export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';

export interface MicroserviceHosting {
  name: string;
  hosting: HostingInstance;
  replicas?: number;
  resources?: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu_cores: number;
  memory_gb: number;
  storage_gb?: number;
  gpu?: GPURequirements;
}

export interface GPURequirements {
  type: 'nvidia-t4' | 'nvidia-a100' | 'nvidia-v100';
  count: number;
}

// ============================================================================
// Services Configuration Types
// ============================================================================

export interface ServicesConfig {
  api_gateway?: APIGatewayConfig;
  load_balancer?: LoadBalancerConfig;
  message_queue?: MessageQueueConfig;
  search?: SearchServiceConfig;
  cdn?: CDNConfig;
  email?: EmailServiceConfig;
  storage?: StorageServiceConfig;
  ai?: AIServiceConfig;
  authentication?: boolean;
  monitoring?: boolean;
  [key: string]: unknown;
}

export interface APIGatewayConfig {
  provider: 'aws-api-gateway' | 'kong' | 'apigee' | 'azure-api-management';
  rate_limiting?: RateLimitConfig;
  authentication?: boolean;
  caching?: boolean;
}

export interface RateLimitConfig {
  requests_per_second?: number;
  requests_per_minute?: number;
  requests_per_hour?: number;
  burst_limit?: number;
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
  health_check?: HealthCheckConfig;
}

export interface HealthCheckConfig {
  path: string;
  interval_seconds: number;
  timeout_seconds: number;
  healthy_threshold: number;
  unhealthy_threshold: number;
}

export interface MessageQueueConfig {
  provider: QueueProvider;
  plan: string;
  max_message_size_kb?: number;
  retention_period_days?: number;
  dead_letter_queue?: boolean;
}

export type QueueProvider =
  | 'aws-sqs'
  | 'rabbitmq'
  | 'kafka'
  | 'redis-streams'
  | 'gcp-pubsub'
  | 'azure-service-bus';

export interface SearchServiceConfig {
  provider: 'elasticsearch' | 'algolia' | 'meilisearch' | 'typesense';
  plan: string;
  index_size_gb?: number;
  replica_count?: number;
}

export interface CDNConfig {
  provider: CDNProvider;
  plan: string;
  cache_strategy?: CacheStrategy;
  edge_locations?: number;
}

export type CDNProvider = 'cloudflare' | 'fastly' | 'akamai' | 'cloudfront' | 'bunny';

export interface CacheStrategy {
  static_ttl_seconds: number;
  dynamic_ttl_seconds?: number;
  browser_ttl_seconds?: number;
  bypass_patterns?: string[];
}

export interface EmailServiceConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend';
  plan: string;
  monthly_emails?: number;
}

export interface StorageServiceConfig {
  provider: 's3' | 'gcs' | 'azure-blob' | 'cloudflare-r2' | 'backblaze-b2';
  plan: string;
  storage_gb?: number;
  transfer_gb?: number;
}

export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'cohere' | 'huggingface';
  model?: string;
  monthly_tokens?: number;
}

// ============================================================================
// Load Profile and Performance Types
// ============================================================================

export interface LoadProfile {
  requests_per_second: number;
  peak_multiplier: number;
  monthly_active_users: number;
  average_request_size_kb: number;
  average_response_size_kb: number;
  read_write_ratio?: string;
  cache_hit_ratio?: number;
  geographic_distribution?: GeographicDistribution[];
  traffic_pattern?: TrafficPattern;
  concurrent_users?: number;
  data_size?: number;
}

export interface GeographicDistribution {
  region: string;
  percentage: number;
}

export type TrafficPattern = 'steady' | 'spiky' | 'periodic' | 'growing';

export interface PerformanceTargets {
  response_time_p50_ms?: number;
  response_time_p95_ms?: number;
  response_time_p99_ms?: number;
  availability_sla?: AvailabilitySLA;
  error_rate_threshold?: number;
  apdex_target?: number;
}

export type AvailabilitySLA = '99%' | '99.9%' | '99.95%' | '99.99%' | '99.999%';

// ============================================================================
// Development and Operations Types
// ============================================================================

export interface DevelopmentConfig {
  team_size?: number;
  deployment_frequency?: DeploymentFrequency;
  ci_cd?: CICDConfig;
  environments?: Environment[];
  testing_strategy?: TestingStrategy;
}

export type DeploymentFrequency = 'multiple-per-day' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

export interface CICDConfig {
  provider: CICDProvider;
  plan?: string;
  parallel_jobs?: number;
  artifact_storage_gb?: number;
}

export type CICDProvider =
  | 'github-actions'
  | 'gitlab-ci'
  | 'jenkins'
  | 'circleci'
  | 'azure-devops'
  | 'bitbucket-pipelines';

export interface Environment {
  name: 'development' | 'staging' | 'production' | 'qa';
  scaling_factor: number;
  data_subset?: number; // percentage
}

export interface TestingStrategy {
  unit_tests: boolean;
  integration_tests: boolean;
  e2e_tests: boolean;
  performance_tests: boolean;
  security_tests: boolean;
  chaos_engineering?: boolean;
}

// ============================================================================
// Cache Configuration Types
// ============================================================================

export interface CacheConfig {
  provider: CacheProvider;
  plan: CachePlanType;
  ttl_seconds?: number;
  eviction_policy?: EvictionPolicy;
  warm_up_strategy?: WarmUpStrategy;
  invalidation_strategy?: InvalidationStrategy;
}

export type WarmUpStrategy = 'lazy' | 'eager' | 'scheduled' | 'predictive';

export type InvalidationStrategy = 'ttl' | 'event-based' | 'manual' | 'hybrid';

// ============================================================================
// Monitoring and Observability Types
// ============================================================================

export interface MonitoringConfig {
  provider: MonitoringProvider;
  plan: string;
  retention_days?: number;
  custom_metrics?: boolean;
  alerting?: AlertingConfig;
  dashboards?: DashboardConfig[];
}

export type MonitoringProvider =
  | 'datadog'
  | 'new-relic'
  | 'prometheus'
  | 'grafana-cloud'
  | 'elastic-apm'
  | 'azure-monitor';

export interface AlertingConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
}

export type AlertChannel = 'email' | 'slack' | 'pagerduty' | 'webhook' | 'sms';

export interface AlertRule {
  metric: string;
  condition: 'above' | 'below' | 'equals' | 'not-equals';
  threshold: number;
  duration_minutes: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface DashboardConfig {
  name: string;
  type: 'system' | 'application' | 'business' | 'custom';
  refresh_interval_seconds?: number;
}

// ============================================================================
// Authentication and Security Types
// ============================================================================

export interface AuthConfig {
  provider: AuthProvider;
  plan: string;
  mfa?: MFAConfig;
  sso?: SSOConfig;
  session_management?: SessionConfig;
}

export type AuthProvider = 'auth0' | 'okta' | 'cognito' | 'firebase-auth' | 'supabase' | 'clerk';

export interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  required_for?: string[]; // roles or user groups
}

export type MFAMethod = 'totp' | 'sms' | 'email' | 'biometric' | 'hardware-key';

export interface SSOConfig {
  enabled: boolean;
  providers: SSOProvider[];
  auto_provisioning?: boolean;
}

export type SSOProvider = 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'active-directory';

export interface SessionConfig {
  timeout_minutes: number;
  refresh_enabled?: boolean;
  concurrent_sessions?: number;
}

export interface SecurityConfig {
  waf?: WAFConfig;
  ddos_protection?: boolean;
  ssl_certificate?: SSLConfig;
  security_scanning?: SecurityScanningConfig;
  compliance?: ComplianceConfig[];
}

export interface WAFConfig {
  provider: 'cloudflare' | 'aws-waf' | 'azure-waf' | 'akamai';
  rule_sets: string[];
  custom_rules?: number;
}

export interface SSLConfig {
  type: 'managed' | 'custom' | 'lets-encrypt';
  auto_renewal?: boolean;
  hsts_enabled?: boolean;
}

export interface SecurityScanningConfig {
  sast: boolean;
  dast: boolean;
  dependency_scanning: boolean;
  container_scanning?: boolean;
  frequency?: 'on-commit' | 'daily' | 'weekly' | 'monthly';
}

export type ComplianceConfig = 'gdpr' | 'hipaa' | 'pci-dss' | 'sox' | 'iso-27001' | 'ccpa';

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
  code: string;
}

export interface ValidationSuggestion {
  field: string;
  message: string;
  severity: 'info';
  code: string;
}

export interface ValidationOutput {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Performance Simulation Types
// ============================================================================

export interface PerformanceResult {
  available: boolean;
  metrics?: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  scalability: ScalabilityAnalysis;
  recommendations?: PerformanceRecommendation[];
}

export interface PerformanceMetrics {
  estimatedRPS: number;
  targetRPS: number;
  performanceGap: number;
  estimatedResponseTime: number;
  targetResponseTime: number;
  responseTimeGap: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  concurrentUsers: number;
  errorRate: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  totalMemoryMB: number;
}

export interface Bottleneck {
  type: 'performance' | 'resource' | 'latency' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  issue: string;
  impact: number | string;
  solutions: string[];
}

export interface ScalabilityAnalysis {
  currentCapacity: number;
  estimatedMaxCapacity: number;
  scaleMultiplier: number;
  scalingStrategy: string;
  constraints: ScalingConstraint[];
}

export interface ScalingConstraint {
  type: 'technical' | 'cost' | 'architectural';
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface PerformanceRecommendation {
  category: 'optimization' | 'scaling' | 'architecture' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedImpact?: string;
  effort?: 'low' | 'medium' | 'high';
}

// ============================================================================
// Cost Calculation Types
// ============================================================================

export interface CostResult {
  totalCost: number;
  currency: string;
  breakdown: CostBreakdown;
  usage: UsageMetrics;
  optimizations?: CostOptimization[];
  forecast?: CostForecast;
}

export interface CostBreakdown {
  backend_hosting?: number;
  frontend_hosting?: number;
  databases?: number;
  cache?: number;
  cdn?: number;
  monitoring?: number;
  authentication?: number;
  additional_services?: number;
  [key: string]: number | undefined;
}

export interface UsageMetrics {
  monthlyRequests: number;
  monthlyBandwidthGB: number;
  dataStorageGB: number;
  computeHours?: number;
  concurrentUsers: number;
  peakRequestsPerSecond?: number;
}

export interface CostOptimization {
  type: 'hosting' | 'database' | 'cache' | 'cdn' | 'architecture';
  current_cost: number;
  suggestion: string;
  potential_savings: number;
  effort: 'low' | 'medium' | 'high';
  risk?: 'low' | 'medium' | 'high';
}

export interface CostForecast {
  next_month: number;
  next_quarter: number;
  next_year: number;
  growth_rate?: number;
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingTier {
  name?: string;
  monthly_cost?: number;
  includes?: TierInclusions;
  limits?: TierLimits;
  overage_rates?: OverageRates;
}

export interface TierInclusions {
  requests?: number;
  bandwidth_gb?: number;
  storage_gb?: number;
  compute_hours?: number;
  users?: number;
  [key: string]: number | undefined;
}

export interface TierLimits {
  max_requests?: number;
  max_bandwidth_gb?: number;
  max_storage_gb?: number;
  max_instances?: number;
  [key: string]: number | undefined;
}

export interface OverageRates {
  per_gb?: number;
  per_million_requests?: number;
  per_compute_hour?: number;
  [key: string]: number | undefined;
}

export interface CachePlan {
  name: string;
  memory?: string;
  price_per_month: number;
  max_connections?: number;
  persistence?: boolean;
  replication?: boolean;
}

// ============================================================================
// Latency Calculation Types
// ============================================================================

export interface LatencyResult {
  totalLatency: number;
  baseLatency: number;
  cdnImpact?: number;
  cacheImpact?: number;
  breakdown: LatencyBreakdown;
  p50?: number;
  p95?: number;
  p99?: number;
  weightedLatency?: number;
}

export interface LatencyBreakdown {
  network: number;
  processing: number;
  database: number;
  cache?: number;
  cdn?: number;
  interService?: number;
  [key: string]: number | undefined;
}

export interface ServiceConfig {
  name: string;
  region: string;
  callFrequency?: number;
  dependencies?: string[];
}

// ============================================================================
// Ecosystem Types
// ============================================================================

export interface EcosystemData {
  platform_ecosystem: PlatformEcosystem;
  performance_benchmarks?: PerformanceBenchmarks;
  pricing: PricingData;
  compatibility_matrix?: CompatibilityMatrix;
}

export interface PlatformEcosystem {
  version: string;
  last_updated: string;
  languages: {
    backend: Language[];
    frontend?: Language[];
  };
  frameworks: Record<string, Framework[]>;
  frontend_frameworks?: Record<string, Framework[]>;
  databases: Record<string, DatabaseProviderInfo[]>;
  hosting_platforms: Record<string, HostingProviderInfo[]>;
  caching: Record<string, CacheProviderInfo[]>;
  monitoring: MonitoringProviderInfo[];
  authentication: AuthProviderInfo[];
}

export interface Language {
  id: string;
  name: string;
  runtime: string;
  performance_tier: PerformanceTier;
  memory_usage: ResourceUsage;
  ecosystem_maturity?: 'emerging' | 'growing' | 'mature' | 'enterprise';
}

export type PerformanceTier = 'low' | 'medium' | 'high' | 'very_high';
export type ResourceUsage = 'low' | 'medium' | 'high';

export interface Framework {
  id: string;
  name: string;
  type: string;
  performance_tier: PerformanceTier;
  learning_curve?: 'easy' | 'moderate' | 'steep';
  community_size?: 'small' | 'medium' | 'large';
}

export interface DatabaseProviderInfo {
  id: string;
  name: string;
  type: DatabaseType;
  managed: boolean;
  pricing_model: PricingModel;
  free_tier?: boolean;
  regions?: string[];
}

export interface HostingProviderInfo {
  id: string;
  name: string;
  type: ServiceType;
  pricing_model: PricingModel;
  regions: string[];
  free_tier?: boolean;
  auto_scaling?: boolean;
}

export interface CacheProviderInfo {
  id: string;
  name: string;
  type: 'in-memory' | 'distributed' | 'edge';
  managed: boolean;
  pricing_model: PricingModel;
}

export interface MonitoringProviderInfo {
  id: string;
  name: string;
  features: string[];
  pricing_model: PricingModel;
}

export interface AuthProviderInfo {
  id: string;
  name: string;
  features: string[];
  pricing_model: PricingModel;
}

export type PricingModel =
  | 'free'
  | 'pay-as-you-go'
  | 'tiered'
  | 'flat-rate'
  | 'usage-based'
  | 'seat-based';

export interface PerformanceBenchmarks {
  languages: Record<string, LanguageBenchmark>;
  frameworks: Record<string, FrameworkBenchmark>;
  databases?: Record<string, DatabaseBenchmark>;
}

export interface LanguageBenchmark {
  requests_per_second: number;
  memory_usage_mb: number;
  cold_start_ms: number;
  concurrent_connections?: number;
}

export interface FrameworkBenchmark {
  requests_per_second: number;
  overhead_factor: number;
  startup_time_ms?: number;
}

export interface DatabaseBenchmark {
  read_ops_per_second: number;
  write_ops_per_second: number;
  query_latency_ms: number;
}

export interface PricingData {
  hosting: Record<string, ProviderPricing>;
  databases: Record<string, ProviderPricing>;
  caching?: Record<string, ProviderPricing>;
  cdn?: Record<string, ProviderPricing>;
  monitoring?: Record<string, ProviderPricing>;
  authentication?: Record<string, ProviderPricing>;
}

export interface ProviderPricing {
  [tier: string]: PricingTier | PricingPlan;
}

export interface PricingPlan {
  name?: string;
  price_per_month?: number;
  price_per_hour?: number;
  included?: TierInclusions;
  pay_as_you_go?: PayAsYouGoPricing;
  fixed_plans?: FixedPricingPlan[];
  rates?: Record<string, number>;
  includes?: TierInclusions;
  starting_at?: number;
}

export interface PayAsYouGoPricing {
  rates: Record<string, number>;
  minimum_charge?: number;
}

export interface FixedPricingPlan {
  name: string;
  monthly_cost: number;
  limits: TierLimits;
}

export interface CompatibilityMatrix {
  language_framework: Record<string, string[]>;
  framework_hosting: Record<string, string[]>;
  database_hosting: Record<string, string[]>;
}

// ============================================================================
// Simulation Result Types
// ============================================================================

export interface SimulationResult {
  success: boolean;
  error?: string;
  results?: SimulationResults;
}

export interface SimulationResults {
  validation: ValidationOutput;
  performance: PerformanceResult;
  cost: CostResult;
  recommendations: Recommendation[];
  metadata: SimulationMetadata;
}

export interface Recommendation {
  type: RecommendationType;
  priority: Priority;
  category: string;
  title: string;
  description: string;
  impact?: string;
  effort?: EffortLevel;
  cost_impact?: number;
  performance_impact?: string;
}

export type RecommendationType =
  | 'optimization'
  | 'scaling'
  | 'cost'
  | 'security'
  | 'reliability'
  | 'performance';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type EffortLevel = 'low' | 'medium' | 'high';

export interface SimulationMetadata {
  timestamp: string;
  version: string;
  configFile: string;
  executionTime: number;
  ecosystem_version?: string;
  warnings?: string[];
}

// ============================================================================
// Test Configuration Types
// ============================================================================

export interface TestConfig {
  test: TestDefinition;
  architecture: Architecture;
  expectations?: TestExpectations;
}

export interface TestDefinition {
  name: string;
  description: string;
  author?: string;
  tags?: string[];
  version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TestExpectations {
  validation?: ValidationExpectations;
  performance?: PerformanceExpectations;
  cost?: CostExpectations;
  recommendations?: RecommendationExpectations;
}

export interface ValidationExpectations {
  should_be_valid?: boolean;
  max_issues?: number;
  max_warnings?: number;
  required_checks?: string[];
}

export interface PerformanceExpectations {
  min_rps?: number;
  max_response_time?: number;
  should_meet_targets?: boolean;
  max_memory_mb?: number;
  min_scale_factor?: number;
}

export interface CostExpectations {
  max_monthly_cost?: number;
  should_be_within_budget?: boolean;
  max_budget_usage?: number;
  max_service_cost?: Record<string, number>;
}

export interface RecommendationExpectations {
  max_critical?: number;
  max_high?: number;
  should_include_types?: string[];
  should_not_include_types?: string[];
}

// ============================================================================
// Test Result Types
// ============================================================================

export interface TestResult {
  name: string;
  path: string;
  status: TestStatus;
  duration: number;
  assertions: TestAssertion[];
  errors: string[];
  warnings: string[];
  metadata?: TestResultMetadata;
}

export type TestStatus = 'passed' | 'failed' | 'warning' | 'skipped' | 'running';

export interface TestAssertion {
  description: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestResultMetadata {
  started_at: string;
  completed_at: string;
  test_suite?: string;
  environment?: string;
}

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  totalTime: number;
  successRate?: number;
}

// ============================================================================
// CLI and Configuration Types
// ============================================================================

export interface CLIOptions {
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  output?: string;
  config?: string;
  ecosystem?: string;
  format?: OutputFormat;
  color?: boolean;
}

export type OutputFormat = 'text' | 'json' | 'yaml' | 'markdown' | 'html';

export interface SimulatorConfig {
  ecosystemPath?: string;
  outputFormat?: OutputFormat;
  verbosity?: VerbosityLevel;
  plugins?: Plugin[];
  extensions?: Extension[];
}

export type VerbosityLevel = 'silent' | 'quiet' | 'normal' | 'verbose' | 'debug';

export interface Plugin {
  name: string;
  version: string;
  config?: Record<string, unknown>;
}

export interface Extension {
  name: string;
  type: 'validator' | 'calculator' | 'optimizer' | 'reporter';
  path: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type Nullable<T> = T | null | undefined;

export type AsyncResult<T> = Promise<
  { success: true; data: T } | { success: false; error: string }
>;
