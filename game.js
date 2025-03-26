let renderer = new THREE.WebGLRenderer();
renderer.autoClear = false;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // The renderer for the map is here so that the orbit controls have a renderer to be applied to

let labelRenderer = new THREE.CSS2DRenderer();

labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

let scene = new THREE.Scene();
let scene1 = new THREE.Scene();
let labelScene = new THREE.Scene(); // Scene for labels

let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

let uniforms = {
    time: { type: "f", value: .1 },
    resolution: { type: "v2", value: new THREE.Vector2() },
    currentPos: { type: "v3", value: new THREE.Vector3() }
};

let startTime = Date.now();

let isShaderOn = false;
let raycastObjs = [];
let lineObjs = [];
let controls;

window.sharedState = {
    gameState: null,
    territoryClicked: null,
    lastSelectedTerritory: null,
    attackDifficulty: 0
};

// An array of costal counties
const coastalCounties = [
    "Merseyside",
    "Tyne and Wear",
    "Cheshire",
    "Lancashire",
    "East Riding of Yorkshire",
    "Lincolnshire",
    "Somerset",
    "Devon",
    "Dorset",
    "Essex",
    "Kent",
    "East Sussex",
    "West Sussex",
    "Hampshire",
    "Isle of Wight",
    "Cornwall",
    "Norfolk",
    "Suffolk",
    "Northumberland",
    "Cumbria",
    "Gwynedd",
    "Clwyd",
    "Dyfed",
    "West Glamorgan",
    "South Glamorgan",
    "Scottish Borders",
    "Dumfries and Galloway",
    "Lothian",
    "Fife",
    "Tayside",
    "Grampian",
    "Strathclyde",
    "Highland",
    "Orkney Islands",
    "Shetland Islands",
    "Eilean Siar",
    "Down",
    "Antrim",
    "Londonderry",
    "Gloucestershire"
];

let leaderboardList = [];

let playerIds;

let eliminatedPlayers = [];

gameTurnCounter = 0;

function updatePlayerIdsObject() {
    playerIds = Object.keys(window.playersObject);
}
window.currentTurnIndex = 0; // Start with the first player

// ----------------------------------------------------------------------------------------

function init() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    controls.target.set(0, 50, 0); // for world map (0, 40, 0) for us map (-100, 40, 0) maybe 144 for london map (0,50,0)
    camera.position.set(0, 50, 2); // for world map (0, -20, 170) for us map (-100, 30, 40) for london map (0,50,2)

    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.ZOOM,
        RIGHT: THREE.MOUSE.ROTATE // Nice feature to have not necessary though
    };

    controls.minDistance = 0.2;
    controls.maxDistance = 99;

    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    controls.enableDamping = true;
    controls.dampingFactor = 0.5;
    controls.screenSpacePanning = true;

    scene.background = new THREE.Color(0x41c7ff);

    // world_map_web_merc_new1.json
    fetch("uk-ceremonial-counties.json").then((response) => {
        return response.json();
    }).then((topology) => {
        let features = topojson.feature(topology, topology.objects.counties); // topology, topology.objects.world_map // us_map
        console.log(features);

        for (const feature of features.features) {
            let region = new Region(feature.geometry, feature.properties);
            let shape = region.createShape();
            let line = region.createLine();
            let label = region.createTextLabel('0');

            raycastObjs.push(shape);
            lineObjs.push(line);

            scene.add(shape);
            scene1.add(line);
            labelScene.add(label); // Add label to labelScene
        }

        uniforms.resolution.value.x = window.innerWidth;
        uniforms.resolution.value.y = window.innerHeight;

    });
}

function animate() {
    requestAnimationFrame(animate);
    let elapsedMilliseconds = Date.now() - startTime;
    let elapsedSeconds = elapsedMilliseconds / 1000.;
    uniforms.time.value = 60. * elapsedSeconds/10;

    controls.update();

    renderer.clear();
    renderer.render( scene, camera );
    renderer.clearDepth();
    renderer.render( scene1, camera );
    labelRenderer.render(labelScene, camera);

}

function showDeploymentPopup() {
    const deploymentPopup = document.getElementById("deploymentPopup");
    deploymentPopup.style.display = "block";

    // Move after 2 seconds
    setTimeout(() => {
        deploymentPopup.style.top = "2.8%";
        deploymentPopup.style.padding = "0.1vh 2vw";
    }, 2000);
}

function showAttackPopup() {
    const attackPopup = document.getElementById("attackPopup");

    setTimeout(() => {
        attackPopup.style.display = "block";
    }, 2000);

    // Move after 2 seconds
    setTimeout(() => {
        // popup.style.display = "none";
        const deploymentPopup = document.getElementById("deploymentPopup");
        deploymentPopup.style.display = "none";
        attackPopup.style.top = "2.8%";
        attackPopup.style.padding = "0.1vh 2vw";
    }, 4000);
}

function showPlayerTurnPopup(currentPlayerName) {
    console.log('showing it now..........'); // Debugging
    const turnPopup = document.getElementById("turnPopup");        
    // Show after deployment popup shows
    setTimeout(() => {
        turnPopup.innerText = `It is ${currentPlayerName}'s turn`  // ${window.playersObject[peerId]?.name}
        turnPopup.style.display = "block";
    }, 3000);

    // Hide after 3 more seconds
    setTimeout(() => {
        turnPopup.style.display = "none";
    }, 5000);
}

let initGame = function() {
    this.troops = null;
};

initGame.prototype = {
        // read this for specialised prototypes,  https://stackoverflow.com/questions/560829/calling-method-using-javascript-prototype
    playerSetup: function() {
        console.log(window.gameSettings.troopTotal); // Debugging
        setTimeout((console.log('OBJECT LOGGED WITH DELAY: ', window.playersObject)), 10000); // Delays the clog so that the peerjs has time to handle messages

        // Call this function when deployment phase starts
        showDeploymentPopup("deploymentPopup");

        this.loadmaingame = new mainGame();
        this.loadmaingame.setupEventListeners = this.loadmaingame.setupEventListeners.bind(this); // chat gpt:  Bind this in the mainGame constructor or methods
                                                                                                    // To make sure this always refers to the current instance, you should explicitly bind the context of this to the right object.
        this.loadmaingame.setupEventListeners();
    }
}

let mainGame = function() {
    initGame.call(this);
};

mainGame.prototype = {
    setupEventListeners: function() {
        // console.log(this.troopTotal); // Debugging

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        let INTERSECTED = null;
        let CLICKED = null;

        let gameTurns = 0; // This tracks the turns played in the game which is useful for the Zombie code

        const infoPanel = document.querySelector(".territoryInfoPanel");

        // Dice roll display
        const diceDisplay = document.createElement('div');
        diceDisplay.id = 'diceDisplay';
        diceDisplay.style.position = 'fixed';
        diceDisplay.style.top = '50%';
        diceDisplay.style.left = '50%';
        diceDisplay.style.transform = 'translate(-50%, -50%)';
        diceDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        diceDisplay.style.color = 'white';
        diceDisplay.style.padding = '15px';
        diceDisplay.style.zIndex = '1001';
        diceDisplay.style.display = 'none';
        diceDisplay.style.fontSize = '24px'; // Bigger for visibility
        diceDisplay.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(diceDisplay);

        // Update leaderboard function
        const leaderboard = document.createElement('div');
        leaderboard.id = 'leaderboard';
        leaderboard.style.position = 'fixed';
        leaderboard.style.top = '10px';
        leaderboard.style.left = '10px';
        leaderboard.style.backgroundColor = 'rgba(210, 180, 140, 0.9)'; // Parchment tone with slight transparency
        leaderboard.style.color = '#47331f'; // Warm brown text color
        leaderboard.style.padding = '10px';
        leaderboard.style.border = '3px solid #8b4513'; // Dark brown border for vintage effect
        leaderboard.style.borderRadius = '8px';
        leaderboard.style.boxShadow = '4px 4px 10px rgba(0, 0, 0, 0.3)'; // Soft shadow for depth
        leaderboard.style.fontFamily = "'Crimson Text', serif"; // Vintage-style font
        leaderboard.style.fontSize = '20px';
        leaderboard.style.zIndex = '1000';
        leaderboard.style.pointerEvents = 'none';

        leaderboard.innerHTML = '<strong>Leaderboard:</strong><br>'; // Initially set title in bold

        document.body.appendChild(leaderboard);

        // Initialize leaderboard with player names
        function initializeLeaderboard() {
            for (let eachPlayersId in window.playersObject) {
                let player = window.playersObject[eachPlayersId];
                const playerLeaderboard = document.createElement('div');
                playerColour = player.colour;
                const hexColor = `#${playerColour.toString(16).padStart(6, '0')}`; // CHATGPT
                playerLeaderboard.style.backgroundColor = `${hexColor}`;
                playerLeaderboard.style.opacity = 0.9;
                leaderboard.style.zIndex = '1001';
                playerLeaderboard.innerHTML += `
                    <span style="display: block; padding: 2px; color: 'black' opacity: '1';">${player.name}: 
                        <span id="${player.name}_territories" style="font-weight: bold;">${player.territories.length}</span> territories
                    </span>`;

                leaderboard.appendChild(playerLeaderboard);
            }
        }


        document.addEventListener("updateLeaderboardEvent", () => {
            updateLeaderboard(); // Call the function when the event is received
        });

        // Function to update existing leaderboard
        function updateLeaderboard() {
            let sortedPlayersObject = Object.values(window.playersObject)
            .slice() // Create a copy to avoid modifying the original
            .sort((a, b) => b.territories.length - a.territories.length); // Sort in descending order // SORT DOESNT WORK
    
            for (let eachPlayersId in sortedPlayersObject) {
                let player = sortedPlayersObject[eachPlayersId];
                let playerTerritoriesElement = document.getElementById(`${player.name}_territories`);
                if (playerTerritoriesElement) {
                    playerTerritoriesElement.textContent = player.territories.length;
                }
            }
        }

        // Listen for the escape key press
        document.addEventListener("keydown", function(event) {
            if (event.key === "Escape") {
                toggleGameControls();
            }
        });
        
        function toggleGameControls() {
            let overlay = document.createElement("div");
            overlay.id = "controlsOverlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(210, 180, 140, 0.95)"; // Parchment-style semi-transparent background
            overlay.style.color = "#47331f"; // Warm brown text
            overlay.style.display = "flex";
            overlay.style.flexDirection = "column";
            overlay.style.justifyContent = "center";
            overlay.style.alignItems = "center";
            overlay.style.fontSize = "2rem";
            overlay.style.zIndex = "3000";
            overlay.style.fontFamily = "'Cinzel', serif"; // Vintage-style heading font
            overlay.style.border = "5px solid #8b4513"; // Decorative dark brown border
            overlay.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.5)"; // Subtle shadow for depth

            // Adds title
            let title = document.createElement("h1");
            title.innerText = "Game Controls";
            title.style.fontFamily = "'Cinzel', serif";
            title.style.color = "#8b4513"; // Dark brown text
            overlay.appendChild(title);

            // Adds close button
            let closeButton = document.createElement("button");
            closeButton.innerText = "Back to Game";
            closeButton.style.marginTop = "20px";
            closeButton.style.padding = "10px 20px";
            closeButton.style.fontSize = "1.5rem";
            closeButton.style.fontFamily = "'Crimson Text', serif";
            closeButton.style.backgroundColor = "#8b4513"; // Dark brown button
            closeButton.style.color = "#f5deb3"; // Light parchment text
            closeButton.style.border = "2px solid #47331f"; // Border for antique feel
            closeButton.style.borderRadius = "8px";
            closeButton.style.cursor = "pointer";
            closeButton.style.boxShadow = "2px 2px 6px rgba(0, 0, 0, 0.3)"; // Depth effect
            closeButton.onmouseover = function() { closeButton.style.backgroundColor = "#a0522d"; };
            closeButton.onmouseout = function() { closeButton.style.backgroundColor = "#8b4513"; };

            closeButton.onclick = function () {
                overlay.remove();
            };

            overlay.appendChild(closeButton);

        
            overlay.appendChild(closeButton);
            document.body.appendChild(overlay); 

            // THIS DOESNT WORK BUT IT STOPS ESCAPE OPENING ANOTHER WINDOW
            // Close overlay when Escape key is pressed
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    console.log('escape pressed again');
                    overlay.remove();
                }
            });
        }

        // Handle all document click events
        
        document.addEventListener("click", onDocumentClick, false);
        function onDocumentClick(event) {
            // Prevent clicking through the UI
            if (event.target.closest(".actionPanel")) {
                event.stopPropagation(); // Stop event from reaching Three.js's raycasting
                return;
            }

            if (event.target.closest("#endAttackButton")) { // ERROR : I used the . for class rather than the # for id
                event.stopPropagation(); // Stop event from reaching Three.js's raycasting
                return;
            }

            if (event.target.closest("#troopTransferSlider")) {
                event.stopPropagation(); // Stop event from reaching Three.js's raycasting
                return;
            }

            if (event.target.closest("#controlsOverlay")) {
                event.stopPropagation(); // Stop event from reaching Three.js's raycasting
                return;
            }

            if (event.target.closest("#leaderboard")) {
                event.stopPropagation(); // Stop event from reaching Three.js's raycasting
                return;
            }

            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            let intersects = raycaster.intersectObjects(raycastObjs);

            if (intersects.length > 0) {
                if (CLICKED) {
                    CLICKED.material.color.set(CLICKED.elementData.shapeColour);
                }

                CLICKED = intersects[0].object;
                CLICKED.material.color.set(0xFF7F00);   //0x164B91

                let territoryClicked = CLICKED.elementData.properties.county;   // NAME change this for name of field for each region, county for uk ceremonial map
                window.sharedState.territoryClicked = territoryClicked.replace(/\s+/g, '_');   // Replaces spaces with underscores
                // console.log(this.territoryClicked);

                document.querySelector(".territory_name").innerText = territoryClicked;

                if (window.sharedState.gameState !== "deployment1"){
                    document.querySelector(".territoryInfoPanel").style.visibility = "visible";
                }
                // window.addEventListener("contextmenu", (event) => {
                //     event.preventDefault(); // Prevents the default right-click menu
                //     document.querySelector(".territoryInfoPanel").style.visibility = "visible";
                // });

                if (window.sharedState.gameState === "attack"){  // ERROR forgot to add .gameState
                    document.querySelector(".actionPanel").style.visibility = "visible";
                }

            } else {

                if (CLICKED) {
                    sharedState.territoryClicked = null;
                    CLICKED.material.color.set(CLICKED.elementData.shapeColour);
                    document.querySelector(".territory_name").innerText = "";
                    document.querySelector(".territoryInfoPanel").style.visibility = "hidden";
                    document.querySelector(".actionPanel").style.visibility = "hidden";
                }

                document.querySelector(".territoryInfoPanel").style.visibility = "hidden";
                CLICKED = null;
                sharedState.territoryClicked = null;
                selectedFromTerritory = null; // Reset on click away
            }
        }

        updatePlayerIdsObject();
        console.log('THIS IS THE PLAYERIDS ........... ', playerIds); // Debugging

        setTimeout(() => {
            deploymentPhase();
        }, 2400);

        // Deployment phase starts here...
        function deploymentPhase() {
            // ERROR, POP REMOVES THE LAST ITEM IN THE LIST, IT DOESNT FIND THE ITEM AND REMOVE IT
            // chosenColour = pastelColours[Math.floor(Math.random() * pastelColours.length)];
            // pastelColours.pop(chosenColour);

            // Loops through the playersObject and assigns a different colour to each player
            if (window.hostGame === true) { // only the host does this so that the colours for each player are the same
                for (let playerId in window.playersObject) {
                    let colourIndex = Math.floor(Math.random() * pastelColours.length);
                    let chosenColour = pastelColours[colourIndex];
                    window.playersObject[playerId].colour = chosenColour;
                    pastelColours.splice(colourIndex, 1);
                }
    
                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({ type: "syncColours", updatedObject: window.playersObject });
                    }
                });
            }

            // Show the first players turn
            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name
            console.log(currentPlayerName);
            showPlayerTurnPopup(currentPlayerName);

            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex]});
                }
            });

            let i = 3;  // (72 / Object.keys(window.playersObject).length) / 2;
            let totalTroops = 30;
            let territoryDistribution = [];
            let remainingTroops = totalTroops;

            if (window.gameSettings.gameType === "aiSepratists" && peerId === Object.keys(window.playersObject)[0]) {
                // Initialize zombie player but don't assign territories yet
                window.playersObject["zombie"] = {
                    name: "Sepratists",
                    troops: {},
                    territories: [],
                    colour: 0x00FF00 // Green for zombies
                };
                updatePlayerIdsObject();
            }

            // Adjust for aiSepratists which will become AI sepratist mode
            // if (window.gameSettings.gameType === "aiSepratists" && peerId === Object.keys(window.playersObject)[0]) { // The host handles the adding of the aiSepratists player for simplicity
            //     window.playersObject["zombie"] = {
            //         name: "aiSepratists",
            //         troops: {},
            //         territories: [],
            //         colour: 0x00FF00 // green, for now
            //     };
            //     updatePlayerIdsObject(); // Update playerIds with zombie
            //     i = (72 / Object.keys(window.playersObject).length) / 2; // ERROR: Need to recalculate i with zombie included
            // }

            for (let k = 0; k < (i - 1); k++) {
                let assignedTroops = Math.floor(Math.random() * remainingTroops / (i - k) + 1);
                territoryDistribution.push(assignedTroops);
                remainingTroops -= assignedTroops;
                console.log('this is the remaining troops: ', remainingTroops);
            }
            territoryDistribution.push(remainingTroops);

            sum = 0;
            territoryDistribution.forEach(troopNumber => {
                sum += troopNumber;
            });
            console.log(sum);
            console.log(territoryDistribution);

            // Update the playerIds object
            updatePlayerIdsObject();

            // Initialize leaderboard
            initializeLeaderboard();

            window.addEventListener("updateTerritoryColours", () => {
                Object.values(window.playersObject).forEach(player => {
                    player.territories.forEach(territoryName => {
                        let territoryShape = raycastObjs.find(obj => obj.elementData.properties.county === territoryName);
                        if (territoryShape) {
                            let playerColour = player.colour;
                            territoryShape.material.color.set(playerColour);
                            territoryShape.elementData.shapeColour = playerColour;
                            console.log(`Set colour for ${territoryName} to ${playerColour}`);
                        }
                    });
                });
            });

            window.addEventListener("click", function handleInitDeployment(event) {
                window.sharedState.gameState === "deployment1";

                let tempRaycaster = new THREE.Raycaster();
                let tempMouse = new THREE.Vector2();

                tempMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                tempMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                tempRaycaster.setFromCamera(tempMouse, camera);

                let intersects = tempRaycaster.intersectObjects(raycastObjs);

                if (intersects.length > 0) {
                    let clickedObject = intersects[0].object;
                    let countryName = clickedObject.elementData.properties.county;
                    console.log("Selected Country:", countryName);

                    let currentPlayerId = playerIds[window.currentTurnIndex];
                    console.log(currentPlayerId);

                    if (peerId === currentPlayerId && currentPlayerId !== "zombie") { // Only run normal code if not zombies game type and if it is this player's turn
                        let alreadySelected = Object.values(window.playersObject).some(player => 
                            player.territories.includes(countryName)
                        );

                        if (alreadySelected) {
                            console.log(`This country, (${countryName}) is already selected`);
                            return;
                        }

                        if (clickedObject.elementData) {
                            window.playersObject[peerId].territories.push(countryName);
                            clickedObject.material.color.set(window.playersObject[peerId].colour);
                            clickedObject.elementData.shapeColour = window.playersObject[peerId].colour;

                            let troopsForTerritory = territoryDistribution[territoryDistribution.length - i];
                            let infantry = Math.round(troopsForTerritory * 0.6);
                            let cavalry = Math.round(troopsForTerritory * 0.3);
                            let artillery = troopsForTerritory - infantry - cavalry;

                            window.playersObject[peerId].troops[countryName] = {
                                infantry: infantry,
                                cavalry: cavalry,
                                artillery: artillery
                            };

                            const territoryElement = document.getElementById(window.sharedState.territoryClicked);
                            console.log('THE THING CLICKED IS ... ', territoryElement);
                            if (!territoryElement) console.log('Cant recognise the clicked territory');
                            const newTroopCount = troopsForTerritory;
                            territoryElement.textContent = newTroopCount;

                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", troopsForTerritory, territoryClicked: window.sharedState.territoryClicked });
                                }
                            });

                            i--;
                            console.log(i);
                        } else {
                            console.log('Please click on the map');
                        }
                    }

                    if (i === 0) {
                        window.currentTurnIndex++;
                        console.log('The final object is : ', window.playersObject);
                        territoryChanges = true;

                        if (window.currentTurnIndex <= playerIds.length) { // ERROR : the equals sign was missing meaning that the last player was stuck in the init deployment phase
                            if (window.currentTurnIndex < playerIds.length) { // This stops the displaying of the next player turn after all players have gone as otherwise it would display undefineds turn
                                Object.values(connections).forEach(conn => {
                                    if (conn.open) {
                                        conn.send({ type: "syncPlayersObject", currentTurnIndex, playersObject: window.playersObject, territoryChanges });
                                    }
                                });

                                currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                                console.log(currentPlayerName);
                                showPlayerTurnPopup(currentPlayerName);
                            }

                            window.removeEventListener("click", handleInitDeployment);
                            console.log("Click event removed");
                        }
                        if (window.currentTurnIndex >= playerIds.length) { // ERROR : I used an else if which doesnt work here
                            // Initial zombie territories
                            // if (window.gameSettings.gameType === "aiSepratists" && peerId === Object.keys(window.playersObject)[0]) {
                            //     let neutralTerritories = raycastObjs.filter(obj => 
                            //         !Object.values(window.playersObject).some(p => p.territories.includes(obj.elementData.properties.county))
                            //     ).map(obj => obj.elementData.properties.county);
                            //     for (let j = 0; j < Math.min(5, neutralTerritories.length); j++) { // Start with 5 zombie territories
                            //         let territory = neutralTerritories[j];
                            //         window.playersObject["zombie"].territories.push(territory);
                            //         window.playersObject["zombie"].troops[territory] = { infantry: 2, cavalry: 0, artillery: 0 };
                            //         let shape = raycastObjs.find(obj => obj.elementData.properties.county === territory);
                            //         shape.material.color.set(0x00FF00);
                            //         shape.elementData.shapeColour = 0x00FF00;
                            //         updateTroopLabel(territory, 2);
                            //     }
                            // }

                            // Send leaderboard update to all connected players
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({
                                        type: "updateLeaderboard",
                                        playersObject: window.playersObject
                                    });
                                }
                            });
                            
                            updateLeaderboard();

                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", playersObject: window.playersObject, territoryChanges });
                                    conn.send({ type: "syncAttackPopup" });
                                }
                            });
                            showAttackPopup();

                            window.currentTurnIndex = 0; // Reset before transition
                            const gameState = 'attack1';
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncGameState", gameState: gameState });
                                }
                            });
                            window.sharedState.gameState = gameState;
                            // Popup moved to proxy handler for "attack1"
                        }
                    }
                }
                tempRaycaster = null;
            });
        }

        // window.sharedState = new Proxy(window.sharedState, {
        //     set(target, prop, value) {
        //         if (prop === "gameState") {
        //             if (value === "attack1") {
        //                 checkForWinner();
        //                 window.currentTurnIndex = 0;
        //                 console.log('The attack stage has been successfully reached...');
        //                 setTimeout(() => {
        //                     Object.values(connections).forEach(conn => {
        //                         if (conn.open) {
        //                             conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
        //                         }
        //                     });
        //                     currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
        //                     console.log(currentPlayerName);
        //                     showPlayerTurnPopup(currentPlayerName); // Show popup
        //                     window.dispatchEvent(new Event("startAttackPhase"));
        //                 }, 1500);
        //             }
        //             if (value === "deployment2") {
        //                 gameTurnCounter++; // Increment after each full attack round
        //                 if (window.gameSettings.gameType === "aiSepratists" && gameTurnCounter % 2 === 0 && peerId === Object.keys(window.playersObject)[0]) {
        //                     spawnZombieTerritories();
        //                 }
        //                 checkForWinner();
        //                 window.currentTurnIndex = 0;
        //                 console.log('The deployment stage has been reached...');
        //                 setTimeout(() => {
        //                     Object.values(connections).forEach(conn => {
        //                         if (conn.open) {
        //                             conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
        //                         }
        //                     });
        //                     currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
        //                     console.log(currentPlayerName);
        //                     showPlayerTurnPopup(currentPlayerName); // Show popup
        //                     window.dispatchEvent(new Event("startDeploymentPhase"));
        //                 }, 1500);
        //             }
        //         }
        //         target[prop] = value;
        //         return true;
        //     }
        // });

        // Proxy to manage changes to window.sharedState
        window.sharedState = new Proxy(window.sharedState, {
            set(target, prop, value) {
                // Handle game state changes
                if (prop === "gameState") {
                    // Transition to attack phase
                    if (value === "attack1") {
                        checkForWinner(); // Checkk for a winner before starting another attack round
                        window.currentTurnIndex = 0; // Reset current turn
                        console.log('Attack phase started...'); // Debugging
                        
                        setTimeout(() => {
                            // Sync players after a short delay
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
                                }
                            });
                            
                            // Show current player's turn and begin attack phase
                            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                            showPlayerTurnPopup(currentPlayerName);
                            window.dispatchEvent(new Event("startAttackPhase")); // Players are routed to the attack phase
                        }, 1500);
                    }
                    // Transition to deployment phase
                    if (value === "deployment2") {
                        gameTurnCounter++; // The counter is incremented after each full attack round
                        
                        // Spawn zombies in AI separatists game type every other turn
                        if (window.gameSettings.gameType === "aiSepratists" && gameTurnCounter % 2 === 0 && peerId === Object.keys(window.playersObject)[0]) {
                            spawnZombieTerritories();
                        }
                        
                        checkForWinner(); // Check for a winner before starting another attack round
                        window.currentTurnIndex = 0; // Reset current turn
                        console.log('Deployment phase started...'); // Debugging
                        
                        setTimeout(() => {
                            // Sync players after a short delay
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
                                }
                            });
                            
                            // Show current player's turn and begin deployment phase
                            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                            showPlayerTurnPopup(currentPlayerName);
                            window.dispatchEvent(new Event("startDeploymentPhase"));
                        }, 1500);
                    }
                }

                // Apply the property change
                target[prop] = value;
                return true;
            }
        });

        // Simple fetch of the json and storeage of the data
        fetch("county-adjacency.json")
            .then(response => response.json())
            .then(data => {
                adjacencyMap = data;
                console.log("Adjacency map loaded:", adjacencyMap); // Debugging to confirm loading
            })
            .catch(error => console.error("Error loading adjacency map:", error));

        

        window.addEventListener("startAttackPhase", () => {
            let currentPlayerId = playerIds[window.currentTurnIndex];
            if (peerId === currentPlayerId && currentPlayerId !== "zombie") {
                startPlayerAttackPhase();
            } else if (window.gameSettings.gameType === "aiSepratists" && currentPlayerId === "zombie" && peerId === Object.keys(window.playersObject)[0]) {
                zombieTurn();
            }
        });

        window.addEventListener("startDeploymentPhase", () => {
            let currentPlayerId = playerIds[window.currentTurnIndex];
            if (peerId === currentPlayerId && currentPlayerId !== "zombie") {
                startPlayerDeploymentPhase();
            } else if (window.gameSettings.gameType === "aiSepratists" && currentPlayerId === "zombie" && peerId === Object.keys(window.playersObject)[0]) {
                zombieTurn(); // Zombies gain troops and attack during their turn
            }
        });

        //-------------------------------------

        // function spawnZombieTerritories() {
        //     if (!window.playersObject["zombie"]) return; // Ensure zombie exists

        //     // Find player with most territories
        //     let strongestPlayer = Object.values(window.playersObject)
        //         .filter(p => p.name !== "aiSepratists")
        //         .reduce((max, player) => player.territories.length > max.territories.length ? player : max, { territories: [] });
            
        //     if (strongestPlayer.territories.length === 0) return; // No valid target

        //     // Get adjacent neutral territories
        //     let neutralTerritories = raycastObjs.filter(obj => 
        //         !Object.values(window.playersObject).some(p => p.territories.includes(obj.elementData.properties.county))
        //     ).map(obj => obj.elementData.properties.county);

        //     let zombie = window.playersObject["zombie"];
        //     let spawnCount = Math.min(2, neutralTerritories.length); // Spawn 2 territories if possible

        //     for (let i = 0; i < spawnCount; i++) {
        //         let targetTerritory = strongestPlayer.territories[Math.floor(Math.random() * strongestPlayer.territories.length)];
        //         let adjacent = adjacencyMap[targetTerritory] || [];
        //         let spawnTerritory = adjacent.find(t => neutralTerritories.includes(t));
                
        //         if (spawnTerritory) {
        //             zombie.territories.push(spawnTerritory);
        //             zombie.troops[spawnTerritory] = { infantry: 3, cavalry: 0, artillery: 0 }; // Start with 3 troops
        //             let shape = raycastObjs.find(obj => obj.elementData.properties.county === spawnTerritory);
        //             shape.material.color.set(0x00FF00);
        //             shape.elementData.shapeColour = 0x00FF00;
        //             updateTroopLabel(spawnTerritory, 3);
        //             neutralTerritories = neutralTerritories.filter(t => t !== spawnTerritory); // Remove from neutral pool
        //         }
        //     }

        //     syncGameState();
        //     updateLeaderboard();
        //     console.log("Zombies spawned adjacent to", strongestPlayer.name);
        // }

        function spawnZombieTerritories() {
            if (!window.playersObject["zombie"]) {
                console.error("Zombie player not initialized!");
                return;
            }

            let strongestPlayer = Object.values(window.playersObject)
                .filter(p => p.name !== "aiSepratists")
                .reduce((max, player) => player.territories.length > max.territories.length ? player : max, { territories: [] });
            
            if (strongestPlayer.territories.length === 0) {
                console.log("No valid target for zombie spawn");
                return;
            }

            let neutralTerritories = raycastObjs.filter(obj => 
                !Object.values(window.playersObject).some(p => p.territories.includes(obj.elementData.properties.county))
            ).map(obj => obj.elementData.properties.county);

            let zombie = window.playersObject["zombie"];
            let spawnCount = Math.min(2, neutralTerritories.length);
            console.log("Neutral territories available:", neutralTerritories);
            console.log("Spawning", spawnCount, "zombie territories");

            for (let i = 0; i < spawnCount; i++) {
                let targetTerritory = strongestPlayer.territories[Math.floor(Math.random() * strongestPlayer.territories.length)];
                let adjacent = adjacencyMap[targetTerritory] || [];
                let spawnTerritory = adjacent.find(t => neutralTerritories.includes(t));
                
                if (spawnTerritory) {
                    zombie.territories.push(spawnTerritory);
                    zombie.troops[spawnTerritory] = { infantry: 3, cavalry: 0, artillery: 0 };
                    let shape = raycastObjs.find(obj => obj.elementData.properties.county === spawnTerritory);
                    if (shape) {
                        shape.material.color.set(0x00FF00);
                        shape.elementData.shapeColour = 0x00FF00;
                        updateTroopLabel(spawnTerritory, 3);
                        console.log("Zombie spawned at", spawnTerritory);
                    } else {
                        console.error("Shape not found for", spawnTerritory);
                    }
                    neutralTerritories = neutralTerritories.filter(t => t !== spawnTerritory);
                } else {
                    console.log("No adjacent neutral territory found for", targetTerritory);
                }
            }

            if (zombie.territories.length > 0) {
                syncGameState();
                updateLeaderboard();
                // Trigger map update for all clients
                window.dispatchEvent(new Event("updateTerritoryColours"));
            } else {
                console.log("No zombie territories spawned this round");
            }
        }

        function zombieTurn() {
            let zombie = window.playersObject["zombie"];
            if (!zombie || zombie.territories.length === 0) return;

            // Gain troops like human players (minimum 3 or half territories)
            let troopsToDeploy = Math.max(3, Math.floor(zombie.territories.length / 2));
            for (let i = 0; i < troopsToDeploy; i++) {
                let territory = zombie.territories[Math.floor(Math.random() * zombie.territories.length)];
                zombie.troops[territory].infantry++;
                let totalTroops = zombie.troops[territory].infantry + zombie.troops[territory].cavalry + zombie.troops[territory].artillery;
                updateTroopLabel(territory, totalTroops);
            }
            console.log("Zombies gained troops");

            // Simple attack logic (unchanged)
            let fromTerritory = zombie.territories[Math.floor(Math.random() * zombie.territories.length)];
            let adjacent = adjacencyMap[fromTerritory] || [];
            let humanTarget = adjacent.find(t => {
                let owner = Object.keys(window.playersObject).find(id => 
                    window.playersObject[id].territories.includes(t) && id !== "zombie"
                );
                return owner !== undefined;
            });

            if (humanTarget) {
                let humanOwner = Object.keys(window.playersObject).find(id => 
                    window.playersObject[id].territories.includes(humanTarget) && id !== "zombie"
                );
                let zombieTroops = zombie.troops[fromTerritory].infantry + zombie.troops[fromTerritory].cavalry + zombie.troops[fromTerritory].artillery;

                if (zombieTroops > 1) {
                    let clickedObject = raycastObjs.find(obj => obj.elementData.properties.county === humanTarget);
                    processAttack(fromTerritory, humanTarget, clickedObject);
                    console.log("Zombie attacked", humanTarget);
                }
            }

            syncGameState();
            updateLeaderboard();
        }

        // function zombieTurn() {
        //     gameTurnCounter++;
        //     let zombie = window.playersObject["zombie"];

        //     // Spawn 1 troop per territory
        //     zombie.territories.forEach(territory => {
        //         zombie.troops[territory].infantry++;
        //         let totalTroops = zombie.troops[territory].infantry + zombie.troops[territory].cavalry + zombie.troops[territory].artillery;
        //         updateTroopLabel(territory, totalTroops);
        //     });
        //     console.log("AI Separatists spawned troops");

        //     // Simple AI attack logic
        //     let zombieTerritoryCount = zombie.territories.length;
        //     let fromTerritory = zombie.territories[Math.floor(Math.random() * zombieTerritoryCount)];
        //     let adjacent = adjacencyMap[fromTerritory] || [];
        //     let humanTarget = adjacent.find(t => {
        //         let owner = Object.keys(window.playersObject).find(id => 
        //             window.playersObject[id].territories.includes(t) && id !== "zombie"
        //         );
        //         return owner !== undefined;
        //     });

        //     if (humanTarget) {
        //         let humanOwner = Object.keys(window.playersObject).find(id => 
        //             window.playersObject[id].territories.includes(humanTarget) && id !== "zombie"
        //         );
        //         let humanTerritoryCount = window.playersObject[humanOwner].territories.length;
        //         let zombieTroops = zombie.troops[fromTerritory].infantry + zombie.troops[fromTerritory].cavalry + zombie.troops[fromTerritory].artillery;

        //         if (zombieTroops > 1) { // Need >1 to attack
        //             if (zombieTerritoryCount > humanTerritoryCount) {
        //                 // Attack if stronger
        //                 let clickedObject = raycastObjs.find(obj => obj.elementData.properties.county === humanTarget);
        //                 processAttack(fromTerritory, humanTarget, clickedObject);
        //                 console.log("AI attacked because it’s stronger");
        //             } else if (zombieTerritoryCount === humanTerritoryCount && Math.random() > 0.5) {
        //                 // 50% chance if equal
        //                 let clickedObject = raycastObjs.find(obj => obj.elementData.properties.county === humanTarget);
        //                 processAttack(fromTerritory, humanTarget, clickedObject);
        //                 console.log("AI attacked on a coin flip");
        //             } else if (zombieTerritoryCount < humanTerritoryCount && zombieTroops > 2) {
        //                 // Attack if desperate (extra troops)
        //                 let clickedObject = raycastObjs.find(obj => obj.elementData.properties.county === humanTarget);
        //                 processAttack(fromTerritory, humanTarget, clickedObject);
        //                 console.log("AI attacked out of desperation");
        //             }
        //         }
        //     }
        // }

        // Function adds the event listener for attack
        function startPlayerAttackPhase() {
            let currentPlayerId = playerIds[window.currentTurnIndex];
            if (peerId === currentPlayerId) {
                addEndAttackButton();
                window.addEventListener("click", handleAttackClick);
            }
        }

        function handleAttackClick(event) {
            let tempRaycaster = new THREE.Raycaster();
            let tempMouse = new THREE.Vector2();
        
            tempMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            tempMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            tempRaycaster.setFromCamera(tempMouse, camera);
        
            let intersects = tempRaycaster.intersectObjects(raycastObjs);
        
            if (intersects.length > 0) {
                let clickedObject = intersects[0].object;
                let territoryName = clickedObject.elementData.properties.county;
                let currentPlayerId = playerIds[window.currentTurnIndex];
                let playerTerritories = window.playersObject[peerId].territories;
        
                if (peerId !== currentPlayerId) return; // Only current player can attack
        
                if (!selectedFromTerritory) {
                    // First click selects "from" territory
                    if (playerTerritories.includes(territoryName)) {
                        let troops = window.playersObject[peerId].troops[territoryName];
                        let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
                        if (totalTroops > 1) { // Need >1 troop to attack
                            selectedFromTerritory = territoryName;
                            console.log(`Selected attack from: ${territoryName}`);
                            clickedObject.material.color.set(0xFF7F00); // Highlights territory red
                            // document.querySelector(".actionPanel").style.visibility = "hidden"; // Hide panel
                        } else {
                            alert("You need more than 1 troop to attack from this territory!");
                        }
                    } else {
                        alert("Select a territory you own to attack from!");
                    }
                } else {
                    // Second click selects "to" territory
                    let isAdjacent = adjacencyMap[selectedFromTerritory]?.includes(territoryName);
                    // Check if both "from" and "to" are coastal
                    let isFromCoastal = coastalCounties.includes(selectedFromTerritory);
                    let isToCoastal = coastalCounties.includes(territoryName);
                    let canSail = isFromCoastal && isToCoastal;
        
                    if ((isAdjacent || canSail) && !playerTerritories.includes(territoryName)) {
                        console.log(`Selected attack to: ${territoryName}`);
                        clickedObject.material.color.set(0xFF0000); // Red for target
                        document.querySelector(".actionPanel").style.visibility = "visible"; // Show panel
                        setupActionPanel(selectedFromTerritory, territoryName, clickedObject, isAdjacent, canSail);
                    } else {
                        // if (!isAdjacent && !canSail) alert("You can only attack adjacent or coastal territories if both are coastal!");
                        if (playerTerritories.includes(territoryName)) alert("You can’t attack your own territory!");
                        selectedFromTerritory = null; // Reset on invalid click
                        clickedObject.material.color.set(clickedObject.elementData.shapeColor);
                    }
                }
            }
        }
        
        function setupActionPanel(fromTerritory, toTerritory, toObject, isAdjacent, canSail) {
            const actionPanel = document.querySelector(".actionPanel");

            const attackButton = document.getElementById("attackButton");
            const sailButton = document.getElementById("sailButton");
        
            if (isAdjacent) {
                attackButton.onclick = () => {
                    processAttack(fromTerritory, toTerritory, toObject);
                    // actionPanel.style.visibility = "hidden";
                    selectedFromTerritory = null;
                    toObject.material.color.set(toObject.elementData.shapeColor);
                };
                sailButton.onclick = () => {
                    return;
                };
            }
        
            if (canSail) {
                sailButton.onclick = () => {
                    sailTroops(fromTerritory, toTerritory, toObject);
                    actionPanel.style.visibility = "hidden";
                };

            }
        }

        function sailTroops(fromTerritory, toTerritory, toObject) {
            // Create the ship with an image
            const ship = document.createElement("div");
            ship.style.position = "absolute";
            ship.style.width = "64px";
            ship.style.height = "64px";
            ship.style.backgroundImage = "url('ship.png')"; // ship image
            ship.style.backgroundSize = "contain"; // Fit the image
            ship.style.left = "35%"; // Start at fixed spot
            ship.style.top = "50%";
            ship.style.zIndex = "1001";
            document.body.appendChild(ship);
        
            // Move the ship across the screen
            let steps = 0;
            const totalSteps = 40; // More steps for smoothness
            const moveShip = setInterval(() => {
                steps++;
                ship.style.left = (parseInt(ship.style.left) + 1) + "%"; // Move right 1% per step
                if (steps >= totalSteps) {
                    clearInterval(moveShip);
                    document.body.removeChild(ship);
                    processAttack(fromTerritory, toTerritory, toObject);
                    selectedFromTerritory = null;
                    toObject.material.color.set(toObject.elementData.shapeColor);
                }
            }, 25); // 25ms per step
        }

        function processAttack(attackingTerritory, territoryName, clickedObject) {
            console.log(`Attacking ${territoryName} from ${attackingTerritory}!`);
            
            const defendingPlayerId = Object.keys(window.playersObject).find(id =>
                window.playersObject[id].territories.includes(territoryName)
            );
            
            if (!defendingPlayerId) {
                console.log("Error finding defender!");

                let attackerTroops = window.playersObject[peerId].troops[attackingTerritory];
                let attackingTotal = attackerTroops.infantry + attackerTroops.cavalry + attackerTroops.artillery;

                if (attackingTotal <= 1) {
                    alert("You need at least 2 troops to move!");
                    return;
                }

                console.log(`${territoryName} conquered!`);
                
                switchTerritoryOwnership(peerId, defendingPlayerId, attackingTerritory, territoryName, clickedObject);
                showTroopTransferSlider(attackingTerritory, territoryName, attackingTotal);
                syncGameState();

                // Send leaderboard update to all connected players
                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({
                            type: "updateLeaderboard",
                            playersObject: window.playersObject
                        });
                    }
                });
                
                updateLeaderboard(); // ERROR : DIDNT SYNC HERE DO PLAYERS DIDNT RECIEVETHE UPDATE FOR EMPTY TERRITORY ATTACKS
                return;
            }
            
            let attackerTroops = window.playersObject[peerId].troops[attackingTerritory];
            let defenderTroops = window.playersObject[defendingPlayerId].troops[territoryName];
            
            let attackingTotal = attackerTroops.infantry + attackerTroops.cavalry + attackerTroops.artillery;
            let defendingTotal = defenderTroops.infantry + defenderTroops.cavalry + defenderTroops.artillery;
            
            if (attackingTotal <= 1) {
                alert("You need at least 2 troops to attack!");
                return;
            }
            
            const attackerDice = diceRoll(Math.min(3, attackingTotal - 1));
            const defenderDice = diceRoll(Math.min(2, defendingTotal));
            
            console.log(`Attacker rolls: ${attackerDice}, Defender rolls: ${defenderDice}`);
            
            for (let i = 0; i < Math.min(attackerDice.length, defenderDice.length); i++) {
                if (attackerDice[i] > defenderDice[i]) {
                    defendingTotal--;
                } else {
                    attackingTotal--;
                }
            }

            // Show dice animation
            showDiceRoll(attackerDice, defenderDice, peerId, defendingPlayerId);
            
            console.log(`Before update: defendingTotal=${defendingTotal}, defenderTroops=${JSON.stringify(defenderTroops)}`); // Debugging
            updateTroops(attackerTroops, attackingTotal);
            updateTroops(defenderTroops, defendingTotal);
            console.log(`After update: defendingTotal=${defendingTotal}, defenderTroops=${JSON.stringify(defenderTroops)}`); // Debugging
            
            updateTroopLabel(attackingTerritory, attackingTotal);
            updateTroopLabel(territoryName, defendingTotal);
            
            if (defendingTotal <= 0) {
                console.log(`${territoryName} conquered!`);
                switchTerritoryOwnership(peerId, defendingPlayerId, attackingTerritory, territoryName, clickedObject);
                showTroopTransferSlider(attackingTerritory, territoryName, attackingTotal);
            }
            
            syncGameState();
            
            // Send leaderboard update to all connected players
            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({
                        type: "updateLeaderboard",
                        playersObject: window.playersObject
                    });
                }
            });
            
            updateLeaderboard();

        }

        function showDiceRoll(attackerRolls, defenderRolls, attackerId, defenderId) {
            diceDisplay.innerHTML = '';
            diceDisplay.style.display = 'block';

            var dice = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

            console.log(attackerRolls);
            console.log(defenderRolls);

            // Attacker dice
            const attackerDiv = document.createElement('div');
            attackerDiv.textContent = `${window.playersObject[attackerId].name} rolls: `;
            attackerRolls.forEach(roll => {
                const diceSpanAttack = document.createElement('span');
                diceSpanAttack.style.fontSize = '64px';
                diceSpanAttack.textContent = `${dice[roll-1]}`;
                attackerDiv.appendChild(diceSpanAttack);
            });
            diceDisplay.appendChild(attackerDiv);

            // Defender dice
            const defenderDiv = document.createElement('div');
            defenderDiv.textContent = `${window.playersObject[defenderId].name} rolls: `;
            defenderRolls.forEach(roll => {
                const diceSpanDefend = document.createElement('span');
                diceSpanDefend.style.fontSize = '64px';
                diceSpanDefend.textContent = `${dice[roll-1]}`;
                defenderDiv.appendChild(diceSpanDefend);
            });
            diceDisplay.appendChild(defenderDiv);

            // Winner text
            // const resultDiv = document.createElement('div');
            // let battles = Math.min(attackerRolls.length, defenderRolls.length);
            // let attackerWins = 0;
            // for (let i = 0; i < battles; i++) {
            //     if (attackerRolls[i] > defenderRolls[i]) attackerWins++;
            // }
            // resultDiv.textContent = attackerWins > battles / 2 ? `${window.playersObject[attackerId].name} wins!` : `${window.playersObject[defenderId].name} defends!`;
            // diceDisplay.appendChild(resultDiv);

            // Clear after 1 sec
            setTimeout(() => {
                diceDisplay.style.display = 'none';
            }, 1500);
        }

        function addEndAttackButton() {
            let endButton = document.getElementById('endAttackButton');
            if (!endButton) {
                endButton = document.createElement('div');
                endButton.id = 'endAttackButton';
                endButton.textContent = 'End Attack Phase';
                endButton.style.position = 'absolute';
                endButton.style.backgroundColor = '#8b4513';
                endButton.style.border = '5px';
                endButton.style.color = 'white';
                endButton.style.opacity = '0.8';
                endButton.style.bottom = '11%';
                endButton.style.left = '50%';
                endButton.style.transform = 'translateX(-50%)';
                endButton.style.padding = '10px 20px';
                endButton.style.zIndex = '1000';
                endButton.style.userSelect = 'none';
                document.body.appendChild(endButton);
            }
            endButton.style.display = 'block'; // Show button at start of each attack round

            endButton.onclick = () => {
                console.log("Ending attack phase for player", playerIds[window.currentTurnIndex]);
                endButton.style.display = 'none'; // Hide end attack button
                window.removeEventListener('click', handleAttackClick); // Remove attack listener

                selectedFromTerritory = null; // Reset on phase end
                document.querySelector(".actionPanel").style.visibility = "hidden";

                checkForWinner();

                window.currentTurnIndex++; // Move to next player

                if (window.currentTurnIndex >= playerIds.length) {
                    console.log("All players have finished attacking. Moving to deployment phase...");
                    // NEXT PHASE TRANSITION BELOW
                    window.currentTurnIndex = 0; // Reset for next round
                    window.sharedState.gameState = "deployment2"; // Transition to deployment
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "syncGameState", gameState: "deployment2" });
                        }
                    });
                    return; // Ensures no players are stuck in the if loop
                }

                // Sync all final changes to playersObject for reassurance and display the next player popup for all other players
                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({ 
                            type: "syncPlayersObject", 
                            currentTurnIndex: window.currentTurnIndex, 
                            playersObject: window.playersObject, 
                            territoryChanges: true 
                        });
                    }
                });

                // Display the next player popup for the current player
                let currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                console.log("Next Player:", currentPlayerName);
                showPlayerTurnPopup(currentPlayerName);
                startPlayerAttackPhase(); // Start attack phase for the next player
            };
        }

        function startPlayerDeploymentPhase() {
            let currentPlayerId = playerIds[window.currentTurnIndex];
            if (peerId === currentPlayerId) {
                let player = window.playersObject[peerId];
                let troopsToDeploy = Math.max(3, Math.floor(player.territories.length / 2));
                console.log(`${player.name} has ${troopsToDeploy} troops to deploy`);
                addEndDeploymentButton(troopsToDeploy);
            }
        }

        function handleDeploymentClick(troopsToDeploy) {
            let remainingTroops = troopsToDeploy;
            let selectedTerritory = null;
            let reinforcementMode = false;

            function deploymentHandler(event) {
                let tempRaycaster = new THREE.Raycaster();
                let tempMouse = new THREE.Vector2();

                tempMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                tempMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                tempRaycaster.setFromCamera(tempMouse, camera);

                let intersects = tempRaycaster.intersectObjects(raycastObjs);

                if (intersects.length > 0) {
                    let clickedObject = intersects[0].object;
                    let territoryName = clickedObject.elementData.properties.county;
                    let currentPlayerId = playerIds[window.currentTurnIndex];
                    let playerTerritories = window.playersObject[peerId].territories;

                    if (peerId !== currentPlayerId) return;

                    if (!playerTerritories.includes(territoryName)) {
                        alert("You can only deploy to or move between your own territories!");
                        return;
                    }

                    if (remainingTroops > 0) {
                        // Deployment phase
                        let troops = window.playersObject[peerId].troops[territoryName];
                        troops.infantry++;
                        let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
                        updateTroopLabel(territoryName, totalTroops);
                        remainingTroops--;
                        console.log(`Deployed 1 troop to ${territoryName}, Remaining: ${remainingTroops}`);
                        syncGameState();

                        let endButton = document.getElementById('endDeploymentButton');
                        endButton.textContent = `End Deployment (${remainingTroops} troops left)`;

                        if (remainingTroops === 0 && !reinforcementMode) {
                            reinforcementMode = true;
                            alert("All troops deployed. Now move troops between your adjacent territories. Click a territory to select it, then an adjacent one to move troops to. Click 'End Deployment' to finish.");
                        }
                    } else if (reinforcementMode) {
                        // Reinforcement phase
                        if (!selectedTerritory) {
                            let troops = window.playersObject[peerId].troops[territoryName];
                            let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
                            if (totalTroops > 1) {
                                selectedTerritory = territoryName;
                                console.log(`Selected ${territoryName} to move troops from`);
                            } else {
                                alert("This territory needs at least 1 troop to stay!");
                            }
                        } else {
                            let fromTerritory = selectedTerritory;
                            // let isAdjacent = adjacencyMap[fromTerritory]?.includes(territoryName);
                            let isOwned = window.playersObject[currentPlayerId].territories?.includes(territoryName);
                            let ownedTerritories = indow.playersObject[currentPlayerId].territories;
                            if (isOwned) {
                                window.playersObject[currentPlayerId].territories.forEach((territory) => {
                                    let isAdjacent = adjacencyMap[territory]?.includes(territoryName);
                                    if (!isAdjacent) {
                                        for (let index = 0; index < adjacencyMap.length; index++) {
                                            let isConnected = adjacencyMap[territory+i]?.includes(territoryName);
                                        }
                                    }
                                })
                            }
                            if ((isAdjacent || isConnected) && fromTerritory !== territoryName) {
                                let fromTroops = window.playersObject[peerId].troops[fromTerritory];
                                let maxTroops = fromTroops.infantry + fromTroops.cavalry + fromTroops.artillery - 1;
                                showReinforcementSlider(fromTerritory, territoryName, maxTroops, () => {
                                    selectedTerritory = null;
                                    reinforcementMode = false; // End reinforcement after move
                                });
                            } else {
                                alert("You can only move to an adjacent territory you own!");
                                selectedTerritory = null;
                            }
                        }
                    }
                }
            }

            // Add and store the handler
            window.addEventListener("click", deploymentHandler);
            return deploymentHandler; // Return for removal
        }

        function showReinforcementSlider(fromTerritory, toTerritory, maxTroops) { //onComplete
            let existingSlider = document.getElementById('reinforcementSlider');
            if (existingSlider) existingSlider.remove();

            const sliderDiv = document.createElement('div');
            sliderDiv.id = 'troopTransferSlider';
            sliderDiv.style.position = 'absolute';
            sliderDiv.style.top = '50%';
            sliderDiv.style.left = '50%';
            sliderDiv.style.transform = 'translate(-50%, -50%)';
            sliderDiv.style.background = '#fff';
            sliderDiv.style.padding = '20px';
            sliderDiv.style.border = '2px solid #000';
            sliderDiv.style.zIndex = '1000';
            sliderDiv.pointerEvents = 'none';

            const label = document.createElement('p');
            label.textContent = `Move troops from ${fromTerritory} to ${toTerritory} (1-${maxTroops}):`;
            sliderDiv.appendChild(label);
        
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 1; // Leave at least 1 troop behind
            slider.max = maxTroops - 1; // Max troops to transfer
            slider.value = 1; // Default to 1
            sliderDiv.appendChild(slider);
          
            // container.prepend(slider); // Add slider to container
            // https://stackoverflow.com/questions/58545444/dynamically-add-input-slider-with-value
            const output = document.createElement("span");
            output.id = "demo";
            output.innerHTML = slider.value;
          
            const sliderValueText = document.createElement("p");
            sliderValueText.innerHTML = "Value: ";
            sliderValueText.appendChild(output);
          
            sliderDiv.appendChild(sliderValueText); // Add the paragraph with the span
          
            slider.oninput = function() {
              output.innerHTML = this.value;
            };

            const moveButton = document.createElement('button');
            moveButton.textContent = 'Move Troops';
            moveButton.onclick = () => {
                const troopsToMove = parseInt(slider.value);
                let fromTroops = window.playersObject[peerId].troops[fromTerritory];
                let toTroops = window.playersObject[peerId].troops[toTerritory];
                let moved = 0;

                while (moved < troopsToMove && (fromTroops.infantry + fromTroops.cavalry + fromTroops.artillery) > 1) {
                    if (fromTroops.infantry > 0) {
                        fromTroops.infantry--; // Decrement the troops for the territory troops are coming from
                        toTroops.infantry++; // Increment the troops for the territory troops are going to
                        moved++;
                    } else if (fromTroops.cavalry > 0) { //  // 'else ifs' are used so that only one type of troop is reduced and increased at one time otherwise all can decrease at the same time
                        fromTroops.cavalry--;
                        toTroops.cavalry++;
                        moved++;
                    } else if (fromTroops.artillery > 0) {
                        fromTroops.artillery--;
                        toTroops.artillery++;
                        moved++;
                    }
                }

                let fromTotal = fromTroops.infantry + fromTroops.cavalry + fromTroops.artillery;
                let toTotal = toTroops.infantry + toTroops.cavalry + toTroops.artillery;
                updateTroopLabel(fromTerritory, fromTotal);
                updateTroopLabel(toTerritory, toTotal);
                console.log(`Moved ${troopsToMove} troops from ${fromTerritory} to ${toTerritory}`); // Debugging
                syncGameState();
                sliderDiv.remove();
                // onComplete(); // Call callback to reset reinforcement state
                checkForWinner(); //qwer
            };
            sliderDiv.appendChild(moveButton);

            document.body.appendChild(sliderDiv);
        }

        function addEndDeploymentButton(troopsToDeploy) {
            let endButton = document.getElementById('endDeploymentButton');
            if (!endButton) {
                endButton = document.createElement('div');
                endButton.id = 'endDeploymentButton';
                endButton.style.position = 'absolute';
                endButton.style.backgroundColor = '#8b4513';
                endButton.style.border = '5px';
                endButton.style.opacity = '0.8';
                endButton.style.bottom = '11%';
                endButton.style.left = '50%';
                endButton.style.transform = 'translateX(-50%)';
                endButton.style.padding = '10px 20px';
                endButton.style.zIndex = '1000';
                endButton.style.userSelect = 'none';
                document.body.appendChild(endButton);
            }
            endButton.textContent = `End Deployment (${troopsToDeploy} troops left)`;
            endButton.style.display = 'block';

            const deploymentHandler = handleDeploymentClick(troopsToDeploy); // Store the handler

            endButton.onclick = () => {
                console.log("Ending deployment phase for player : ", playerIds[window.currentTurnIndex]);
                endButton.style.display = 'none';
                window.removeEventListener('click', deploymentHandler); // Use stored reference

                window.currentTurnIndex++;
                if (window.currentTurnIndex >= playerIds.length) {
                    console.log("All players have finished deployment. Returning to attack phase...");
                    window.currentTurnIndex = 0;
                    window.sharedState.gameState = "attack1";
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "syncGameState", gameState: "attack1" });
                        }
                    });
                    return;
                }

                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({ 
                            type: "syncPlayersObject", 
                            currentTurnIndex: window.currentTurnIndex, 
                            playersObject: window.playersObject, 
                            territoryChanges: true
                        });
                    }
                });

                let currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                console.log("Next Player:", currentPlayerName);
                showPlayerTurnPopup(currentPlayerName);
                startPlayerDeploymentPhase();
            };
        }

        //------------------------------

        // Function to check for a winner
        function checkForWinner() {
            // let totalTerritories = raycastObjs.length; // Total number of territories on the map
            for (let playerId in window.playersObject) {
                let players = window.playersObject;
                let remainingPlayers = Object.values(players).filter(player => player.territories.length > 0);

                if (window.playersObject[playerId].territories.length === 0) {
                    // Add eliminated to rankings
                    eliminatedPlayers.unshift({
                        name: window.playersObject[playerId].name
                    });

                    if (window.playersObject[playerId].playerLost === false) {
                        // Send message to the eliminated player and download the stats file
                        if (connections[playerId] && connections[playerId].open) {
                            console.log('its sending ... '); // Debugging
                            connections[playerId].send({ type: "playerLost" }); // playerId, finalTerritories 
                        }
                    }
                    
                    // Remove the player from `playersObject`
                    delete window.playersObject[playerId];
                    delete playerIds[playerId];
                    console.log(playerIds);

                    console.log(window.currentTurnIndex);

                    updatePlayerIdsObject();

                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({
                                type: "syncPlayersObject",
                                playersObject: window.playersObject,
                                playerIds
                            });
                        }
                    });

                    setTimeout(() => {
                        Object.values(connections).forEach(conn => {
                            if (conn.open) {
                                conn.send({ 
                                    type: "syncPlayersObject",
                                    currentTurnIndex: window.currentTurnIndex
                                });
                            }
                        });
                    }, 200);

                    console.log(window.currentTurnIndex);

                    return;
                }

                if (remainingPlayers.length === 1) {
                    let winner = remainingPlayers[0];
                    
                    // Add winner to ranking
                    eliminatedPlayers.unshift({ name: winner.name });
            
                    // Notify all players about the game ending
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "gameOver", winner: winner.name, territories: winner.territories.length, rankings: eliminatedPlayers }); //rankings: eliminatedPlayers
                        }
                    });

                    // window.location.href = `endScreen.html?winner=${encodeURIComponent(winner.name)}&data=${encodeURIComponent(JSON.stringify(window.playersObject))}`;
                    window.location.href = `endScreen.html?winner=${encodeURIComponent(winner.name)}&territories=${encodeURIComponent(winner.territories.length)}&rankings=${encodeURIComponent(JSON.stringify(eliminatedPlayers))}`;
            
                    return;
                }
            }
            return null; // No winner returns null so nothing happens
        }

        // The following are helper functions...

        // Roll the dice and return array
        function diceRoll(numDice) {
            const rolls = [];
            for (let i = 0; i < Math.min(numDice, 3); i++) { // Max 3 for attacker, 2 for defender
                rolls.push(Math.floor(Math.random() * 6) + 1); // 1-6
            }
            return rolls.sort((a, b) => b - a); // Sort descending using built-in sort function
        }

        // Function to update troop counts in proportion to the changes made
        function updateTroops(troops, newTotal) {
            const currentTotal = troops.infantry + troops.cavalry + troops.artillery;
            if (currentTotal === 0 || newTotal < 0) return;
        
            // This sets the troops to 0 if conquered
            if (newTotal === 0) {
                troops.infantry = 0;
                troops.cavalry = 0;
                troops.artillery = 0;
                return;
            }
        
            // Removes troops iteratively based on the newTotal from the attack (if not conquered)
            let troopsToRemove = currentTotal - newTotal;
            while (troopsToRemove > 0) {
                if (troops.infantry > 0) {
                    troops.infantry--;
                } else if (troops.cavalry > 0) { // 'else ifs' are used so that only one type of troop is reduced at one time otherwise all can decrease at the same time
                    troops.cavalry--;
                } else if (troops.artillery > 0) {
                    troops.artillery--;
                }
                troopsToRemove--;
            }
        }
        
        // Helper function to update territory label
        function updateTroopLabel(territoryName, troopCount) {
            let labelId = territoryName.replace(/\s+/g, '_');
            const territoryElement = document.getElementById(labelId);
            if (territoryElement) {
                territoryElement.textContent = troopCount;
            } else {
                console.log(`Cannot find label for ${territoryName}`);
            }
            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({ 
                        type: "syncLabels", 
                        // playersObject: window.playersObject,
                        labelId,
                        troopCount
                    });
                }
            });
        }
        
        // Helper function to switch territory ownership
        function switchTerritoryOwnership(attackerId, defenderId, attackingTerritory, conqueredTerritory, clickedObject) {
            if (!defenderId) {
                let attacker = window.playersObject[attackerId];
                attacker.territories.push(conqueredTerritory);
                attacker.troops[conqueredTerritory] = { infantry: 0, cavalry: 0, artillery: 0 }; // Initialize empty
                clickedObject.material.color.set(attacker.colour);
                clickedObject.elementData.shapeColour = attacker.colour;

                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({ 
                            type: "syncPlayersObject", 
                            playersObject: window.playersObject
                        });
                    }
                });

                return;
            }

            // Remove from defender
            let defender = window.playersObject[defenderId];
            defender.territories = defender.territories.filter(t => t !== conqueredTerritory);
            delete defender.troops[conqueredTerritory]; // ERROR : Cant use the filter on an object only an array, so it didnt filter for me
        
            // Add to attacker
            let attacker = window.playersObject[attackerId];
            attacker.territories.push(conqueredTerritory);
            attacker.troops[conqueredTerritory] = { infantry: 0, cavalry: 0, artillery: 0 }; // Initialize empty
            clickedObject.material.color.set(attacker.colour);
            clickedObject.elementData.shapeColour = attacker.colour;

            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({ 
                        type: "syncPlayersObject", 
                        playersObject: window.playersObject
                    });
                }
            });
        }
        
        // Helper function to show troop transfer slider
        function showTroopTransferSlider(attackingTerritory, conqueredTerritory, maxTroops) {
            // Remove any existing slider
            let existingSlider = document.getElementById('troopTransferSlider');
            if (existingSlider) existingSlider.remove();
        
            // Create slider UI
            const sliderDiv = document.createElement('div');
            sliderDiv.id = 'troopTransferSlider';
            sliderDiv.style.position = 'absolute';
            sliderDiv.style.top = '50%';
            sliderDiv.style.left = '50%';
            sliderDiv.style.transform = 'translate(-50%, -50%)';
            sliderDiv.style.background = '#fff';
            sliderDiv.style.padding = '20px';
            sliderDiv.style.border = '2px solid #000';
            sliderDiv.style.zIndex = '1000';
            sliderDiv.pointerEvents = 'none'; // ERROR : forgot to prohibit pointer events so players were also selecting territories while selecting the troops to transfer
        
            const label = document.createElement('p');
            label.textContent = `Transfer troops to ${conqueredTerritory} (1-${maxTroops - 1}):`;
            sliderDiv.appendChild(label);
        
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = 1; // Leaves at least 1 troop behind
            slider.max = maxTroops - 1; // Max troops to transfer
            slider.value = 1; // Default to 1 for value use in sliderValueText
            sliderDiv.appendChild(slider);
          
            // container.prepend(slider); // Add slider to container
            // https://stackoverflow.com/questions/58545444/dynamically-add-input-slider-with-value
            const output = document.createElement("span");
            output.id = "demo";
            output.innerHTML = slider.value;
          
            const sliderValueText = document.createElement("p");
            sliderValueText.innerHTML = "Value: ";
            sliderValueText.appendChild(output);
          
            sliderDiv.appendChild(sliderValueText); // Add the paragraph with the span
          
            slider.oninput = function() {
              output.innerHTML = this.value;
            };
        
            const moveButton = document.createElement('button');
            moveButton.textContent = 'Move Troops';
            moveButton.onclick = () => {
                const troopsToTransfer = parseInt(slider.value); // ERROR : I had to look this up because I could not get the output value to be parsed into a function as I thought I could just use the .value without the parseInt
                transferTroops(attackingTerritory, conqueredTerritory, troopsToTransfer);
                sliderDiv.remove();
                document.querySelector(".actionPanel").style.visibility = "hidden"; // ERROR FIX
            };
            sliderDiv.appendChild(moveButton);
        
            document.body.appendChild(sliderDiv);
        }
        
        // Helper function to transfer troops
        function transferTroops(attackingTerritory, conqueredTerritory, amount) {
            let attackerTroops = window.playersObject[peerId].troops[attackingTerritory];
            let conqueredTroops = window.playersObject[peerId].troops[conqueredTerritory];
            let attackingTotal = attackerTroops.infantry + attackerTroops.cavalry + attackerTroops.artillery;
        
            if (amount >= attackingTotal) amount = attackingTotal - 1; // Ensure 1 troop remains
        
            // Simple transfer: move infantry first, then cavalry, then artillery
            let transferred = 0;
            while (transferred < amount && attackingTotal > 1) {
                if (attackerTroops.infantry > 0) {
                    attackerTroops.infantry--;
                    conqueredTroops.infantry++;
                    transferred++;
                } else if (attackerTroops.cavalry > 0) {
                    attackerTroops.cavalry--;
                    conqueredTroops.cavalry++;
                    transferred++;
                } else if (attackerTroops.artillery > 0) {
                    attackerTroops.artillery--;
                    conqueredTroops.artillery++;
                    transferred++;
                }
            }
        
            updateTroopLabel(attackingTerritory, attackingTotal - amount);
            updateTroopLabel(conqueredTerritory, amount);
            syncGameState();
        }

        // Function to sync game state with all players. It cleans up the
        
        // Syncs the playersObject with all other players
        function syncGameState() {
            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({
                        type: "syncPlayersObject",
                        playersObject: window.playersObject,
                        territoryChanges: true
                    });
                }
            });
        }

        // Simple adjustment of window size for renderers and cameras
        window.addEventListener("resize", onWindowResize, false);
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            labelRenderer.setSize(window.innerWidth, window.innerHeight); // update the label renderer size with the window
        }
    }
};

init();
animate();

load_init_game = new initGame();
load_init_game.playerSetup();
