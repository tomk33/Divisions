
const express = require('express');
const app = express();

app.use(express.static('public'));

const server = app.listen(5173, () => {
  console.log('Server listening on port 3000');
});

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
