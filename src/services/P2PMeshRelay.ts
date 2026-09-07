export interface MeshMessage<T = any> {
  id: string;
  topic: string;
  data: T;
  sourceNodeId: string;
  timestamp: number;
}

export class P2PMeshRelay {
  private static instance: P2PMeshRelay;
  private channel: BroadcastChannel | null = null;
  private nodeId: string;
  private listeners = new Map<string, Set<(data: any, msg: MeshMessage) => void>>();
  private stats = {
    connectedPeers: 1,
    messagesSent: 0,
    messagesReceived: 0,
    lastActive: Date.now(),
  };

  public static getInstance(): P2PMeshRelay {
    if (!P2PMeshRelay.instance) {
      P2PMeshRelay.instance = new P2PMeshRelay();
    }
    return P2PMeshRelay.instance;
  }

  constructor() {
    this.nodeId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.initChannel();
  }

  private initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('zero_downtime_p2p_mesh');
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };

        // Send discovery announcement
        this.broadcast('peer_discovery', { action: 'HELLO', nodeId: this.nodeId });
      } catch (e) {
        console.warn('[P2PMeshRelay] BroadcastChannel not supported in this context:', e);
      }
    }
  }

  private handleIncoming(msg: MeshMessage) {
    if (!msg || msg.sourceNodeId === this.nodeId) return;

    this.stats.messagesReceived++;
    this.stats.lastActive = Date.now();

    if (msg.topic === 'peer_discovery') {
      this.stats.connectedPeers = Math.max(2, this.stats.connectedPeers + 1);
      return;
    }

    const callbacks = this.listeners.get(msg.topic);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(msg.data, msg);
        } catch (err) {
          console.error('[P2PMeshRelay] Callback error:', err);
        }
      });
    }
  }

  public broadcast<T>(topic: string, data: T): void {
    this.stats.messagesSent++;
    this.stats.lastActive = Date.now();

    const message: MeshMessage<T> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      topic,
      data,
      sourceNodeId: this.nodeId,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('[P2PMeshRelay] Broadcast failed:', e);
      }
    }

    // Local storage trigger for cross-tab fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`p2p_mesh_last_${topic}`, JSON.stringify(message));
      } catch (e) {
        // quota ignore
      }
    }
  }

  public subscribe<T = any>(topic: string, callback: (data: T, msg: MeshMessage<T>) => void): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    return () => {
      this.listeners.get(topic)?.delete(callback);
    };
  }

  public getStats() {
    return {
      nodeId: this.nodeId,
      ...this.stats,
    };
  }
}

export const p2pMeshRelay = P2PMeshRelay.getInstance();
