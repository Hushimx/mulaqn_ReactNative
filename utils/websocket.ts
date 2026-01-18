import { config } from './config';
import { api } from './api';
import { logger } from './logger';

/**
 * WebSocket Service for Real-time Multiplayer Updates
 * Uses Laravel Reverb (Pusher-compatible WebSocket)
 * 
 * Note: For React Native, we use native WebSocket API
 * Laravel Reverb uses Pusher protocol, so we connect directly to the WebSocket endpoint
 */

interface WebSocketCallbacks {
  onSessionUpdated?: (data: any) => void;
  onQuestionRevealed?: (data: any) => void;
  onParticipantReady?: (data: any) => void;
  onParticipantDisconnected?: (data: any) => void; // ✅ New callback for disconnection
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: number | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private channelName: string | null = null;
  private socketId: string | null = null;

  /**
   * Connect to WebSocket server (Laravel Reverb)
   * Reverb uses Pusher protocol: ws://host:port/app/app_key?protocol=7&client=js&version=8.0.0
   */
  async connect(sessionId: number, callbacks: WebSocketCallbacks = {}): Promise<void> {
    console.log('[WebSocket] connect() called with sessionId:', sessionId);
    logger.log('[WebSocket] connect() called with sessionId:', sessionId);
    
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      logger.log('[WebSocket] Already connected or connecting, readyState:', this.ws?.readyState);
      return;
    }

    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.isConnecting = true;
    this.channelName = `multiplayer.session.${sessionId}`;

    try {
      // Get Reverb config from API
      let reverbConfig: any = null;
      try {
        // Build API base URL without /api suffix
        const apiBase = config.API_BASE_URL.replace(/\/api\/?$/, '');
        const configResponse = await fetch(`${apiBase}/api/reverb/config`);
        const configData = await configResponse.json();
        if (configData.ok && configData.data) {
          reverbConfig = configData.data;
          logger.log('[WebSocket] Reverb config from API:', reverbConfig);
        }
      } catch (error) {
        logger.error('[WebSocket] Failed to fetch Reverb config:', error);
      }

      // Use config from API or fallback to local config
      const appKey = reverbConfig?.app_key || config.REVERB_APP_KEY;
      
      // Extract host from WEBSOCKET_URL or use from config
      let wsHost: string;
      if (reverbConfig?.host) {
        wsHost = reverbConfig.host;
      } else {
        // Parse from WEBSOCKET_URL (e.g., ws://172.20.10.4:8080)
        const wsUrlMatch = config.WEBSOCKET_URL.match(/^(?:ws|wss):\/\/([^:]+)/);
        wsHost = wsUrlMatch ? wsUrlMatch[1] : '172.20.10.4'; // IP الماك الحالي
      }
      
      const wsPort = reverbConfig?.port || config.WEBSOCKET_PORT;
      const wsScheme = reverbConfig?.scheme === 'https' ? 'wss' : 'ws';

      // Laravel Reverb uses Pusher protocol
      // Format: ws://host:port/app/app_key?protocol=7&client=js&version=8.0.0
      const wsUrl = `${wsScheme}://${wsHost}:${wsPort}/app/${appKey}?protocol=7&client=js&version=8.0.0`;
      
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      logger.log(`[WebSocket] Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.log('[WebSocket] Connected, waiting for socket_id');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        // Don't subscribe yet - wait for pusher:connection_established to get socket_id
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.log('[WebSocket] Received message:', data.event, data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('[WebSocket] Error:', error);
        this.isConnecting = false;
        this.callbacks.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        logger.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.callbacks.onDisconnected?.();
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            if (this.sessionId) {
              this.connect(this.sessionId, this.callbacks);
            }
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      logger.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages (Pusher protocol)
   */
  private async handleMessage(data: any): Promise<void> {
    // Handle Pusher protocol events
    if (data.event === 'pusher:connection_established') {
      logger.log('[WebSocket] Connection established');
      // Parse socket_id from JSON string in data field
      let socketIdData = null;
      try {
        socketIdData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      } catch (e) {
        socketIdData = data.data;
      }
      this.socketId = socketIdData?.socket_id || socketIdData?.socketId || null;
      logger.log('[WebSocket] Socket ID extracted:', this.socketId);
      
      // Now we can authenticate and subscribe to channel
      if (this.channelName && this.socketId) {
        logger.log('[WebSocket] Starting authentication for channel:', this.channelName);
        await this.authenticateAndSubscribe();
      } else {
        logger.error('[WebSocket] Missing channelName or socketId:', {
          channelName: this.channelName,
          socketId: this.socketId,
        });
      }
      
      this.callbacks.onConnected?.();
      return;
    }

    // Reverb uses pusher_internal:subscription_succeeded for private channels
    if (data.event === 'pusher:subscription_succeeded' || data.event === 'pusher_internal:subscription_succeeded') {
      logger.log('[WebSocket] ✅ Subscription succeeded for channel:', this.channelName);
      return;
    }

    // ✅ Handle ping/pong keepalive (Pusher protocol)
    // Reverb sends pusher:ping to check if connection is alive
    // We must respond with pusher:pong to prevent timeout
    if (data.event === 'pusher:ping') {
      logger.log('[WebSocket] 📡 Received ping, sending pong');
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pongMessage = JSON.stringify({ event: 'pusher:pong', data: {} });
        this.ws.send(pongMessage);
        logger.log('[WebSocket] ✅ Pong sent');
      } else {
        logger.warn('[WebSocket] ⚠️ Cannot send pong - WebSocket not open, readyState:', this.ws?.readyState);
      }
      return;
    }

    if (data.event === 'pusher:error') {
      // Parse error data (can be string or object)
      let errorData: any;
      if (typeof data.data === 'string') {
        try {
          errorData = JSON.parse(data.data);
        } catch (e) {
          errorData = { message: data.data };
        }
      } else {
        errorData = data.data || {};
      }

      logger.error('[WebSocket] Pusher error:', errorData);

      // ✅ Handle specific error codes
      // 4201 = Pong reply not received in time (can happen if ping/pong handling is delayed)
      // If WebSocket is still connected, don't treat it as fatal error
      if (errorData.code === 4201) {
        logger.warn('[WebSocket] ⚠️ Pong timeout error (4201) - but connection may still be active');
        // Check if WebSocket is still open
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          logger.log('[WebSocket] ✅ WebSocket still open - ignoring pong timeout error');
          // Don't call onError callback - connection is still active
          return;
        }
      }

      // For other errors or if connection is closed, call error callback
      this.callbacks.onError?.(new Error(errorData.message || 'Pusher error'));
      return;
    }

    // Handle custom events (broadcasted from Laravel)
    // Laravel broadcasts with namespace prefix: App\Events\MultiplayerSessionUpdated becomes .session.updated
    // But Reverb may also send without the dot prefix
    const eventName = data.event;
    
    // Log all non-Pusher events for debugging
    if (!eventName.startsWith('pusher:') && !eventName.startsWith('pusher_internal:')) {
      logger.log('[WebSocket] 📨 Custom event received:', eventName, data);
    }
    
    if (eventName === 'session.updated' || eventName === '.session.updated' || eventName === 'App\\Events\\MultiplayerSessionUpdated') {
      logger.log('[WebSocket] ✅ Session updated event received:', data);
      // ✅ CRITICAL: data.data is a JSON string, not an object
      let eventData: any;
      if (typeof data.data === 'string') {
        try {
          const parsed = JSON.parse(data.data);
          // If parsed has a 'data' field, use it (nested structure from broadcastWith)
          eventData = parsed.data || parsed;
          logger.log('[WebSocket] Parsed session.updated data:', eventData);
        } catch (error) {
          logger.error('[WebSocket] Error parsing session.updated data:', error);
          eventData = data.data || data;
        }
      } else {
        // If data.data is already an object, use it directly
        eventData = data.data?.data || data.data || data;
      }
      this.callbacks.onSessionUpdated?.(eventData);
    } else if (eventName === 'question.revealed' || eventName === '.question.revealed' || eventName === 'App\\Events\\MultiplayerQuestionRevealed') {
      logger.log('[WebSocket] ✅ Question revealed event received:', data);
      // ✅ CRITICAL: data.data is a JSON string, not an object
      let eventData: any;
      if (typeof data.data === 'string') {
        try {
          eventData = JSON.parse(data.data);
          logger.log('[WebSocket] Parsed question.revealed data:', eventData);
        } catch (error) {
          logger.error('[WebSocket] Error parsing question.revealed data:', error);
          eventData = data.data || data;
        }
      } else {
        // If data.data is already an object, use it directly
        eventData = data.data?.data || data.data || data;
      }
      this.callbacks.onQuestionRevealed?.(eventData);
    } else if (eventName === 'participant.ready' || eventName === '.participant.ready' || eventName === 'App\\Events\\MultiplayerParticipantReady') {
      logger.log('[WebSocket] ✅ Participant ready event received:', data);
      // ✅ CRITICAL: data.data is a JSON string, not an object
      let eventData: any;
      if (typeof data.data === 'string') {
        try {
          eventData = JSON.parse(data.data);
          logger.log('[WebSocket] Parsed participant.ready data:', eventData);
        } catch (error) {
          logger.error('[WebSocket] Error parsing participant.ready data:', error);
          eventData = data.data || data;
        }
      } else {
        // If data.data is already an object, use it directly
        eventData = data.data?.data || data.data || data;
      }
      this.callbacks.onParticipantReady?.(eventData);
    } else if (eventName === 'participant.disconnected' || eventName === '.participant.disconnected' || eventName === 'App\\Events\\MultiplayerParticipantDisconnected') {
      logger.log('[WebSocket] ⚠️ Participant disconnected event received:', data);
      let eventData: any;
      if (typeof data.data === 'string') {
        try {
          eventData = JSON.parse(data.data);
          logger.log('[WebSocket] Parsed participant.disconnected data:', eventData);
        } catch (error) {
          logger.error('[WebSocket] Error parsing participant.disconnected data:', error);
          eventData = data.data || data;
        }
      } else {
        eventData = data.data?.data || data.data || data;
      }
      this.callbacks.onParticipantDisconnected?.(eventData);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.channelName = null;
    this.socketId = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
  }

  /**
   * Authenticate channel and subscribe
   */
  private async authenticateAndSubscribe(): Promise<void> {
    if (!this.channelName || !this.socketId || !this.ws) {
      logger.error('[WebSocket] Cannot authenticate - missing data:', {
        channelName: this.channelName,
        socketId: this.socketId,
        ws: !!this.ws,
      });
      return;
    }

    try {
      logger.log('[WebSocket] Starting authentication...', {
        channelName: this.channelName,
        socketId: this.socketId,
      });

      const token = await api.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // Request channel authorization
      const apiBase = config.API_BASE_URL.replace(/\/api\/?$/, '');
      const authUrl = `${apiBase}/api/broadcasting/auth`;
      logger.log('[WebSocket] Requesting auth from:', authUrl);
      
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          socket_id: this.socketId,
          channel_name: this.channelName,
        }),
      });

      logger.log('[WebSocket] Auth response status:', authResponse.status);

      if (authResponse.ok) {
        const authData = await authResponse.json();
        logger.log('[WebSocket] Channel authorized response:', authData);
        
        // Laravel Broadcast::auth() returns the auth string directly or in 'auth' field
        // For private channels, it returns: {"auth":"app_key:socket_id:channel_data"}
        const authString = typeof authData === 'string' ? authData : (authData.auth || JSON.stringify(authData));
        
        // Subscribe to channel after authorization
        // Pusher protocol: {"event":"pusher:subscribe","data":{"channel":"channel_name","auth":"auth_string"}}
        const subscribeMessage = JSON.stringify({
          event: 'pusher:subscribe',
          data: {
            channel: this.channelName,
            auth: authString,
          },
        });
        logger.log('[WebSocket] Sending subscribe message for channel:', this.channelName, subscribeMessage);
        
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(subscribeMessage);
          logger.log('[WebSocket] Subscribe message sent');
        } else {
          logger.error('[WebSocket] WebSocket not open, readyState:', this.ws.readyState);
        }
      } else {
        const errorText = await authResponse.text();
        logger.error('[WebSocket] Channel authorization failed:', authResponse.status, errorText);
        this.callbacks.onError?.(new Error(`Channel authorization failed: ${authResponse.status}`));
      }
    } catch (error) {
      logger.error('[WebSocket] Error authenticating channel:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Authentication error'));
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocket = new WebSocketService();

