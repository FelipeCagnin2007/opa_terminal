/**
 * pokemonP2P — PeerJS wrapper for Pokémon battles in OPA Terminal.
 * Reuses the peerjs library already present in the project.
 *
 * Protocol messages:
 *   BATTLE_CHALLENGE  — host sends team to guest after connection
 *   BATTLE_ACCEPT     — guest sends their team back
 *   BATTLE_READY      — host signals both sides: { hostTeam, guestTeam, firstTurn }
 *   ACTION_SELECTED   — a player sends their chosen move: { moveIndex, pokemonIndex }
 *   STATE_UPDATE      — host broadcasts new battle state after resolving a turn
 *   BATTLE_END        — host signals winner: { winner: 'host'|'guest' }
 *   SURRENDER         — a player surrenders
 */

import { Peer } from 'peerjs';

const PEERJS_CONFIG = {
  // Uses the free public PeerJS cloud server
  debug: 0,
};

let _peer = null;
let _conn = null;
let _messageHandlers = {};

/**
 * Generate a user-friendly 6-char battle code from a full peer ID
 */
export function getPeerShortCode(peerId) {
  return peerId?.slice(-6).toUpperCase() || '';
}

/**
 * Create (or return existing) Peer instance.
 * @param {string} [desiredId] — Optional specific ID to use
 * @returns {Promise<{ peer: Peer, peerId: string }>}
 */
export function createPeer(desiredId) {
  return new Promise((resolve, reject) => {
    // Clean up previous peer if exists
    if (_peer && !_peer.destroyed) {
      _peer.destroy();
    }
    _peer = null;
    _conn = null;

    const peer = desiredId
      ? new Peer(`opa-poke-${desiredId}`, PEERJS_CONFIG)
      : new Peer(PEERJS_CONFIG);

    peer.on('open', (id) => {
      _peer = peer;
      resolve({ peer, peerId: id });
    });

    peer.on('error', (err) => {
      console.error('[PokémonP2P] Peer error:', err.type, err.message);
      reject(err);
    });
  });
}

/**
 * Host: wait for an incoming connection.
 * @param {Peer} peer
 * @param {object} handlers — { onConnect, onMessage, onDisconnect }
 * @returns {function} cleanup
 */
export function hostListen(peer, handlers) {
  const { onConnect, onMessage, onDisconnect } = handlers;
  _messageHandlers = handlers;

  peer.on('connection', (conn) => {
    _conn = conn;

    conn.on('open', () => {
      if (onConnect) onConnect(conn.peer);
    });

    conn.on('data', (data) => {
      if (onMessage) onMessage(data, conn);
    });

    conn.on('close', () => {
      if (onDisconnect) onDisconnect();
      _conn = null;
    });

    conn.on('error', (err) => {
      console.error('[PokémonP2P] Connection error:', err);
    });
  });

  return () => {
    if (_conn) _conn.close();
    if (peer && !peer.destroyed) peer.destroy();
  };
}

/**
 * Guest: connect to a host by their peer ID (full or short code).
 * @param {Peer} peer
 * @param {string} hostPeerId — full peer ID from the host
 * @param {object} handlers
 * @returns {Promise<void>}
 */
export function guestConnect(peer, hostPeerId, handlers) {
  const { onConnect, onMessage, onDisconnect } = handlers;
  _messageHandlers = handlers;

  return new Promise((resolve, reject) => {
    const conn = peer.connect(hostPeerId, { reliable: true });
    _conn = conn;

    conn.on('open', () => {
      if (onConnect) onConnect(conn.peer);
      resolve();
    });

    conn.on('data', (data) => {
      if (onMessage) onMessage(data, conn);
    });

    conn.on('close', () => {
      if (onDisconnect) onDisconnect();
      _conn = null;
    });

    conn.on('error', (err) => {
      console.error('[PokémonP2P] Connection error:', err);
      reject(err);
    });

    // Timeout after 15s
    setTimeout(() => {
      if (!conn.open) reject(new Error('Connection timeout'));
    }, 15000);
  });
}

/**
 * Send a message to the connected peer.
 * @param {string} type — message type constant
 * @param {any} payload
 */
export function sendMessage(type, payload = {}) {
  if (!_conn || !_conn.open) {
    console.warn('[PokémonP2P] No open connection to send to');
    return false;
  }
  _conn.send({ type, payload, ts: Date.now() });
  return true;
}

/**
 * Destroy the current peer and connection cleanly.
 */
export function destroyPeer() {
  if (_conn) {
    try { _conn.close(); } catch { /* ignore */ }
    _conn = null;
  }
  if (_peer && !_peer.destroyed) {
    try { _peer.destroy(); } catch { /* ignore */ }
    _peer = null;
  }
}

// Message type constants
export const MSG = {
  BATTLE_CHALLENGE: 'BATTLE_CHALLENGE',
  BATTLE_ACCEPT: 'BATTLE_ACCEPT',
  BATTLE_READY: 'BATTLE_READY',
  ACTION_SELECTED: 'ACTION_SELECTED',
  STATE_UPDATE: 'STATE_UPDATE',
  BATTLE_END: 'BATTLE_END',
  SURRENDER: 'SURRENDER',
};
