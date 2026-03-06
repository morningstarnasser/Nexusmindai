import type { Server as HTTPServer } from 'http';
import type { WebSocket } from 'ws';

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'command';
  channel: string;
  payload?: any;
  id?: string;
}

interface ClientConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  authenticated: boolean;
}

export class WebSocketAPI {
  private wsServer: any = null;
  private clients: Map<string, ClientConnection> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  async initialize(httpServer: HTTPServer): Promise<void> {
    try {
      // Try to import WebSocketServer, with fallback message
      const WebSocketModule = await import('ws');
      const { WebSocketServer } = WebSocketModule;

      if (!WebSocketServer) {
        console.warn(
          'WebSocket not available. Install ws package: npm install ws @types/ws'
        );
        return;
      }

      this.wsServer = new WebSocketServer({ server: httpServer });

      this.wsServer.on('connection', (socket: WebSocket) => {
        this.handleConnection(socket);
      });

      console.log('WebSocket API initialized');
    } catch (error) {
      console.warn(
        'WebSocket initialization skipped. Install ws package: npm install ws @types/ws'
      );
    }
  }

  private handleConnection(socket: WebSocket): void {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client: ClientConnection = {
      id: clientId,
      socket,
      subscriptions: new Set(),
      authenticated: false,
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      timestamp: new Date().toISOString(),
    });

    socket.on('message', (data: string) => {
      this.handleMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleDisconnect(clientId);
    });

    socket.on('error', (error: Error) => {
      console.error(`[WebSocket] Client ${clientId} error:`, error.message);
    });
  }

  private handleMessage(clientId: string, data: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.channel);
          break;
        case 'message':
          this.handleClientMessage(clientId, message);
          break;
        case 'command':
          this.handleCommand(clientId, message);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  private handleSubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);
    console.log(`[WebSocket] Client ${clientId} subscribed to ${channel}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  private handleUnsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    console.log(`[WebSocket] Client ${clientId} unsubscribed from ${channel}`);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Broadcast to subscribed clients
    this.broadcast(message.channel, {
      type: 'message',
      from: clientId,
      data: message.payload,
      timestamp: new Date().toISOString(),
    });

    // Call registered handlers
    const handlers = this.eventHandlers.get(message.channel) || [];
    handlers.forEach((handler) => {
      handler(message.payload, clientId);
    });
  }

  private handleCommand(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Handle authentication
    if (message.payload?.auth) {
      client.authenticated = true;
      this.sendToClient(clientId, {
        type: 'authenticated',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Emit command event
    this.emit('command', {
      clientId,
      command: message.payload,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      this.clients.delete(clientId);

      // Emit disconnect event
      this.emit('disconnect', { clientId });
    }
  }

  sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === 1) {
      // WebSocket.OPEN = 1
      client.socket.send(JSON.stringify(data));
    }
  }

  broadcast(channel: string, data: any): void {
    this.clients.forEach((client) => {
      if (client.subscriptions.has(channel) && client.socket.readyState === 1) {
        client.socket.send(JSON.stringify(data));
      }
    });
  }

  broadcastToAll(data: any): void {
    this.clients.forEach((client) => {
      if (client.socket.readyState === 1) {
        client.socket.send(JSON.stringify(data));
      }
    });
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach((handler) => {
      handler(data);
    });
  }

  broadcastAgentStatus(agentId: string, status: string): void {
    this.broadcast(`agent:${agentId}`, {
      type: 'agent_status',
      agentId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastConversationUpdate(conversationId: string, update: any): void {
    this.broadcast(`conversation:${conversationId}`, {
      type: 'conversation_update',
      conversationId,
      update,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastStreamEvent(agentId: string, event: any): void {
    this.broadcast(`stream:${agentId}`, {
      type: 'stream_event',
      agentId,
      event,
      timestamp: new Date().toISOString(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscribers(channel: string): string[] {
    const subscribers: string[] = [];
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        subscribers.push(clientId);
      }
    });
    return subscribers;
  }

  async stop(): Promise<void> {
    if (this.wsServer) {
      this.clients.forEach((client) => {
        client.socket.close();
      });
      this.clients.clear();
      console.log('WebSocket API stopped');
    }
  }
}

export default WebSocketAPI;
