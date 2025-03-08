// PeerJS Mesh Network for Game Sync
// NOTE TO SELF: workings can be found in the asdasdsad file in onedrive

// Generate a unique peer ID
function generatePeerID() {
    return Math.floor(100 + Math.random() * 900).toString(); // 3-digit ID
}
const peerId = generatePeerID();
const peer = new Peer(peerId, {
    host: 'divisions.onrender.com',
    port: 443,  // Use port 443 for secure WebSocket (wss)
    path: '/peerjs',  // This should match the path you used on the server
    secure: true
});

// const peer = new Peer(peerId, {
//    host: "https://divisions.onrender.com",  // Render URL
//    port: 10000,  // Uses HTTPS on 443
//    path: "/",
//    secure: true
// });

window.gameSettings = {};
window.playersObject = {};
window.hostGame = false;
let connections = {};
let knownPeers = new Set();

let pastelColours = [0xFFB6C1, 0xFDFD96, 0xC3B1E1, 0xC2A385]  // 5 colours for 5 players max

// Display Peer ID
peer.on('open', () => {
    document.getElementById("ownId").innerText = peerId;
});

document.getElementById("joinGame").addEventListener("click", () => {
    // console.log('button works');
    // const peerName = document.getElementById('name').value; // use with if statements to set turns and other things  // added value which i forgot to add
    const gameId = document.getElementById("peerIdInput").value;
    
    if (gameId && gameId !== peerId) { // stops user from connecting to themselves
        connectToPeer(gameId);
    }
});

document.getElementById("hostGame").addEventListener("click", () => {
    console.log('You are the host');

    // If host, add itself to playersObject immediately
    const hostName = document.getElementById("name").value;

    window.playersObject[peerId] = {
        name: hostName,
        troops: {},
        territories: [],
        colour: null
    };

    console.log("Host added to playersObject:", window.playersObject);
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
        const flag = 'none';
        conn.send({ type: "requestPeerName", flag });

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
    document.getElementById('connectScreen').style.display = 'none';  // will just make screen blank

    if (window.hostGame === true) {
        document.getElementById('settingsScreen').style.display = 'block';  // only removes if host is true

        const form = document.getElementById('gameForm');

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            console.log('form submitted');

            // Host starts game
            console.log("Starting game...");
            const troops = document.getElementById('troopsInput').value;
            const gameType = document.getElementById('gameType').value;
            console.log("Game started with troops:", troops);
            console.log("Game type is:", gameType);

            // Stores troopTotal and gameType for host only
            window.gameSettings.troopTotal = troops;
            window.gameSettings.gameType = gameType;
            // console.log(window.gameSettings[0]);

            Object.values(connections).forEach(conn => {
                if (conn.open) { // isHost marks the host connection
                        const flag = 'once';
                        conn.send({ type: "requestPeerName", flag });
                }
            });

            // Broadcast the playersObject to all peers
            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    // console.log("Sending full playersObject to", conn.peer, fullPlayersObject);
                    // console.log(`DOING IT FOR THIE PEER: ${conn.peer}`);
                    // alert('its sending it');  // Debugging
                    conn.send({ type: "syncGameInfo", troops: troops, gameType: gameType });
                }
            });

            // Delay just gives the program time to send and recieve messages above
            setTimeout(() => {
                // console.log('I am host');
                Object.values(connections).forEach(conn => {
                    if (conn.open) { // Make sure the connection is open
                        conn.send({ type: "startGame" });
                    }
                });
            }, 500);

            setTimeout(startGame(), 500);
            // startGame();

        });
    } else {
        const waitingMessage = document.createElement("h1");
        waitingMessage.textContent = "Waiting for host to start the game...";
        waitingMessage.id = "waitingMessage";
        
        document.body.appendChild(waitingMessage); // A feature *definitely not a bug that i cba to fix* that lets the peer know how many players there are other than the host
    }
}

function handleData(data, conn) {
    if (data.type === "meshConnect") {
        // Connect to all known peers received from the sender
        data.peers.forEach(peerId => connectToPeer(peerId));
    }
    if (data.type === "startGame") {
        // const myTimeout = setTimeout(startGame(), 15000);
        startGame();
    }
    if (data.type === "syncTroops") {
        const isUpdated = false
        gameActions.attackTerritory(data.territory, isUpdated);
    }
    // For the host to display connections
    if (data.type === "requestPeerName") {
        const peerName = document.getElementById('name').value;
        // This ensures that when a host requests a peer name, it sends it
        if (conn) {
            conn.send({ type: "peerName", peerName, flag: data.flag });  // Sends back the name to the host
        } else {
            console.error("handleData error: conn is undefined!");
        }
    }
    if (data.type === "peerName") {
        if (data.flag === 'once'){
            window.playersObject[conn.peer] = {
                name: data.peerName,
                troops: {},
                territories: [],
                colour: null
            };

            let fullPlayersObject = structuredClone(window.playersObject);
            // console.log("Final playersObject before sending:", fullPlayersObject);

            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    console.log("Sending full playersObject to", conn.peer, fullPlayersObject);
                    // console.log(`DOING IT FOR THIE PEER: ${conn.peer}`);
                    // alert('its sending it');  // Debugging
                    conn.send({ type: "syncPlayerInfo", playersObject: fullPlayersObject });
                }
            });
            // }, Math.random() * 200); // small random delay to prevent race collisions caused by the message being recieved at the same time by all peers
        } else {
            console.log("Peer name received:", data.peerName);

            const player = document.createElement("li");
            const node = document.createTextNode(data.peerName);
            player.appendChild(node);

            const listOfNames = document.getElementById('listOfNames');
            listOfNames.appendChild(player);
        }
    }
    // Syncs game info with peers
    if (data.type === "syncGameInfo") {
        // console.log("Received playersObject:", window.playersObject); // Debugging
        window.gameSettings.troopTotal = data.troops; // set this.troops after the change is recieved from event handler
        window.gameSettings.gameType = data.gameType; // set this.troops after the change is recieved from event handler
    }
    // Handles syncs during gameplay
    if (data.type === "syncPlayersObject") {
        if (data.playersObject) {
            // Merge new data
            window.playersObject = deepMerge(structuredClone(window.playersObject), data.playersObject);
            // console.log("updated playersObject :", window.playersObject); // Debugging
            
            if (data.territoryChanges) {
                // Notifies game.js to update colours via the window event listener
                window.dispatchEvent(new Event("updateTerritoryColours"));
            }
        }
        if (data.currentTurnIndex) {
            window.currentTurnIndex = data.currentTurnIndex;
            // let currentPlayerId = playerIds[window.currentTurnIndex];
            showPlayerTurnPopup(window.playersObject[playerIds[window.currentTurnIndex]]?.name);
            if (window.sharedState.gameState === 'attack1') {  // && peerId === currentPlayerId
                // startPlayerAttackPhase();
                // Dispatch a custom event instead of calling the function directly
                window.dispatchEvent(new Event("startAttackPhase"));
            }
            
            if (window.sharedState.gameState === 'deployment2') { // else if  // && peerId === currentPlayerId
                // Dispatch a custom event instead of calling the function directly
                window.dispatchEvent(new Event("startDeploymentPhase"));
            }
        }
        if (data.currentPlayerId) {
            showPlayerTurnPopup(window.playersObject[data.currentPlayerId]?.name);
        }
        if (data.troopsForTerritory) {
            // Updates the troopsLabel for the territory selected
            const territoryElement = document.getElementById(data.territoryClicked); // data.territoryClicked is sharedState.territoryClicked
            if (!territoryElement) console.log('Cant recognise the clicked territory');
            const newTroopCount = data.troopsForTerritory;
            territoryElement.textContent = newTroopCount;
        }
    }
    // Handles sync for the initial creation of the playersObject
    if (data.type === "syncPlayerInfo") {
        console.log('the players obj is: ', data.playersObject);
        window.playersObject = deepMerge(structuredClone(window.playersObject), data.playersObject);
    }
    if (data.type === "syncAttackPopup") {
        showAttackPopup();
    }
    if (data.type === "syncGameState") {
        window.sharedState.gameState = data.gameState;
    }
    if (data.type === "syncColours") {
        window.playersObject = deepMerge(structuredClone(window.playersObject), data.updatedObject);  
    }
    if (data.type === "syncLabels") {
        // window.playersObject = deepMerge(structuredClone(window.playersObject), data.playersObject);  
        if (data.labelId) {
            const territoryElement = document.getElementById(data.labelId);
            territoryElement.textContent = data.troopCount;
        } else {
            console.log('Couldnt set the troops no. label');
        }
    }
    if (data.type === "gameOver") {
        console.log('we made it to the end');
        // window.location.href = `endScreen.html?winner=${encodeURIComponent(data.winner)}&data=${encodeURIComponent(JSON.stringify(window.playersObject))}`;
        window.location.href = `endScreen.html?winner=${encodeURIComponent(data.winner)}&rankings=${encodeURIComponent(JSON.stringify(data.rankings))}`;
        // document.dispatchEvent(new CustomEvent("displayEndScreen", { detail: { winner: data.winner } }));
        // alert(`${data.winner}, has won the game!`);
        // There will be code here for displaying an end screen with results.................
    }
    if (data.type === "playerLost") {
        alert('You have lost :(');
    }
    if (data.type === "updateLeaderboard") {
        window.playersObject = data.playersObject; // Sync player data
        // Dispatch an event to update the leaderboard in game.js
        document.dispatchEvent(new Event("updateLeaderboardEvent"));
    }
}

// Found this from an online source
function deepMerge(target, source) {
    for (let key in source) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            // If it's an object, merge recursively
            target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            // Otherwise, just assign the value
            target[key] = source[key];
        }
    }
    return target;
}

function startGame() {
    document.getElementById('settingsScreen').style.display = 'none';  // clears the hosts screen asw
    
    if (window.hostGame === false) {
        document.getElementById('waitingMessage').remove();  // removes waiting message from the screen
    }

    // load game.js dynamically for integration with settings
    let script = document.createElement('script');
    script.src = "game.js";
    script.onload = () => console.log("Game script loaded");
    document.body.appendChild(script);
}
