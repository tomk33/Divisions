// PeerJS Mesh Network for Game Sync
// NOTE TO SELF: workings can be found in the asdasdsad file in onedrive

// Generate a unique peer ID
function generatePeerID() {
    return Math.floor(100 + Math.random() * 900).toString(); // 3-digit ID
}
const peerId = generatePeerID();
const peer = new Peer(peerId);  // , { host: "0.peerjs.com", port: 443, path: "/" }

window.playersArray = [];
window.hostGame = false;
let connections = {};
let knownPeers = new Set();
window.gameId = null;



// Display Peer ID
peer.on('open', () => {
    document.getElementById("ownId").innerText = peerId;
});

document.getElementById("joinGame").addEventListener("click", () => {
    // console.log('button works');
    const peerName = document.getElementById('name').value; // use with if statements to set turns and other things  // added value which i forgot to add
    const gameId = document.getElementById("peerIdInput").value;
    window.gameId = gameId;
    
    if (gameId && gameId !== peerId) {
        connectToPeer(gameId, peerName);
    }
});

document.getElementById("hostGame").addEventListener("click", () => {
    console.log('You are the host');
    window.hostGame = true;
});

function connectToPeer(otherPeerId) {
    if (connections[otherPeerId] || otherPeerId === peerId) return;

    let conn = peer.connect(otherPeerId);
    
    conn.on('open', () => {
        console.log(`Connected to ${otherPeerId}`);
        connections[otherPeerId] = conn;
        knownPeers.add(otherPeerId);

        // Send the known peers list to new peer
        conn.send({ type: "meshConnect", peers: Array.from(knownPeers) });

        conn.on('data', (data) => handleData(data, conn));

        goToSettings(false);
    });

    conn.on('close', () => {
        console.log(`Disconnected from ${otherPeerId}`);
        delete connections[otherPeerId];
        knownPeers.delete(otherPeerId);
    });
}

peer.on('connection', (conn) => {
    conn.on('open', () => {
        console.log(`Incoming connection from ${conn.peer}`);
        connections[conn.peer] = conn;
        knownPeers.add(conn.peer);

        // Ask the new peer for its name
        conn.send({ type: "requestPeerName" });

        // Send the known peers list to new connection
        conn.send({ type: "meshConnect", peers: Array.from(knownPeers) });

        conn.on('data', (data) => handleData(data, conn));

        goToSettings(true);
    });

    conn.on('close', () => {
        console.log(`Disconnected from ${conn.peer}`);
        delete connections[conn.peer];
        knownPeers.delete(conn.peer);
    });
});

function goToSettings(host) {
    document.getElementById('connectScreen').style.display = 'none';  // will just make screen blank fn

    if (window.hostGame === true) {  // remove '=' if no work
        document.getElementById('settingsScreen').style.display = 'block';  // only removes if host is true

        const form = document.getElementById('gameForm');

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            console.log('form submitted');

            // Host starts game
            console.log("Starting game...");
            const troops = document.getElementById('troopsInput').value;
            const gameType = document.getElementById('gameType').value;

            startGame(troops, gameType);

            if (window.hostGame == true) {
                console.log('I am the host');
                Object.values(connections).forEach(conn => {
                    if (conn.open) { // Make sure the connection is open
                        conn.send({ type: "startGame", troops, gameType });
                    }
                });
            }
        });
    }
}

function handleData(data, conn) {
    if (data.type === "meshConnect") {
        // Connect to all known peers received from the sender
        data.peers.forEach(peerId => connectToPeer(peerId));
    }
    if (data.type === "startGame") {
        startGame(data.troops, data.gameType);
    }
    if (data.type === "syncTroops") {
        const isUpdated = false
        attackTerritory(data.territory, isUpdated);
    }
    if (data.type === "requestPeerName") {
        const peerName = document.getElementById('name').value;
        // This ensures that when a host requests a peer name, it sends it
        if (conn) {
            conn.send({ type: "peerName", peerName });  // Send back the name to the host
        } else {
            console.error("handleData error: conn is undefined!");
        }
    }
    if (data.type === "peerName") {
        console.log("Peer name received:", data.peerName);

        const player = document.createElement("li");
        const node = document.createTextNode(data.peerName);
        player.appendChild(node);

        const listOfNames = document.getElementById('listOfNames');
        listOfNames.appendChild(player);

        window.playersArray.push(data.peerName);  // adds name to players array
    }
}

function startGame(troops, gameType) {
    document.getElementById('settingsScreen').style.display = 'none';  // clears the hosts screen asw
    document.getElementById('connectScreen').style.display = 'none';  // clears the hosts screen asw


    console.log("Game started with troops:", troops);
    console.log("Game type is:", gameType);

    // load game.js dynamically for integration with settings
    let script = document.createElement('script');
    script.src = "game.js";
    script.onload = () => console.log("Game script loaded");
    document.body.appendChild(script);
}

// --------------------------------------------------------------

function attackTerritory(territory, isUpdated) {
    const territoryElement = document.getElementById(territory);
    const newTroopCount = "HELLO"; // Example update

    // Update the territory element
    territoryElement.textContent = newTroopCount;
    
    // Send update to all connected peers
    if (isUpdated === true) {
        updateTroops(territory, newTroopCount);
    } // Set the flag to true after the first call
}

// Function to send updates to all connections
function updateTroops(territory, newTroopCount) {
    // Send the attack message to the host who is the first connection in knownPeers
    const hostPeerId = [...knownPeers][0];
    if (connections[hostPeerId]) {
        // connections[hostPeerId].send({ type: "attack", territory, newTroopCount });
        connections[hostPeerId].send({ type: "syncTroops", territory, newTroopCount });
    }

    for (const peerId of Object.keys(connections)) {    // Send the message to all other peers except the current peer
        if (peerId !== window.peerId && peerId !== hostPeerId) {
            // Send the syncTroops message to all peers except the host and the current peer
            connections[peerId].send({ type: "syncTroops", territory, newTroopCount });
        }
    }
}