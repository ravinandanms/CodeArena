import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to CodeArena live updates:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
