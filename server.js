const PeerServer = require('peer').PeerServer;

const server = PeerServer({
    port: process.env.PORT || 443,  // Default to 443 if no environment variable is set (for HTTPS)
    path: '/peerjs',
    secure: true,  // Use secure WebSocket (wss)
    cors: {
        origin: '*',  // Allow cross-origin requests from any origin
        methods: ['GET', 'POST']
    }
});

server.listen(process.env.PORT || 443, () => {
    console.log(`PeerJS server running on port ${process.env.PORT || 443}`);
});
