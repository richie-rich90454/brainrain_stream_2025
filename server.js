const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Create an Express server
const app = express();
const server = http.createServer(app);

// Serve the static HTML file
app.use(express.static('public'));

// Create WebSocket server for signaling
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('A client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
    
    // Broadcast the message to all clients except the sender
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('A client disconnected');
  });
});

// Start the server
const port = 2047;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
