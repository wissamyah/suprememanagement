// Centralized Error Handling Utility
import { ERROR_MESSAGES } from '../config/app.config';

export const ErrorType = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  SYNC: 'SYNC',
  VALIDATION: 'VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
}

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static maxErrors = 50;
  
  static handleError(error: any, context: string = 'Unknown'): AppError {
    const appError = this.parseError(error, context);
    this.logError(appError);
    this.storeError(appError);
    return appError;
  }
  
  private static parseError(error: any, context: string): AppError {
    const timestamp = new Date();
    
    // GitHub API specific errors
    if (error?.response?.status) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
          return {
            type: ErrorType.AUTH,
            message: `Authentication failed in ${context}`,
            details: error,
            timestamp,
            retryable: false,
            userMessage: ERROR_MESSAGES.invalidToken,
          };
          
        case 403:
          if (error.response.headers?.['x-ratelimit-remaining'] === '0') {
            return {
              type: ErrorType.RATE_LIMIT,
              message: `Rate limit exceeded in ${context}`,
              details: error,
              timestamp,
              retryable: true,
              userMessage: ERROR_MESSAGES.rateLimitExceeded,
            };
          }
          return {
            type: ErrorType.AUTH,
            message: `Permission denied in ${context}`,
            details: error,
            timestamp,
            retryable: false,
            userMessage: ERROR_MESSAGES.authRequired,
          };
          
        case 409:
          return {
            type: ErrorType.CONFLICT,
            message: `Conflict detected in ${context}`,
            details: error,
            timestamp,
            retryable: true,
            userMessage: ERROR_MESSAGES.conflictError,
          };
          
        case 404:
          return {
            type: ErrorType.SYNC,
            message: `Resource not found in ${context}`,
            details: error,
            timestamp,
            retryable: false,
            userMessage: 'The requested resource was not found.',
          };
          
        default:
          if (status >= 500) {
            return {
              type: ErrorType.NETWORK,
              message: `Server error in ${context}`,
              details: error,
              timestamp,
              retryable: true,
              userMessage: 'Server error. Will retry automatically.',
            };
          }
      }
    }
    
    // Network errors
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || !navigator.onLine) {
      return {
        type: ErrorType.NETWORK,
        message: `Network error in ${context}`,
        details: error,
        timestamp,
        retryable: true,
        userMessage: ERROR_MESSAGES.networkError,
      };
    }
    
    // Validation errors
    if (error?.name === 'ValidationError' || error?.type === 'validation') {
      return {
        type: ErrorType.VALIDATION,
        message: error.message || `Validation failed in ${context}`,
        details: error,
        timestamp,
        retryable: false,
        userMessage: error.message || 'Invalid data provided.',
      };
    }
    
    // Sync errors
    if (context.toLowerCase().includes('sync') || error?.message?.toLowerCase().includes('sync')) {
      return {
        type: ErrorType.SYNC,
        message: error.message || `Sync failed in ${context}`,
        details: error,
        timestamp,
        retryable: true,
        userMessage: ERROR_MESSAGES.syncFailed,
      };
    }
    
    // Default error
    return {
      type: ErrorType.UNKNOWN,
      message: error?.message || `Unknown error in ${context}`,
      details: error,
      timestamp,
      retryable: false,
      userMessage: error?.message || 'An unexpected error occurred.',
    };
  }
  
  private static logError(error: AppError): void {
    const logLevel = error.type === ErrorType.UNKNOWN ? 'error' : 'warn';
    console[logLevel](`[${error.type}] ${error.message}`, {
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      details: error.details,
    });
  }
  
  private static storeError(error: AppError): void {
    this.errors.unshift(error);
    
    // Keep only the last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    // Store in localStorage for debugging
    try {
      localStorage.setItem('app_errors', JSON.stringify(this.errors.slice(0, 10)));
    } catch {
      // Ignore localStorage errors
    }
  }
  
  static getRecentErrors(count: number = 10): AppError[] {
    return this.errors.slice(0, count);
  }
  
  static clearErrors(): void {
    this.errors = [];
    try {
      localStorage.removeItem('app_errors');
    } catch {
      // Ignore localStorage errors
    }
  }
  
  static getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(e => e.type === type);
  }
  
  static hasRecentError(type: ErrorType, withinMs: number = 60000): boolean {
    const now = new Date();
    return this.errors.some(e => 
      e.type === type && 
      (now.getTime() - e.timestamp.getTime()) < withinMs
    );
  }
}

// Network status monitoring
export class NetworkMonitor {
  private static listeners: ((online: boolean) => void)[] = [];
  private static isOnline = navigator.onLine;
  
  static init(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  static destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
  
  private static handleOnline = (): void => {
    this.isOnline = true;
    this.notifyListeners(true);
    console.log('Network connection restored');
  };
  
  private static handleOffline = (): void => {
    this.isOnline = false;
    this.notifyListeners(false);
    console.warn('Network connection lost');
  };
  
  static addListener(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private static notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => listener(online));
  }
  
  static getStatus(): boolean {
    return this.isOnline;
  }
  
  static async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Initialize network monitoring
NetworkMonitor.init();