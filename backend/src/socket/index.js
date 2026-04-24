// Socket.io server — authenticated connections for dashboard (via JWT cookie),
// anonymous connections allowed for public site. Rooms per MASTER_PLAN §9.

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAMES, ROLE_NAMES } from '../config/constants.js';

// Minimal cookie-header parser — avoids pulling in the `cookie` package.
function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

let ioInstance = null;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const header = socket.handshake.headers.cookie || '';
    const parsed = parseCookies(header);
    const token = parsed[COOKIE_NAMES.ACCESS];

    socket.data.auth = null;
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret);
        socket.data.auth = {
          userId:   payload.userId,
          username: payload.username,
          roleId:   payload.roleId,
          roleName: payload.roleName,
        };
      } catch {
        // Invalid/expired token — fall through as anonymous.
        socket.data.auth = null;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth;

    // Anonymous visitors → public room only.
    if (!auth) {
      socket.join('public');
      socket.on('disconnect', () => {});
      return;
    }

    // Authenticated dashboard users:
    socket.join('dashboard');
    socket.join('public'); // dashboard users also see public broadcasts (for consistency)
    socket.join(`employee:${auth.userId}`);

    if (auth.roleName === ROLE_NAMES.CFO) socket.join('role:cfo');
    if (auth.roleName === ROLE_NAMES.TEAM_MANAGER) socket.join('role:team_manager');
    if (auth.roleName === ROLE_NAMES.ADMIN || auth.roleName === ROLE_NAMES.SUPERADMIN) {
      socket.join('role:admin');
    }

    socket.on('disconnect', () => {});
  });

  ioInstance = io;
  return io;
}

export function getIo() {
  return ioInstance;
}

// ─── Emit helpers ────────────────────────────────────────────────────────────

export function emitToAll(event, payload) {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
}

export function emitToRoom(room, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(room).emit(event, payload);
}

export function emitToEmployee(employeeId, event, payload) {
  emitToRoom(`employee:${employeeId}`, event, payload);
}
