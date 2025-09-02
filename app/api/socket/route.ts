import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: {
      io?: Server | undefined;
    } & Server;
  };
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('New Socket.io server...');
    const io = new Server(res.socket.server as any, {
      path: '/api/socket_io',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });

      socket.on('message', (msg) => {
        console.log('message:', msg);
        io.emit('message', msg); // Broadcast message to all connected clients
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.io server already running.');
  }
  res.end();
}