const { PeerServer } = require("peer");

const peerServer = PeerServer({
    port: process.env.PORT || 9000, // Use Render's assigned port
    path: "/",
    allow_discovery: true
});

console.log(`PeerJS Server is running on port ${process.env.PORT || 9000}...`);

// Keep the server running so Render doesn't shut it down
setInterval(() => {
    console.log("Server is still running...");
}, 60000); // Log every 60s to prevent Render from thinking it's idle

process.on("SIGINT", () => {
    console.log("Shutting down PeerJS server...");
    process.exit();
});
