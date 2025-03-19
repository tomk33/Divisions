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

let leaderboardList = [];

function updatePlayerIdsObject() {
    playerIds = Object.keys(window.playersObject);
}
window.currentTurnIndex = 0; // Start with the first player

// ---------------------------------------------------------------------------------------------------------------------------------

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


            // South Africa z fighting with hole rendering
            // if (country.properties.NAME === "Lesotho") {
            //     shape.position.z = 0.1;
            //     line.position.z = 0.1;
            // }

            // if (country.properties.NAME === "Kansas") {
            //     // For finding the centre of the US for camera position
            //     shape.geometry.computeBoundingBox();
            //     let position = shape.geometry.boundingBox;
            //     console.log(position);
            // }

            // if (country.properties.NAME === "France") {
            //     shape.position.z = 20000;
            //     line.position.z = 20000;
            // }

            // if (country.properties.NAME === "United Kingdom") {
            //     shape.position.x = -61.8;
            //     shape.position.y = -23;
            //     line.position.x = -61.8;
            //     line.position.y = -23;
            // }

            // if (country.properties.NAME === "Ireland") {
            //     shape.position.x = -61.8;
            //     shape.position.y = -23;
            //     line.position.x = -61.8;
            //     line.position.y = -23;
            // }

            // scene.add(shape);
            // scene1.add(line);
            // labelScene.add(scene); // Add label to labelScene for efficiency
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
    console.log('showing it now..........');
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

    troopTotalInit: function(peerSent) {
        // read this for specialised prototypes,  https://stackoverflow.com/questions/560829/calling-method-using-javascript-prototype
    },

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

        // // Add live leaderboard
        // const leaderboard = document.createElement('div');
        // leaderboard.id = 'leaderboard';
        // leaderboard.style.position = 'fixed';
        // leaderboard.style.top = '10px';
        // leaderboard.style.left = '10px';
        // leaderboard.style.backgroundColor = 'black';
        // leaderboard.style.color = 'white';
        // leaderboard.style.padding = '5px';
        // leaderboard.style.zIndex = '1000';
        // leaderboard.style.zIndex = '1000';
        // leaderboard.pointerEvents = 'none';
        // leaderboard.innerHTML = 'Leaderboard:<br>'; // Adds title 'leaderboard'
        // document.body.appendChild(leaderboard);

        // // Initialize leaderboard with player names
        // function initializeLeaderboard() {
        //     leaderboard.innerHTML = '<strong>Leaderboard:</strong><br>'; // Set title in bold for leaderboard

        //     for (let eachPlayersId in window.playersObject) {
        //         let player = window.playersObject[eachPlayersId];
        //         leaderboard.innerHTML += `
        //             <span>${player.name}: 
        //                 <span id="${player.name}_territories">${player.territories.length}</span> territories
        //             </span><br>`;
        //     }
        // }

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
        leaderboard.style.fontSize = '16px';
        leaderboard.style.zIndex = '1000';
        leaderboard.style.pointerEvents = 'none';
        leaderboard.innerHTML = '<strong>Leaderboard:</strong><br>'; // Adds title in bold

        document.body.appendChild(leaderboard);

        // Initialize leaderboard with player names
        function initializeLeaderboard() {
            leaderboard.innerHTML = '<strong>Leaderboard:</strong><br>'; // Set title in bold

            for (let eachPlayersId in window.playersObject) {
                let player = window.playersObject[eachPlayersId];
                leaderboard.innerHTML += `
                    <span style="display: block; padding: 2px; color: #8b4513;">${player.name}: 
                        <span id="${player.name}_territories" style="font-weight: bold;">${player.territories.length}</span> territories
                    </span>`;
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

        // // Update leaderboard function
        // function updateLeaderboard() {
        //     for (let eachPlayersId in window.playersObject) {
        //         if (window.sharedState.gameState !== 'attack1' || 'deployment1'){
        //             let player = window.playersObject[eachPlayersId];
        //             leaderboard.innerHTML += `<span id="${player.name}_name">${player.name}</span>` + ': ' + `<span id="${player.name}_territories">${player.territories.length}</span>` + ' territories<br>';
        //         } 
                
        //         if (window.sharedState.gameState === 'attack1') { // window.playerIds.length
        //             let player = window.playersObject[eachPlayersId];
        //             leaderboardList.push({player: player.territories.length});
        //             console.log('LOOK... ', leaderboardList);
        //             const playerName = document.getElementById(`${player.name}_name`);
        //             if (playerName) {
        //                 const playerTerritoriesValue = document.getElementById(`${player.name}_territories`);
        //                 $(`#${player.name}_territories`).text(player.territories.length);
        //                 console.log('THIS HAPOPENED !!');
        //                 // playerTerritoriesValue.innerHTML = player.territories.length;
        //             }
        //             else {
        //                 console('plyerName: ', playerName, ' was not found, sorry');
        //             }
        //         }
        //     }
        // }

        // Update the playerIds object
        updatePlayerIdsObject();

        // Initialize leaderboard
        initializeLeaderboard();

        // Listen for the escape key press
        document.addEventListener("keydown", function(event) {
            if (event.key === "Escape") {
                toggleGameControls();
            }
        });
        
        function toggleGameControls() {
            // Creates the overlay
            // let overlay = document.createElement("div");
            // overlay.id = "controlsOverlay";
            // overlay.style.position = "fixed";
            // overlay.style.top = "0";
            // overlay.style.left = "0";
            // overlay.style.width = "100vw";
            // overlay.style.height = "100vh";
            // overlay.style.background = "rgba(92, 143, 255, 0.9)";
            // overlay.style.color = "white";
            // overlay.style.display = "flex";
            // overlay.style.flexDirection = "column";
            // overlay.style.justifyContent = "center";
            // overlay.style.alignItems = "center";
            // overlay.style.fontSize = "2rem";
            // overlay.style.zIndex = "3000";
            
            // // Adds title
            // let title = document.createElement("h1");
            // title.innerText = "Game Controls";
            // overlay.appendChild(title);
        
            // // Adds close button
            // let closeButton = document.createElement("button");
            // closeButton.innerText = "Back to Game";
            // closeButton.style.marginTop = "20px";
            // closeButton.style.padding = "10px 20px";
            // closeButton.style.fontSize = "1.5rem";

            // closeButton.onclick = function () {
            //     overlay.remove();
            // };

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
        
        // THIS DOESNT WORK YET SO DRAGGING IS THE SAME AS CLICKING
        // let startX, startY;
        // const delta = 6;

        // document.addEventListener('mousedown', function (event) {
        //     isDragging = false;
        //     startX = event.pageX;
        //     startY = event.pageY;
        // });

        // document.addEventListener('mouseup', function (event) {
        //     const diffX = Math.abs(event.pageX - startX);
        //     const diffY = Math.abs(event.pageY - startY);

        //     if (diffX < delta && diffY < delta) {
        //         isDragging = true;
        //     }
        // });

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

            // if (event.target.closest(".actionPanel") || 
            // event.target.closest("#endAttackButton") || 
            // event.target.closest("#troopTransferSlider") ||
            // event.target.closest("#reinforcementSlider")) ||
            // event.terget.closest("#controlsOverlay") {
            //     return; // Ignore clicks on UI elements
            // }


            // DOESNT WORK YET
            // // Only continue if mouse wasnt dragged
            // if (isDragging) {
            //     isDragging = false; // ERROR : I didnt reset for the next click
            //     return;
            // }

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

                window.addEventListener("contextmenu", (event) => {
                    event.preventDefault(); // Prevents the default right-click menu
                    document.querySelector(".territoryInfoPanel").style.visibility = "visible";
                });

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
        // setTimeout(updatePlayerIdsObject, 1000);

        setTimeout(() => {
            deploymentPhase();
        }, 2400);

        // Deployment phase starts here...
        function deploymentPhase() {
            // ERROR, POP REMOVES THE LAST ITEM IN THE LIST, IT DOESNT FIND THE ITEM AND REMOVE IT
            // chosenColour = pastelColours[Math.floor(Math.random() * pastelColours.length)];
            // pastelColours.pop(chosenColour);

            // Loops through the playersObject and assigns a different colour to each player
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
            let totalTroops = 50;
            let territoryDistribution = [];
            let remainingTroops = totalTroops;

            // Adjust for aiSepratists which will become AI sepratist mode
            if (window.gameSettings.gameType === "aiSepratists" && peerId === Object.keys(window.playersObject)[0]) { // The host handles the adding of the aiSepratists player for simplicity
                window.playersObject["zombie"] = {
                    name: "aiSepratists",
                    troops: {},
                    territories: [],
                    colour: 0x00FF00 // green, for now
                };
                updatePlayerIdsObject(); // Update playerIds with zombie
                i = (72 / Object.keys(window.playersObject).length) / 2; // ERROR: Need to recalculate i with zombie included
            }

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
                            if (window.gameSettings.gameType === "aiSepratists" && peerId === Object.keys(window.playersObject)[0]) {
                                let neutralTerritories = raycastObjs.filter(obj => 
                                    !Object.values(window.playersObject).some(p => p.territories.includes(obj.elementData.properties.county))
                                ).map(obj => obj.elementData.properties.county);
                                for (let j = 0; j < Math.min(5, neutralTerritories.length); j++) { // Start with 5 zombie territories
                                    let territory = neutralTerritories[j];
                                    window.playersObject["zombie"].territories.push(territory);
                                    window.playersObject["zombie"].troops[territory] = { infantry: 2, cavalry: 0, artillery: 0 };
                                    let shape = raycastObjs.find(obj => obj.elementData.properties.county === territory);
                                    shape.material.color.set(0x00FF00);
                                    shape.elementData.shapeColour = 0x00FF00;
                                    updateTroopLabel(territory, 2);
                                }
                            }

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

        window.sharedState = new Proxy(window.sharedState, {
            set(target, prop, value) {
                if (prop === "gameState") {
                    if (value === "attack1") {
                        window.currentTurnIndex = 0;
                        console.log('The attack stage has been successfully reached...');
                        setTimeout(() => {
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
                                }
                            });
                            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                            console.log(currentPlayerName);
                            showPlayerTurnPopup(currentPlayerName); // Show popup here
                            window.dispatchEvent(new Event("startAttackPhase"));
                        }, 1500);
                    }
                    if (value === "deployment2") {
                        window.currentTurnIndex = 0;
                        console.log('The deployment stage has been reached...');
                        setTimeout(() => {
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex] });
                                }
                            });
                            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                            console.log(currentPlayerName);
                            showPlayerTurnPopup(currentPlayerName); // Show popup here
                            window.dispatchEvent(new Event("startDeploymentPhase"));
                        }, 1500);
                    }
                }
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
            if (peerId === currentPlayerId) {
                // // Set winner object to winner
                // let winner = checkForWinner();

                // // Sends winning mesage to all players if someone has won
                // if (winner) {
                //     alert(`${winner.name}, has won the game!`);
                //     document.dispatchEvent(new Event("toggleEndGameScreen"));
                //     Object.values(connections).forEach(conn => {
                //         if (conn.open) {
                //             conn.send({ type: "gameOver", winner: winner.name });
                //         }
                //     });
                //     return;
                // }

                startPlayerAttackPhase();
            }
            if (window.gameSettings.gameType === "aiSepratists" && currentPlayerId === "zombie" && peerId === Object.keys(window.playersObject)[0]) { // Only the host runs the zombie turn
                zombieTurn();
            }
        });

        window.addEventListener("startDeploymentPhase", () => {
            let currentPlayerId = playerIds[window.currentTurnIndex];
            if (peerId === currentPlayerId) {
                startPlayerDeploymentPhase();
            }
        });

        //------------------

        function zombieTurn() {
            gameTurns++;
            let zombie = window.playersObject["zombie"];
            let spawnCount = zombie.territories.length; // 1 troop per territory
            if (gameTurns % 3 === 0) spawnCount *= 2; // Surge every 3 turns

            // Spawn troops randomly across zombie territories
            for (let i = 0; i < spawnCount; i++) {
                let territory = zombie.territories[Math.floor(Math.random() * zombie.territories.length)];
                zombie.troops[territory].infantry++;
                let totalTroops = zombie.troops[territory].infantry + zombie.troops[territory].cavalry + zombie.troops[territory].artillery;
                updateTroopLabel(territory, totalTroops);
            }
            console.log(`The AI sepratists spawned ${spawnCount} troops`);

            // Attack adjacent human territories
            let attackCount = (gameTurnCounter % 3 === 0) ? zombie.territories.length : 1; // Surge: attack all, normal: 1
            for (let i = 0; i < attackCount && i < zombie.territories.length; i++) {
                let fromTerritory = zombie.territories[i];
                let adjacent = adjacencyMap[fromTerritory];
                let humanTarget = adjacent.find(t => {
                    let owner = Object.keys(window.playersObject).find(id => 
                        window.playersObject[id].territories.includes(t) && id !== "zombie"
                    );
                    return owner !== undefined;
                });

                if (humanTarget) {
                    let clickedObject = raycastObjs.find(obj => obj.elementData.properties.county === humanTarget);
                    processAttack(fromTerritory, humanTarget, clickedObject);
                }
            }
            console.log("Zombie turn completed");

            // Move to next player
            window.currentTurnIndex++;
            if (window.currentTurnIndex >= playerIds.length) {
                window.currentTurnIndex = 0;
                window.sharedState.gameState = "deployment2";
                Object.values(connections).forEach(conn => {
                    if (conn.open) {
                        conn.send({ type: "syncGameState", gameState: "deployment2" });
                    }
                });
            } else {
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
                let nextPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
                console.log("Next Player:", nextPlayerName);
                showPlayerTurnPopup(nextPlayerName);
                if (playerIds[window.currentTurnIndex] === "zombie") {
                    zombieTurn(); // Recursive for zombie turns
                } else {
                    startPlayerAttackPhase();
                }
            }
            syncGameState();
        }

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
                    // First click: Select "from" territory
                    if (playerTerritories.includes(territoryName)) {
                        let troops = window.playersObject[peerId].troops[territoryName];
                        let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
                        if (totalTroops > 1) { // Need >1 troop to attack
                            selectedFromTerritory = territoryName;
                            console.log(`Selected attack from: ${territoryName}`);
                            clickedObject.material.color.set(0xFF7F00); // Highlight
                            document.querySelector(".actionPanel").style.visibility = "hidden"; // Hide panel
                        } else {
                            alert("You need more than 1 troop to attack from this territory!");
                        }
                    } else {
                        alert("Select a territory you own to attack from!");
                    }
                } else {
                    // Second click: Select "to" territory
                    let isAdjacent = adjacencyMap[selectedFromTerritory]?.includes(territoryName);
                    if (isAdjacent && !playerTerritories.includes(territoryName)) {
                        console.log(`Selected attack to: ${territoryName}`);
                        clickedObject.material.color.set(0xFF0000); // Red for target
                        document.querySelector(".actionPanel").style.visibility = "visible"; // Show panel
                        setupActionPanel(selectedFromTerritory, territoryName, clickedObject);
                    } else {
                        if (!isAdjacent) alert("You can only attack adjacent territories!");
                        if (playerTerritories.includes(territoryName)) alert("You can’t attack your own territory!");
                        selectedFromTerritory = null; // Reset on invalid click
                        clickedObject.material.color.set(clickedObject.elementData.shapeColor);
                    }
                }
            }
        }

        function setupActionPanel(fromTerritory, toTerritory, toObject) {
            const actionPanel = document.querySelector(".actionPanel");

            const attackButton = document.getElementById("attackButton")
            attackButton.onclick = () => {
                processAttack(fromTerritory, toTerritory, toObject);
                actionPanel.style.visibility = "hidden";
                selectedFromTerritory = null; // Reset after attack
                toObject.material.color.set(toObject.elementData.shapeColor); // Reset color
            };
        }
        
                // if (!window.sharedState.lastSelectedTerritory) {
                //     if (playerTerritories.includes(territoryName)) {
                //         window.sharedState.lastSelectedTerritory = territoryName;
                //         console.log(`Selected ${territoryName} as the attacking territory`);
                //     } else {
                //         alert("Please select one of your own territories to attack from!");
                //     }
                // } else {
                //     let attackingTerritory = window.sharedState.lastSelectedTerritory;
                //     let isAdjacent = adjacencyMap[attackingTerritory]?.includes(territoryName);
                //     let isOwnedByEnemy = !playerTerritories.includes(territoryName);
        
                //     if (isAdjacent && isOwnedByEnemy) {
                //         processAttack(attackingTerritory, territoryName, clickedObject);
                //     } else {
                //         alert("Invalid attack! Must attack an adjacent enemy territory.");
                //     }

                //     window.sharedState.lastSelectedTerritory = null; // Reset selection
                // }
        //     }
        // }

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
                updateLeaderboard();
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

        // function handleDeploymentClick(troopsToDeploy) {
        //     let remainingTroops = troopsToDeploy;
        //     let selectedTerritory = null; // For reinforcement
        //     let reinforcementMode = false;

        //     return function(event) {
        //         let tempRaycaster = new THREE.Raycaster();
        //         let tempMouse = new THREE.Vector2();

        //         tempMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        //         tempMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        //         tempRaycaster.setFromCamera(tempMouse, camera);

        //         let intersects = tempRaycaster.intersectObjects(raycastObjs);

        //         if (intersects.length > 0) {
        //             let clickedObject = intersects[0].object;
        //             let territoryName = clickedObject.elementData.properties.county;
        //             let currentPlayerId = playerIds[window.currentTurnIndex];
        //             let playerTerritories = window.playersObject[peerId].territories;

        //             if (peerId !== currentPlayerId) return;

        //             if (!playerTerritories.includes(territoryName)) {
        //                 alert("You can only deploy to or move between your own territories!");
        //                 return;
        //             }

        //             if (remainingTroops > 0) {
        //                 // Deployment phase
        //                 let troops = window.playersObject[peerId].troops[territoryName];
        //                 troops.infantry++;
        //                 let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
        //                 updateTroopLabel(territoryName, totalTroops);
        //                 remainingTroops--;
        //                 console.log(`Deployed 1 troop to ${territoryName}, Remaining: ${remainingTroops}`);
        //                 syncGameState();

        //                 let endButton = document.getElementById('endDeploymentButton');
        //                 endButton.textContent = `End Deployment (${remainingTroops} troops left)`;

        //                 if (remainingTroops === 0 && !reinforcementMode) {
        //                     reinforcementMode = true;
        //                     alert("All troops deployed! You can now move 1 troop between adjacent territories you own. Click a territory to select it, then an adjacent one to move. Click 'End Deployment' when done.");
        //                 }
        //             } else if (reinforcementMode) {
        //                 // Reinforcement phase
        //                 if (!selectedTerritory) {
        //                     let troops = window.playersObject[peerId].troops[territoryName];
        //                     let totalTroops = troops.infantry + troops.cavalry + troops.artillery;
        //                     if (totalTroops > 1) {
        //                         selectedTerritory = territoryName;
        //                         console.log(`Selected ${territoryName} to move troops from`);
        //                     } else {
        //                         alert("This territory needs at least 1 troop to stay!");
        //                     }
        //                 } else {
        //                     let fromTerritory = selectedTerritory;
        //                     let isAdjacent = adjacencyMap[fromTerritory]?.includes(territoryName);
        //                     if (isAdjacent && fromTerritory !== territoryName) {
        //                         let fromTroops = window.playersObject[peerId].troops[fromTerritory];
        //                         let toTroops = window.playersObject[peerId].troops[territoryName];
        //                         if (fromTroops.infantry > 0) {
        //                             fromTroops.infantry--;
        //                             toTroops.infantry++;
        //                             let fromTotal = fromTroops.infantry + fromTroops.cavalry + fromTroops.artillery;
        //                             let toTotal = toTroops.infantry + toTroops.cavalry + toTroops.artillery;
        //                             updateTroopLabel(fromTerritory, fromTotal);
        //                             updateTroopLabel(territoryName, toTotal);
        //                             console.log(`Moved 1 troop from ${fromTerritory} to ${territoryName}`);
        //                             syncGameState();
        //                             selectedTerritory = null; // Reset after one move
        //                             reinforcementMode = false; // One move per turn
        //                         }
        //                     } else {
        //                         alert("You can only move to an adjacent territory you own!");
        //                         selectedTerritory = null;
        //                     }
        //                 }
        //             }
        //         }
        //     };
        // }

        function addEndAttackButton() {
            let endButton = document.getElementById('endAttackButton');
            if (!endButton) {
                endButton = document.createElement('div');
                endButton.id = 'endAttackButton';
                endButton.textContent = 'End Attack Phase';
                endButton.style.position = 'absolute';
                endButton.style.backgroundColor = '#8b4513';
                endButton.style.color = 'white';
                endButton.style.opacity = '0.8';
                endButton.style.bottom = '20px';
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

                // // Set winner object to winner
                // let winner = checkForWinner();

                // // Sends winning mesage to all players if someone has won
                // if (winner) {
                //     alert(`${winner.name}, has won the game!`);
                //     document.dispatchEvent(new Event("toggleEndGameScreen"));
                //     Object.values(connections).forEach(conn => {
                //         if (conn.open) {
                //             conn.send({ type: "gameOver", winner: winner.name });
                //         }
                //     });
                //     return;
                // }

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

        // Function adds the event listener for new deployment
        // function startPlayerDeploymentPhase() {
        //     let currentPlayerId = playerIds[window.currentTurnIndex];
        //     if (peerId === currentPlayerId) {
        //         let player = window.playersObject[peerId];
        //         let troopsToDeploy = Math.max(3, Math.floor(player.territories.length / 2));
        //         console.log(`${player.name} has ${troopsToDeploy} troops to deploy`);
        //         addEndDeploymentButton(troopsToDeploy);
        //         window.addEventListener("click", handleDeploymentClick(troopsToDeploy));
        //     }
        // }

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
                            let isAdjacent = adjacencyMap[fromTerritory]?.includes(territoryName);
                            if (isAdjacent && fromTerritory !== territoryName) {
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

        function showReinforcementSlider(fromTerritory, toTerritory, maxTroops, onComplete) {
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
                console.log(`Moved ${troopsToMove} troops from ${fromTerritory} to ${toTerritory}`);
                syncGameState();
                sliderDiv.remove();
                onComplete(); // Call callback to reset reinforcement state
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
                endButton.style.backgroundColor = 'blue';
                endButton.style.opacity = '0.8';
                endButton.style.bottom = '20px';
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

                // // Set winner object to winner
                // let winner = checkForWinner();

                // if (winner) {
                //     alert(`${winner.name}, has won the game!`);
                //     Object.values(connections).forEach(conn => {
                //         if (conn.open) {
                //             conn.send({ type: "gameOver", winner: winner.name });
                //         }
                //     });
                //     return;
                // }

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

        //------------------

        // function addEndDeploymentButton(troopsToDeploy) {
        //     let endButton = document.getElementById('endDeploymentButton');
        //     if (!endButton) {
        //         endButton = document.createElement('div');
        //         endButton.id = 'endDeploymentButton';
        //         endButton.style.position = 'absolute';
        //         endButton.style.backgroundColor = 'blue';
        //         endButton.style.opacity = '0.8';
        //         endButton.style.bottom = '20px';
        //         endButton.style.left = '50%';
        //         endButton.style.transform = 'translateX(-50%)';
        //         endButton.style.padding = '10px 20px';
        //         endButton.style.zIndex = '1000';
        //         endButton.style.userSelect = 'none';
        //         document.body.appendChild(endButton);
        //     }
        //     endButton.textContent = `End Deployment (${troopsToDeploy} troops left)`;
        //     endButton.style.display = 'block';

        //     endButton.onclick = () => {
        //         console.log("Ending deployment phase for player : ", playerIds[window.currentTurnIndex]);
        //         endButton.style.display = 'none';
        //         window.removeEventListener('click', handleDeploymentClick(troopsToDeploy));

        //         let winner = checkForWinner();
        //         if (winner) {
        //             alert(`${winner.name} has won the game!`);
        //             Object.values(connections).forEach(conn => {
        //                 if (conn.open) {
        //                     conn.send({ type: "gameOver", winner: winner.name });
        //                 }
        //             });
        //             return;
        //         }

        //         window.currentTurnIndex++;
        //         if (window.currentTurnIndex >= playerIds.length) { // Fixed: >= instead of >
        //             console.log("All players have finished deploying. Returning to attack phase...");
        //             window.currentTurnIndex = 0;
        //             window.sharedState.gameState = "attack1";
        //             Object.values(connections).forEach(conn => {
        //                 if (conn.open) {
        //                     conn.send({ type: "syncGameState", gameState: "attack1" });
        //                 }
        //             });
        //             return;
        //         }

        //         Object.values(connections).forEach(conn => {
        //             if (conn.open) {
        //                 conn.send({ 
        //                     type: "syncPlayersObject", 
        //                     currentTurnIndex: window.currentTurnIndex, 
        //                     playersObject: window.playersObject, 
        //                     territoryChanges: true
        //                 });
        //             }
        //         });

        //         let currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
        //         console.log("Next Player:", currentPlayerName);
        //         showPlayerTurnPopup(currentPlayerName);
        //         startPlayerDeploymentPhase();
        //     };
        // }

        // Following are helper functions to aid the above phase logic...

        // document.addEventListener("checkForWinnerEvent", () => {
        //     checkForWinner();
        // });

        let eliminatedPlayers = [];
        // Function to check for a winner
        function checkForWinner() {
            // let totalTerritories = raycastObjs.length; // Total number of territories on the map
            for (let playerId in window.playersObject) {
                let players = window.playersObject;
                let remainingPlayers = Object.values(players).filter(player => player.territories.length > 0);

                if (window.playersObject[playerId].territories.length === 0) {
                    // Get the player's final territories
                    let finalTerritories = window.playersObject[playerId].territories;
                    
                    // Store final details in a file
                    saveFinalStats(playerId, finalTerritories);

                    // Add eliminated to rankings
                    eliminatedPlayers.unshift({
                        name: window.playersObject[playerId].name,
                        territories: window.playersObject[playerId].territories.length
                    });
                    
                    // Remove the player from `playersObject`
                    delete window.playersObject[playerId];

                    // Send message to the eliminated player
                    if (connections[playerId] && connections[playerId].open) {
                        console.log('its sending .............................. ');
                        connections[playerId].send({ type: "playerLost" });
                    }
                }

                // if (window.playersObject[playerId].territories.length === totalTerritories) {
                //     return window.playersObject[playerId]; // Return the winning player
                // }
                
                // if (remainingPlayers.length === 1) {
                //     let winner = remainingPlayers[0];
                //     // alert(`Player ${winner.id} is the winner!`);
                //     return window.playersObject[playerId]; // Return the winning player
                // }

                if (remainingPlayers.length === 1) {
                    let winner = remainingPlayers[0];
                    
                    // Add winner to ranking
                    eliminatedPlayers.unshift({ name: winner.name, territories: winner.territories.length });
            
                    // Notify all players about the game ending
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "gameOver", winner: winner.name, rankings: eliminatedPlayers });
                        }
                    });

                    // window.location.href = `endScreen.html?winner=${encodeURIComponent(winner.name)}&data=${encodeURIComponent(JSON.stringify(window.playersObject))}`;
                    window.location.href = `endScreen.html?winner=${encodeURIComponent(winner.name)}&rankings=${encodeURIComponent(JSON.stringify(eliminatedPlayers))}`;
            
                    return;
                }
            }
            return null; // No winner returns null so nothing happens
        }

        // document.addEventListener("displayEndScreen", (event) => {
        //     showEndScreen();
        // }

        document.addEventListener("displayEndScreen", (event) => {
            let winnerName = event.detail.winner;
            displayEndScreen(winnerName);
        });

        function displayEndScreen(winnerName) {
            // Stop all event listeners to disable game logic
            window.removeEventListener("click", handleAttackClick);
            window.removeEventListener("click", handleDeploymentClick);
            window.removeEventListener("click", onDocumentClick);
            
            // Clear all UI elements
            document.body.innerHTML = "";

            document.body.style.pointerEvents = "none";

            document.body.innerHTML = `
                <div id="endScreen" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 38, 73, 0.85);
                    color: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    z-index: 10000;
                ">
                    <p>${winnerName} has won the game!</p>
                </div>
            `;

            endGameScreen = document.getElementById('endScreen');
            endGameScreen.addEventListener('click', function(event) {
                event.stopPropagation(); // prevent event from bubbling up to .container
            });
        }

        function saveFinalStats(playerId, territories) {
            let textContent = `Player ${playerId} was eliminated.\nFinal Territories: ${territories.join(", ")}`;
            
            let blob = new Blob([textContent], { type: "text/plain" });
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "finalGameStats.txt";
            link.click();
        
            console.log("Final stats saved for", playerId);
        }

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

        // Old function
        // function updateTroops(troops, newTotal) {
        //     const originalTotal = troops.infantry + troops.cavalry + troops.artillery;
        //     if (originalTotal === 0 || newTotal < 0) return; 
        
        //     const ratio = newTotal / originalTotal;
        //     troops.infantry = Math.max(0, Math.round(troops.infantry * ratio));
        //     troops.cavalry = Math.max(0, Math.round(troops.cavalry * ratio));
        //     troops.artillery = Math.max(0, Math.round(troops.artillery * ratio));

        //     // Ensure at least 1 troop remains if newTotal > 0
        //     if (newTotal > 0 && troops.infantry + troops.cavalry + troops.artillery === 0) {
        //         troops.infantry = 1; // Default to 1 infantry if all else fails
        //     }
        // }
        
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

        // function addEndAttackButton() {
        //     const endButton = document.createElement('div');
        //     endButton.id = 'endAttackButton';
        //     endButton.textContent = 'End Attack Phase';
        //     endButton.style.position = 'absolute';
        //     endButton.style.bottom = '20px';
        //     endButton.style.left = '50%';
        //     endButton.style.transform = 'translateX(-50%)';
        //     endButton.style.padding = '10px 20px';
        //     endButton.style.display = 'none';
        //     endButton.zIndex = '1000';

        //     document.body.appendChild(endButton);

        //     endButton.onclick = () => {
        //         console.log("Ending attack phase for player", playerIds[window.currentTurnIndex]);
        
        //         // Hide the button and stop attack events
        //         endButton.style.display = 'none';
        //         window.removeEventListener('click', handleAttack);
        
        //         // Move to the next player
        //         window.currentTurnIndex++;
                
        //         if (window.currentTurnIndex >= playerIds.length) {
        //             console.log("All players have finished attacking. Moving to next phase.");
        //             return; // You can add code here to transition to another phase.
        //         }
        
        //         // Sync the new turn and notify the next player
        //         Object.values(connections).forEach(conn => {
        //             if (conn.open) {
        //                 conn.send({ 
        //                     type: "syncPlayersObject", 
        //                     currentTurnIndex: window.currentTurnIndex, 
        //                     playersObject: window.playersObject, 
        //                     territoryChanges: true 
        //                 });
        //             }
        //         });
        
        //         let currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name;
        //         console.log("Next Player:", currentPlayerName);
        //         showPlayerTurnPopup(currentPlayerName);
        
        //         // Reactivate attack phase for the new player
        //         window.addEventListener('click', handleAttack);
        //     };
        // }
        
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

        // document.addEventListener("mousemove", onMouseMove, false);
        // function onMouseMove(event) {
        //     if (window.sharedState.gameState !== "deployment") {
        //         return; // Exit if not in deployment phase
        //     }
        
        //     event.preventDefault();
        
        //     mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        //     mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
        
        //     raycaster.setFromCamera(mouse, camera);
        
        //     let intersects = raycaster.intersectObjects(raycastObjs);
        
        //     if (intersects.length > 0) {
        //         if (INTERSECTED && INTERSECTED !== CLICKED) {
        //             INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColour);
        //         }
        
        //         INTERSECTED = intersects[0].object;
        
        //         if (INTERSECTED !== CLICKED) {
        //             INTERSECTED.material.color.setHex(0x666666);
        //         }
        //     } else {
        //         if (INTERSECTED && INTERSECTED !== CLICKED) {
        //             INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColour);
        //         }
        //         INTERSECTED = null;
        //     }
        // }
        
        // document.getElementById('attackButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
        //     // window.sharedState.gameState = "attack_country";
        //     // this.loadmaingame = new mainGame();
        //     this.loadmaingame.attack();
        // });

        // document.getElementById('sailButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
        //     // window.sharedState.gameState = "sail_country";
        //     // this.loadmaingame = new mainGame();
        //     this.loadmaingame.sail();
        // });

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
