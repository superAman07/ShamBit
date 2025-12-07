/**
 * Network Monitor Utility
 * Monitors network connectivity and provides status information
 */

type NetworkStatusCallback = (isOnline: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusCallback> = new Set();
  private isMonitoring = false;

  /**
   * Check if browser is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Start monitoring network status
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.isMonitoring = true;
  }

  /**
   * Stop monitoring network status
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.isMonitoring = false;
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    
    // Start monitoring when first listener is added
    if (this.listeners.size === 1) {
      this.startMonitoring();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      
      // Stop monitoring when last listener is removed
      if (this.listeners.size === 0) {
        this.stopMonitoring();
      }
    };
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('🌐 Network connection restored');
    this.notifyListeners(true);
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.warn('📡 Network connection lost');
    this.notifyListeners(false);
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Estimate connection speed (rough estimate)
   */
  async estimateSpeed(): Promise<'slow' | 'medium' | 'fast'> {
    if (!navigator.onLine) {
      return 'slow';
    }

    // Use Network Information API if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      } else if (effectiveType === '3g') {
        return 'medium';
      } else {
        return 'fast';
      }
    }

    // Fallback: simple ping test
    try {
      const startTime = Date.now();
      await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
      const duration = Date.now() - startTime;

      if (duration > 1000) return 'slow';
      if (duration > 300) return 'medium';
      return 'fast';
    } catch {
      return 'slow';
    }
  }

  /**
   * Get recommended timeout based on connection speed
   */
  async getRecommendedTimeout(): Promise<number> {
    const speed = await this.estimateSpeed();
    
    switch (speed) {
      case 'slow':
        return 180000; // 3 minutes
      case 'medium':
        return 120000; // 2 minutes
      case 'fast':
        return 60000; // 1 minute
      default:
        return 120000;
    }
  }
}

export const networkMonitor = new NetworkMonitor();
