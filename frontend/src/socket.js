import { io } from 'socket.io-client';
import { tokenStore } from './api';

// Connect to backend Socket.io with the auth token.
export function connectSocket() {
  const token = tokenStore.token;
  if (!token) return null;
  return io('/', { auth: { token } }); // Vite proxies /socket.io to backend
}

export default connectSocket;