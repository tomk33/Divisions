// completed from 04/02/2025 to 07

// Generate 3 digit peerID
function generatePeerID() {
    return Math.floor(100 + Math.random() * 900).toString(); // 3-digit number (100-999)
}

const peerId = generatePeerID();

const peer = new Peer(peerId);

let conn, isHost = false;
// let players = []; // tried to use this and forgot that it won't update to to init when used within function
// let gameType;

// Display id
peer.on('open', id => document.getElementById('ownId').innerText = id);

// Host button
document.getElementById('createHost').addEventListener('click', () => {
    isHost = true;
    console.log("Hosting game...");
});

// Connect to host via join button
document.getElementById('joinGame').addEventListener('click', () => {
    const hostId = document.getElementById('peerIdInput').value;
    conn = peer.connect(hostId);

    // Peer connects to host
    conn.on('open', () => {
        console.log("Connected to host");
        goToSettings(false);  // branches to settings but passing false for host so settingsScreen isn't removed
    });

    // Handles messages fro host
    conn.on('data', handleData);
});

// Connect to peer for host
peer.on('connection', (connection) => {
    conn = connection;
    console.log("A player connected:", connection.peer);

    // Host also needs to connects back to the peer
    conn.on("open", () => {
        console.log("Host connected back to peer!");
        conn.send({ type: "hostAck", message: "Host has connected to you" });
    });

    // Handles messages from the peer
    conn.on("data", handleData);

    goToSettings(true);  // passes host as true to the function using arg
});

// Go to settings
function goToSettings(host) {
    document.getElementById('connectScreen').style.display = 'none';  // will just make screen blank fn if not host

    if (host) {
        document.getElementById('settingsScreen').style.display = 'block';  // only removes if host is true

        const form = document.getElementById('gameForm');
        const numPlayersInput = document.getElementById('numPlayers');
        const playerNamesDiv = document.getElementById('playerNames');

        // dynamic form change
        function generatePlayerInputs() {
            playerNamesDiv.innerHTML = '';  //  Clear inputs
            const numPlayers = numPlayersInput.value;

            for (let i = 1; i <= numPlayers; i++) {
                const label = document.createElement('label');
                label.textContent = `Player ${i} Name: `;
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `player${i}Name`;
                label.appendChild(input);
                playerNamesDiv.appendChild(label);
                playerNamesDiv.appendChild(document.createElement('br'));
            }
        }

        // Update the player name by calling generate function
        numPlayersInput.addEventListener('input', generatePlayerInputs);

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            console.log('form submitted');

            const numPlayers = numPlayersInput.value;

            const players = [];

            for (let i = 1; i <= numPlayers; i++) {
                const playerName = document.getElementById(`player${i}Name`).value;
                
                players.push(playerName);
            }

            console.log(players);
            localStorage.setItem('players', players);

            // Host starts game
            if (players.length > 1) {
                console.log("Starting game...");
                const troops = document.getElementById('troopsInput').value;
                const gameType = document.getElementById('gameType').value;
        
                if (conn) conn.send({ type: "startGame", troops, gameType});
        
                startGame(troops, gameType);
            } else {
                alert('Not entered or code failed ahhhhhhhh');
            }

            // const players = JSON.stringify(playerNamesArray); // tried to set players here and return at end of function but it tries to do it for peers aswell which doesn't work
            
            // gameType = document.getElementById('gameType').value;

            // might just do if (host) sessionStorage.setitem and set the values there for the host

        });

    }
}

// document.getElementById('startGame').addEventListener('click', () => {
//     const troops = document.getElementById('troopsInput').value;
//     const gameType = document.getElementById('gameType').value;

//     if (conn) conn.send({ type: "startGame", troops, gameType});

//     startGame(troops, gameType);
// });

// Peer recieve
function handleData(data) {
    if (data.type === "startGame") startGame(data.troops, data.gameType);
    if (data.type === "hostAck") console.log(data.message); // FOR DEBUGGING ONLY
}

// Start Game
function startGame(troops, gameType) {
    document.getElementById('settingsScreen').style.display = 'none';  // clears the hosts screen asw

    console.log("Game started with troops:", troops);
    console.log("Game type is:", gameType);

    // load game.js dynamically for integration with settings
    let script = document.createElement('script');
    script.src = "game.js";
    script.onload = () => console.log("Game script loaded");
    document.body.appendChild(script);

    // Pass game settings to game.js if needed
    // if (typeof initGame === "function") {
    //     initGame(troops);
    // }
}

function attackTerritory(territory, attackModifier, host) {
    if (host) {
        console.log('the function routes correctly........');

    }
    
}

// End game but just reloads page
// document.getElementById('endGame').addEventListener('click', () => {
//     location.reload();
// });
