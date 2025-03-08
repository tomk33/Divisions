const { PeerServer } = require("peer");

const peerServer = PeerServer({
    port: process.env.PORT || 9000, // Use Render's assigned port
    path: "/",
    allow_discovery: true
});

console.log(`PeerJS Server is running on port ${process.env.PORT || 9000}...`);

// Keep the server running by preventing process exit
process.on("SIGINT", () => {
    console.log("Shutting down PeerJS server...");
    process.exit();
});

// Keep the server alive (Render needs this)
setInterval(() => console.log("Server is alive..."), 120000);
