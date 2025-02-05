const ws = new WebSocket('ws://localhost:5173'); //'ws://localhost:5173'

ws.addEventListener('open', () => {
  console.log('Connected to server');

  // Send a message to the server
  ws.send('Hello, server!');
  console.log('hi server');
});

ws.addEventListener('message', (event) => {
  console.log(`Message from server: ${event.data}`);
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawPlayer(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 50, 50);
}

function renderGame(gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const player of gameState.players) {
    drawPlayer(player.x, player.y, player.color);
  }
}

ws.addEventListener('message', (event) => {
  const gameState = JSON.parse(event.data);
  renderGame(gameState);
});
