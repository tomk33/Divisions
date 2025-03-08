const { PeerServer } = require("peer");

const peerServer = PeerServer({
    port: process.env.PORT || 9000, // Use Render’s assigned port
    path: "/",
    allow_discovery: true
});

console.log("PeerJS Server is running...");
