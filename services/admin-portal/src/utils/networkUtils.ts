/**
 * Network utilities for IP detection and API URL management
 */

/**
 * Get the local IP address of the machine
 * This uses WebRTC to detect the actual local IP address
 */
export const getLocalIPAddress = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      // Create a dummy peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Create a dummy data channel
      pc.createDataChannel('');

      // Create offer and set local description
      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      // Listen for ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          
          if (ipMatch && ipMatch[1]) {
            const ip = ipMatch[1];
            // Filter out localhost and invalid IPs
            if (ip !== '127.0.0.1' && !ip.startsWith('169.254')) {
              pc.close();
              resolve(ip);
              return;
            }
          }
        }
      };

      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);

    } catch (error) {
      console.warn('Could not detect local IP address:', error);
      resolve(null);
    }
  });
};

/**
 * Get common local network IP ranges for the environment selector
 */
export const getCommonLocalIPs = (): string[] => {
  const currentHost = window.location.hostname;
  
  // If we're already on an IP, suggest similar IPs
  if (/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
    const parts = currentHost.split('.');
    const baseIP = `${parts[0]}.${parts[1]}.${parts[2]}`;
    return [
      `${baseIP}.1`,
      `${baseIP}.100`,
      `${baseIP}.101`,
      `${baseIP}.200`
    ];
  }
  
  // Common local network ranges
  return [
    '192.168.1.1',
    '192.168.1.100',
    '192.168.0.1',
    '192.168.0.100',
    '10.0.0.1',
    '10.0.0.100'
  ];
};

/**
 * Test if a URL is reachable
 */
export const testUrlReachability = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is fine, means server is responding
  } catch (error) {
    return false;
  }
};

/**
 * Get the best API URL based on current environment
 */
export const getBestApiUrl = async (): Promise<string> => {
  const currentHost = window.location.hostname;
  
  // Try current host first
  const currentHostUrl = `http://${currentHost}:3000/api/v1`;
  if (await testUrlReachability(currentHostUrl)) {
    return currentHostUrl;
  }
  
  // Try localhost
  const localhostUrl = 'http://localhost:3000/api/v1';
  if (await testUrlReachability(localhostUrl)) {
    return localhostUrl;
  }
  
  // Try to detect local IP
  const localIP = await getLocalIPAddress();
  if (localIP) {
    const localIPUrl = `http://${localIP}:3000/api/v1`;
    if (await testUrlReachability(localIPUrl)) {
      return localIPUrl;
    }
  }
  
  // Fallback to localhost
  return localhostUrl;
};