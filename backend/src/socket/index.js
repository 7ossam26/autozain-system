// Socket.io setup — scaffold. Event handlers land in Phase 4.

import { Server } from 'socket.io';
import { env } from '../config/env.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Phase 1: authenticate via JWT cookie.
    // Phase 4: register event handlers (employee status, contact requests, etc.).
    socket.on('disconnect', () => {});
  });

  return io;
}
