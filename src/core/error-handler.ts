/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

export enum ErrorCode {
  // Provider Errors (1xxx)
  PROVIDER_NOT_FOUND = 1001,
  PROVIDER_INITIALIZATION_FAILED = 1002,
  PROVIDER_VALIDATION_FAILED = 1003,
  PROVIDER_SERVICE_UNAVAILABLE = 1004,
  
  // Pricing Errors (2xxx)
  PRICING_DATA_NOT_FOUND = 2001,
  PRICING_DATA_INVALID = 2002,
  PRICING_CALCULATION_FAILED = 2003,
  PRICING_OVERRIDE_FAILED = 2004,
  
  // Data Errors (3xxx)
  DATA_LOAD_FAILED = 3001,
  DATA_PARSE_FAILED = 3002,
  DATA_VALIDATION_FAILED = 3003,
  DATA_SAVE_FAILED = 3004,
  
  // AI Errors (4xxx)
  AI_PROVIDER_NOT_CONFIGURED = 4001,
  AI_REQUEST_FAILED = 4002,
  AI_RESPONSE_INVALID = 4003,
  AI_RATE_LIMITED = 4004,
  
  // Configuration Errors (5xxx)
  CONFIG_NOT_FOUND = 5001,
  CONFIG_INVALID = 5002,
  CONFIG_MISSING_REQUIRED = 5003,
  
  // Network Errors (6xxx)
  NETWORK_TIMEOUT = 6001,
  NETWORK_UNAVAILABLE = 6002,
  NETWORK_REQUEST_FAILED = 6003,
  
  // General Errors (9xxx)
  UNKNOWN_ERROR = 9999,
  INVALID_INPUT = 9001,
  OPERATION_CANCELLED = 9002,
  PERMISSION_DENIED = 9003
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestions?: string[];
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly recoverable: boolean;
  public readonly suggestions?: string[];
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: any;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      recoverable?: boolean;
      suggestions?: string[];
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details;
    this.severity = options?.severity || 'medium';
    this.recoverable = options?.recoverable ?? true;
    this.suggestions = options?.suggestions;
    this.timestamp = new Date().toISOString();
    
    if (options?.cause) {
      this.cause = options.cause;
    }
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toContext(): ErrorContext {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp,
      severity: this.severity,
      recoverable: this.recoverable,
      suggestions: this.suggestions
    };
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      severity: this.severity,
      recoverable: this.recoverable,
      suggestions: this.suggestions,
      timestamp: this.timestamp
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorContext[] = [];
  private maxLogSize = 1000;
  private errorHandlers: Map<ErrorCode, (error: AppError) => void> = new Map();
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  /**
   * Handle an error with appropriate logging and recovery
   */
  handle(error: Error | AppError): void {
    const appError = this.normalizeError(error);
    const context = appError.toContext();
    
    // Log the error
    this.logError(context);
    
    // Execute custom handler if registered
    const customHandler = this.errorHandlers.get(appError.code);
    if (customHandler) {
      customHandler(appError);
    }
    
    // Handle based on severity
    switch (appError.severity) {
      case 'critical':
        this.handleCriticalError(appError);
        break;
      case 'high':
        this.handleHighError(appError);
        break;
      case 'medium':
        this.handleMediumError(appError);
        break;
      case 'low':
        this.handleLowError(appError);
        break;
    }
  }
  
  /**
   * Register a custom handler for specific error codes
   */
  registerHandler(code: ErrorCode, handler: (error: AppError) => void): void {
    this.errorHandlers.set(code, handler);
  }
  
  /**
   * Wrap an async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    options?: {
      fallback?: T;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<T> {
    let lastError: Error | undefined;
    const retries = options?.retries || 0;
    const retryDelay = options?.retryDelay || 1000;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.handle(error as Error);
        
        if (attempt < retries) {
          console.log(`Retry attempt ${attempt + 1}/${retries} after ${retryDelay}ms...`);
          await this.delay(retryDelay);
        }
      }
    }
    
    if (options?.fallback !== undefined) {
      return options.fallback;
    }
    
    throw lastError;
  }
  
  /**
   * Wrap a sync function with error handling
   */
  wrap<T>(
    fn: () => T,
    options?: {
      fallback?: T;
    }
  ): T {
    try {
      return fn();
    } catch (error) {
      this.handle(error as Error);
      
      if (options?.fallback !== undefined) {
        return options.fallback;
      }
      
      throw error;
    }
  }
  
  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<string, number>;
    byCode: Record<number, number>;
    recent: ErrorContext[];
  } {
    const bySeverity: Record<string, number> = {};
    const byCode: Record<number, number> = {};
    
    for (const error of this.errorLog) {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    }
    
    return {
      total: this.errorLog.length,
      bySeverity,
      byCode,
      recent: this.errorLog.slice(-10)
    };
  }
  
  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }
  
  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    // Try to determine error type from message
    const message = error.message.toLowerCase();
    let code = ErrorCode.UNKNOWN_ERROR;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let suggestions: string[] = [];
    
    if (message.includes('provider') && message.includes('not found')) {
      code = ErrorCode.PROVIDER_NOT_FOUND;
      suggestions = ['Check provider name spelling', 'Run "provider list" to see available providers'];
    } else if (message.includes('pricing') || message.includes('cost')) {
      code = ErrorCode.PRICING_CALCULATION_FAILED;
      severity = 'high';
    } else if (message.includes('network') || message.includes('timeout')) {
      code = ErrorCode.NETWORK_TIMEOUT;
      suggestions = ['Check internet connection', 'Retry the operation'];
    } else if (message.includes('config')) {
      code = ErrorCode.CONFIG_INVALID;
      suggestions = ['Check configuration file', 'Run "validate" command'];
    } else if (message.includes('ai') || message.includes('openai') || message.includes('anthropic')) {
      code = ErrorCode.AI_REQUEST_FAILED;
      severity = 'high';
      suggestions = ['Check API key', 'Verify AI provider status'];
    }
    
    return new AppError(code, error.message, {
      severity,
      suggestions,
      cause: error,
      details: {
        originalError: error.name,
        stack: error.stack
      }
    });
  }
  
  private logError(context: ErrorContext): void {
    this.errorLog.push(context);
    
    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
    
    // Log to console based on severity
    if (context.severity === 'critical' || context.severity === 'high') {
      console.error(`[${context.code}] ${context.message}`);
      if (context.details) {
        console.error('Details:', context.details);
      }
      if (context.suggestions?.length) {
        console.error('Suggestions:', context.suggestions.join(', '));
      }
    } else {
      console.warn(`[${context.code}] ${context.message}`);
    }
  }
  
  private handleCriticalError(error: AppError): void {
    console.error('🚨 CRITICAL ERROR:', error.message);
    
    if (!error.recoverable) {
      console.error('This error is not recoverable. Exiting...');
      process.exit(1);
    }
  }
  
  private handleHighError(error: AppError): void {
    console.error('⚠️  HIGH SEVERITY ERROR:', error.message);
    
    if (error.suggestions?.length) {
      console.log('\n💡 Suggestions:');
      error.suggestions.forEach(s => console.log(`  - ${s}`));
    }
  }
  
  private handleMediumError(error: AppError): void {
    console.warn('⚠️  Warning:', error.message);
  }
  
  private handleLowError(error: AppError): void {
    console.log('ℹ️  Info:', error.message);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export function handleError(error: Error | AppError): void {
  errorHandler.handle(error);
}

export function wrapAsync<T>(
  fn: () => Promise<T>,
  options?: {
    fallback?: T;
    retries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  return errorHandler.wrapAsync(fn, options);
}

export function wrap<T>(
  fn: () => T,
  options?: { fallback?: T }
): T {
  return errorHandler.wrap(fn, options);
}

// Error factory functions
export function providerNotFound(name: string): AppError {
  return new AppError(
    ErrorCode.PROVIDER_NOT_FOUND,
    `Provider '${name}' not found`,
    {
      severity: 'medium',
      recoverable: true,
      suggestions: [
        'Check provider name spelling',
        'Run "provider list" to see available providers',
        `Try one of: aws, vercel, netlify, cloudflare`
      ]
    }
  );
}

export function pricingDataNotFound(provider: string): AppError {
  return new AppError(
    ErrorCode.PRICING_DATA_NOT_FOUND,
    `No pricing data found for provider: ${provider}`,
    {
      severity: 'high',
      recoverable: true,
      suggestions: [
        `Run "collect provider ${provider}" to fetch pricing`,
        'Check data/providers directory',
        'Ensure provider is properly configured'
      ]
    }
  );
}

export function aiNotConfigured(): AppError {
  return new AppError(
    ErrorCode.AI_PROVIDER_NOT_CONFIGURED,
    'AI provider not configured',
    {
      severity: 'high',
      recoverable: true,
      suggestions: [
        'Set AI_API_KEY environment variable',
        'Configure AI model in asconfig.yaml',
        'Check AI provider documentation'
      ]
    }
  );
}

export function networkTimeout(url: string, timeout: number): AppError {
  return new AppError(
    ErrorCode.NETWORK_TIMEOUT,
    `Network request to ${url} timed out after ${timeout}ms`,
    {
      severity: 'medium',
      recoverable: true,
      suggestions: [
        'Check internet connection',
        'Try increasing timeout',
        'Verify the URL is accessible'
      ]
    }
  );
}