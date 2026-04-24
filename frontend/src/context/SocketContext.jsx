import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, loading } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Wait for the initial /auth/me probe before opening the socket — that way
  // dashboard users open the socket with their cookie already present and the
  // server room-joins them correctly.
  useEffect(() => {
    if (loading) return undefined;

    const s = connectSocket();
    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [loading]);

  // Reconnect when the logged-in user changes (login / logout) so the server
  // picks up the new cookie state and re-joins the appropriate rooms.
  useEffect(() => {
    if (loading) return;
    const s = getSocket();
    if (s?.connected) {
      s.disconnect();
      s.connect();
    }
  }, [user?.id, loading]);

  // Clean up on unmount.
  useEffect(() => () => { disconnectSocket(); socketRef.current = null; }, []);

  const value = useMemo(() => ({
    socket: socketRef.current,
    connected,
    on: (event, handler) => {
      const s = socketRef.current;
      if (!s) return () => {};
      s.on(event, handler);
      return () => s.off(event, handler);
    },
    emit: (event, payload) => {
      const s = socketRef.current;
      if (s && s.connected) s.emit(event, payload);
    },
  }), [connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) return { socket: null, connected: false, on: () => () => {}, emit: () => {} };
  return ctx;
}

// Subscribe to a single event with automatic cleanup.
export function useSocketEvent(event, handler, deps = []) {
  const { on, connected } = useSocket();
  useEffect(() => {
    const off = on(event, handler);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, on, connected, ...deps]);
}
