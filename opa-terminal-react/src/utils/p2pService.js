import Peer from 'peerjs';

// Free public TURN servers via openrelay.metered.ca
// These work without API keys and handle symmetric NAT (required for most home/mobile networks)
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

class P2PService {
    constructor() {
        this.peer = null;
        this.connections = {};
        this.myPeerId = null;

        // Handler lists
        this._onMessageHandlers = [];
        this._onConnectionOpenHandlers = [];
        this._onConnectionCloseHandlers = [];
    }

    /**
     * Initialize the local Peer with the given custom ID.
     * If already initialized with the same ID, resolves immediately.
     * If initialized with a different ID, destroys and re-creates.
     */
    initialize(customId = null) {
        return new Promise((resolve, reject) => {
            // Already initialized with the same peer id — reuse
            if (this.peer && !this.peer.destroyed && this.myPeerId === customId) {
                console.log('[P2P] Reusing existing peer:', this.myPeerId);
                resolve(this.myPeerId);
                return;
            }

            // Clean up stale peer before creating a new one
            if (this.peer) {
                this._destroyPeer();
            }

            console.log('[P2P] Creating Peer with ID:', customId);
            this.peer = new Peer(customId, {
                debug: 2,
                config: { iceServers: ICE_SERVERS },
            });

            const timeout = setTimeout(() => {
                reject(new Error('[P2P] Timeout: Peer did not open within 15s'));
            }, 15000);

            this.peer.on('open', (id) => {
                clearTimeout(timeout);
                this.myPeerId = id;
                console.log('[P2P] Peer opened. My ID:', id);
                resolve(id);
            });

            // Listen for INCOMING connections (host-side)
            this.peer.on('connection', (conn) => {
                console.log('[P2P] Incoming connection from:', conn.peer);
                this._setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                clearTimeout(timeout);
                console.error('[P2P] Peer Error:', err.type, err.message);
                reject(err);
            });

            this.peer.on('disconnected', () => {
                console.warn('[P2P] Peer disconnected from signaling server. Reconnecting...');
                // PeerJS auto-reconnects on disconnect; we just log it.
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });
        });
    }

    /**
     * Connect TO a remote peer (guest-side).
     * Returns a promise that resolves when the data channel opens.
     */
    connect(targetPeerId) {
        return new Promise((resolve, reject) => {
            if (!this.peer || this.peer.destroyed) {
                reject(new Error('[P2P] Peer not initialized'));
                return;
            }

            // If we already have an open connection, reuse it
            if (this.connections[targetPeerId]?.open) {
                console.log('[P2P] Reusing open connection to:', targetPeerId);
                resolve(this.connections[targetPeerId]);
                return;
            }

            console.log('[P2P] Connecting to:', targetPeerId);
            const conn = this.peer.connect(targetPeerId, { reliable: true });
            this._setupConnection(conn, resolve, reject);
        });
    }

    /**
     * Internal: sets up event listeners on a DataConnection.
     * @param {import('peerjs').DataConnection} conn
     * @param {Function} [resolveOnOpen] - optional promise resolver
     * @param {Function} [rejectOnError] - optional promise rejector
     */
    _setupConnection(conn, resolveOnOpen, rejectOnError) {
        const openTimeout = setTimeout(() => {
            if (rejectOnError) rejectOnError(new Error(`[P2P] Connection to ${conn.peer} timed out`));
        }, 20000);

        conn.on('open', () => {
            clearTimeout(openTimeout);
            console.log('[P2P] Connection OPEN with:', conn.peer);
            this.connections[conn.peer] = conn;

            // Notify all onConnectionOpen handlers (used by host to send initial state)
            this._onConnectionOpenHandlers.forEach((h) => h(conn.peer));

            if (resolveOnOpen) resolveOnOpen(conn);
        });

        conn.on('data', (data) => {
            this._onMessageHandlers.forEach((h) => h(data, conn.peer));
        });

        conn.on('close', () => {
            console.warn('[P2P] Connection CLOSED with:', conn.peer);
            delete this.connections[conn.peer];
            this._onConnectionCloseHandlers.forEach((h) => h(conn.peer));
        });

        conn.on('error', (err) => {
            clearTimeout(openTimeout);
            console.error('[P2P] Connection error with', conn.peer, ':', err);
            if (rejectOnError) rejectOnError(err);
        });
    }


    // ─── Send helpers ───────────────────────────────────────────────────────────

    /** Send data to all open connections */
    broadcast(data) {
        Object.values(this.connections).forEach((conn) => {
            if (conn.open) conn.send(data);
        });
    }

    /** Send data to a specific peer */
    sendTo(peerId, data) {
        const conn = this.connections[peerId];
        if (conn?.open) {
            conn.send(data);
        } else {
            console.warn('[P2P] sendTo: no open connection to', peerId);
        }
    }

    // ─── Event subscriptions ────────────────────────────────────────────────────

    /** Called whenever ANY message is received from ANY peer */
    onMessage(handler) {
        this._onMessageHandlers.push(handler);
        return () => {
            this._onMessageHandlers = this._onMessageHandlers.filter((h) => h !== handler);
        };
    }

    /**
     * Called when a new connection's data channel fully OPENS.
     * Host uses this to immediately send the initial game state to the new peer.
     */
    onConnectionOpen(handler) {
        this._onConnectionOpenHandlers.push(handler);
        return () => {
            this._onConnectionOpenHandlers = this._onConnectionOpenHandlers.filter((h) => h !== handler);
        };
    }

    onConnectionClose(handler) {
        this._onConnectionCloseHandlers.push(handler);
        return () => {
            this._onConnectionCloseHandlers = this._onConnectionCloseHandlers.filter((h) => h !== handler);
        };
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────────

    _destroyPeer() {
        try {
            this.peer?.destroy();
        } catch (_) { /* ignore */ }
        this.peer = null;
        this.connections = {};
        this.myPeerId = null;
    }

    /** Fully clears all state and handlers — call on component unmount */
    destroy() {
        this._destroyPeer();
        this._onMessageHandlers = [];
        this._onConnectionOpenHandlers = [];
        this._onConnectionCloseHandlers = [];
        console.log('[P2P] Destroyed.');
    }
}

// Singleton instance — destroyed/recreated via initialize()
export const p2p = new P2PService();
