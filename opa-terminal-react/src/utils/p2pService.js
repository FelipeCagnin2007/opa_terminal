import Peer from 'peerjs';

class P2PService {
    constructor() {
        this.peer = null;
        this.connections = {};
        this.onMessageHandlers = [];
        this.onConnectionHandlers = [];
        this.isHost = false;
        this.myPeerId = null;
    }

    initialize(customId = null) {
        return new Promise((resolve, reject) => {
            if (this.peer) {
                resolve(this.myPeerId);
                return;
            }

            this.peer = new Peer(customId, {
                debug: 1 // Only errors
            });

            this.peer.on('open', (id) => {
                this.myPeerId = id;
                console.log('[P2P] My Peer ID:', id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('[P2P] Incoming connection from:', conn.peer);
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('[P2P] Peer Error:', err);
                reject(err);
            });
        });
    }

    handleConnection(conn) {
        conn.on('open', () => {
            this.connections[conn.peer] = conn;
            this.onConnectionHandlers.forEach(h => h(conn));
            
            conn.on('data', (data) => {
                console.log('[P2P] Received data from', conn.peer, ':', data);
                this.onMessageHandlers.forEach(h => h(data, conn.peer));
            });

            conn.on('close', () => {
                console.log('[P2P] Connection closed:', conn.peer);
                delete this.connections[conn.peer];
            });
        });
    }

    connect(targetPeerId) {
        console.log('[P2P] Connecting to:', targetPeerId);
        const conn = this.peer.connect(targetPeerId);
        this.handleConnection(conn);
        return conn;
    }

    broadcast(data) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    sendTo(peerId, data) {
        const conn = this.connections[peerId];
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    onMessage(handler) {
        this.onMessageHandlers.push(handler);
    }

    onConnection(handler) {
        this.onConnectionHandlers.push(handler);
    }

    destroy() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
            this.connections = {};
        }
    }
}

export const p2p = new P2PService();
