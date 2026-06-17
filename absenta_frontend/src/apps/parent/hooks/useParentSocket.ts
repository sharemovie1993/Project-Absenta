import { createContext, useContext } from 'react';
import type { Socket } from 'socket.io-client';

interface ParentSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

export const ParentSocketContext = createContext<ParentSocketContextType>({
  socket: null,
  isConnected: false,
});

export const useParentSocket = () => useContext(ParentSocketContext);

