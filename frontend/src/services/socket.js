// Socket.io client. Singleton connection — dashboard users authenticate via
// the HTTP-only access_token cookie (same-origin). Public visitors connect
// anonymously and only receive broadcasts.

import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
