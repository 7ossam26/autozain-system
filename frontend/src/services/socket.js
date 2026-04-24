// Socket.io client — scaffold. Wired into AuthContext in Phase 4.

import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
