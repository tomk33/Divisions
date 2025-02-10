// completed from 04/02/2025 to 07

window.playersArray = [];

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

// // Host button
// document.getElementById('createHost').addEventListener('click', () => {
//     isHost = true;
//     console.log("Hosting game...");
// });

// Connect to host via button
document.getElementById('joinGame').addEventListener('click', () => {
    const name = document.getElementById('name').value; // use with if statements to set turns and other things  // added value which i forgot to add

    // Get player name and set to players array
    if (name) {
        window.playersArray.push(name);
    } else {
        console.error("Player name not found");
    }

    const hostId = document.getElementById('peerIdInput').value;
    conn = peer.connect(hostId);

    conn.on('open', () => {
        console.log("Connected to host");
        
        // Sens player name to host after connection is open this was an ERROR that i made putting it outside the conn
        conn.send({ type: "peerName", name });
    });

    conn.on('data', handleData);
    
    goToSettings(false);  // branches to settings but passing false for host so settingsScreen isn't removed
});

// Connect to peer for host
peer.on('connection', (connection) => {
    const name = document.getElementById('name').value; // use with if statements to set turns and other things  // added value which i forgot to add

    // Get player name and set to players array
    if (name) {
        window.playersArray.push(name);
    } else {
        console.error("Player name not found");
    }

    conn = connection;
    console.log("A player connected:", connection.peer);

    // Host connects and sends player name
    conn.on("open", () => {
        console.log("Host connected back to peer");

        // Send acknowledge connection
        conn.send({ type: "hostAck", message: "Host has acknowledged your connection" });
        
        // Send player name to peer
        conn.send({ type: "hostName", name });
    });

    // Handle messages from the peer
    conn.on("data", handleData);

    goToSettings(true);  // passes host as true to the function using arg

});


// Go to settings
function goToSettings(host) {
    document.getElementById('connectScreen').style.display = 'none';  // will just make screen blank fn

    if (host) {
        document.getElementById('settingsScreen').style.display = 'block';  // only removes if host is true

        const form = document.getElementById('gameForm');
        // const numPlayersInput = document.getElementById('numPlayers');
        // const playerNamesDiv = document.getElementById('playerNames');

        // dynamic form change
        // function generatePlayerInputs() {
        //     playerNamesDiv.innerHTML = '';  //  Clear inputs
        //     const numPlayers = numPlayersInput.value;

        //     for (let i = 1; i <= numPlayers; i++) {
        //         const label = document.createElement('label');
        //         label.textContent = `Player ${i} Name: `;
        //         const input = document.createElement('input');
        //         input.type = 'text';
        //         input.id = `player${i}Name`;
        //         label.appendChild(input);
        //         playerNamesDiv.appendChild(label);
        //         playerNamesDiv.appendChild(document.createElement('br'));
        //     }
        // }

        // Update the player name by calling generate function
        // numPlayersInput.addEventListener('input', generatePlayerInputs);

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            console.log('form submitted');

            // const numPlayers = numPlayersInput.value;

            // for (let i = 1; i <= numPlayers; i++) {
            //     const playerName = document.getElementById("name").value;
                
            //     players.push(playerName);
            // }

            // Host starts game
            console.log("Starting game...");
            const troops = document.getElementById('troopsInput').value;
            const gameType = document.getElementById('gameType').value;
    
            if (conn) conn.send({ type: "startGame", troops, gameType});
    
            startGame(troops, gameType);


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
    if (data.type === "peerName") {
        console.log("Peer name received:", data.name);
        window.playersArray.push(data.name);  // adds name to players array
    }
    if (data.type === "hostName") {
        console.log("Host name received:", data.name);
        window.playersArray.push(data.name);  // adds name to players array
    }
    if (data.type === "startGame") startGame(data.troops, data.gameType);
    if (data.type === "updateTroops") updateTroops(data.territory, data.newTroopCount);
    if (data.type === "hostAck") console.log(data.message); // Debugging
    // if (data.type === "attackTerritory") attackTerritory(data.territory, data.attackModifier);
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

function attackTerritory(territory, attackModifier) {
    console.log('the function routes correctly........');
    console.log(territory);
    if (territory) {
        const territoryElement = document.getElementById(territory);
        newTroopCount = 'HELLO';
        territoryElement.textContent = newTroopCount;

        // Ensure connection exists before sending
        if (conn && conn.open) {
            conn.send({
                type: "updateTroops",
                territory: territory,
                newTroopCount: newTroopCount
            });
            console.log("Sent attack update:", territory, newTroopCount);
        } else {
            console.log("Connection not open, attack not synced.");
        }
        // conn.send({ type: "updateTroops", territory, newTroopCount});
        // if (typeof attackTerritory === "function") {
        //     attackTerritory(territory, attackModifier);
            
        // }
    }
}

function updateTroops(territory, newTroopCount) {
    console.log("Updating troops for", territory, "to", newTroopCount);
    if (territory) {
        // const territoryElement = document.getElementById(territory);
        // territoryElement.textContent = newTroopCount;

        const territoryElement = document.getElementById(territory);
        if (territoryElement) {
            territoryElement.textContent = newTroopCount;
            console.log("Troop count updated successfully!");
        } else {
            console.error("Territory element not found:", territory);
        }

    }
    
}

// End game but just reloads page
// document.getElementById('endGame').addEventListener('click', () => {
//     location.reload();
// });
