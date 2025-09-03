const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When using the `app` directory, Next.js does not expose the `req.socket.server`
// directly in API routes. A custom server is needed to integrate Socket.IO.
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const waitingClients = []; // Array to hold socket IDs of clients waiting for a partner
const pairedClients = new Map(); // Map to store active pairs: socketId -> partnerSocketId

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    path: '/api/socket_io',
    addTrailingSlash: false,
    cors: {
      origin: "*", // Adjust this to your client's origin in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('findPartner', () => {
      if (waitingClients.length > 0) {
        const partnerId = waitingClients.shift(); // Get the first waiting client
        if (partnerId) {
          pairedClients.set(socket.id, partnerId);
          pairedClients.set(partnerId, socket.id);

          io.to(socket.id).emit('partnerFound', partnerId);
          io.to(partnerId).emit('partnerFound', socket.id);
          console.log(`Paired ${socket.id} with ${partnerId}`);
        }
      } else {
        waitingClients.push(socket.id);
        socket.emit('waitingForPartner');
        console.log(`${socket.id} is waiting for a partner.`);
      }
    });

    socket.on('message', (msg) => {
      const partnerId = pairedClients.get(socket.id);
      if (partnerId) {
        io.to(partnerId).emit('message', msg);
        console.log(`Message from ${socket.id} to ${partnerId}: ${msg}`);
      } else {
        socket.emit('error', 'No partner found to send message.');
        console.log(`Message from ${socket.id} but no partner: ${msg}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from waiting list if present
      const waitingIndex = waitingClients.indexOf(socket.id);
      if (waitingIndex > -1) {
        waitingClients.splice(waitingIndex, 1);
      }

      // Handle paired client disconnection
      const partnerId = pairedClients.get(socket.id);
      if (partnerId) {
        io.to(partnerId).emit('partnerDisconnected');
        pairedClients.delete(socket.id);
        pairedClients.delete(partnerId);
        console.log(`Partner ${partnerId} disconnected from ${socket.id}.`);
      }
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});