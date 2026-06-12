import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io('/', {
  auth: { token },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});


  socket.on('connect', () => {
    console.log('Socket bağlandı:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket ayrıldı:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket bağlantı hatası:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};