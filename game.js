let renderer = new THREE.WebGLRenderer();
renderer.autoClear = false;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // i put the renderer for the map here so that the orbit controls would work

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
    territoryClicked: null
    // attackDifficulty: null
};

function updatePlayerIdsObject() {
    playerIds = Object.keys(window.playersObject);
}
window.currentTurnIndex = 0; // Start with the first player

// ---------------------------------------------------------------------------------------------------------------------------------

function init() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);  // renderer.domElement

    controls.target.set(0, 50, 0); // for world map (0, 40, 0) for us map (-100, 40, 0) maybe 144 for london map (0,50,0)
    camera.position.set(0, 50, 2); // for world map (0, -20, 170) for us map (-100, 30, 40) for london map (0,50,2)

    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.ZOOM,
        RIGHT: THREE.MOUSE.ROTATE // nice feature to have not necessary though
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
            let country = new Country(feature.geometry, feature.properties);
            let shape = country.createShape();
            let line = country.createLine();
            let label = country.createTextLabel('0');

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

            scene.add(shape);
            scene1.add(line);
            labelScene.add(scene); // Add label to labelScene for efficiency
        }

        uniforms.resolution.value.x = window.innerWidth;
        uniforms.resolution.value.y = window.innerHeight;

    });

    controls.update();

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
    const deploymentPopup = document.getElementById("deploymentPopup"); // "deploymentPopup"
    deploymentPopup.style.display = "block";

    // Move after 2 seconds
    setTimeout(() => {
        deploymentPopup.style.top = "2.8%";
        deploymentPopup.style.padding = "0.1vh 2vw";
    }, 2000);
}

function showAttackPopup() {
    const attackPopup = document.getElementById("attackPopup"); // deploymentPopup

    setTimeout(() => {
        attackPopup.style.display = "block";
    }, 2000);

    // Move after 2 seconds
    setTimeout(() => {
        const deploymentPopup = document.getElementById("deploymentPopup");
        deploymentPopup.style.display = "none";
        attackPopup.style.top = "2.8%";
        attackPopup.style.padding = "0.1vh 2vw";
    }, 4000);
}

function showPlayerTurnPopup(currentPlayerName) {
    console.log('showing players turn now..........'); // Debugging
    const turnPopup = document.getElementById("turnPopup");        
    // Show after deployment popup shows
    setTimeout(() => {
        // popup.style.display = "none";
        turnPopup.innerText = `It is ${currentPlayerName}'s turn`  // ${window.playersObject[peerId]?.name}
        turnPopup.style.display = "block";
    }, 3000);

    // Hide after 3 more seconds
    setTimeout(() => {
        // popup.style.display = "none";
        turnPopup.style.display = "none";
    }, 5000);
}


let initGame = function() {
    this.troops = null;
};

initGame.prototype = {

    troopTotalInit : function(peerSent) {
        // read this for specialised prototypes,  https://stackoverflow.com/questions/560829/calling-method-using-javascript-prototype

        // https://stackoverflow.com/questions/3357553/how-do-i-store-an-array-in-localstorage
    },

    playerSetup : function() {
        // ADD THE PLYER STATS HERE ASWELL

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

// Inheritance
mainGame.prototype = Object.create(initGame.prototype);
mainGame.prototype.constructor = mainGame;

mainGame.prototype = {

    setupEventListeners : function() {
        // console.log(this.troopTotal); // Debugging

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        let INTERSECTED = null;
        let CLICKED = null;

        updatePlayerIdsObject();
        console.log('THIS IS THE PLAYERIDS ........... ', playerIds);

        setTimeout(() => {
            // ERROR, POP REMOVES THE LAST ITEM IN THE LIST, IT DOESNT FIND THE ITEM AND REMOVE IT
            // chosenColour = pastelColours[Math.floor(Math.random() * pastelColours.length)];
            // pastelColours.pop(chosenColour);

            // setTimeout(() => {
            // CORRECTED USING SPLICE
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

            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name
            console.log(currentPlayerName);
            showPlayerTurnPopup(currentPlayerName);
            Object.values(connections).forEach(conn => {
                if (conn.open) {
                    conn.send({ type: "syncPlayersObject", currentPlayerId: playerIds[window.currentTurnIndex]});
                }
            });
        }, 2400);

        setTimeout(() => {
            // console.log(" AHHHHHHHHHHHHH:", window.playersObject); // Debugging
            let i = (72 / Object.keys(window.playersObject).length) / 2;

            window.addEventListener("click", function handleClick(event) {
                // Create a new temporary raycaster
                let tempRaycaster = new THREE.Raycaster();
                let tempMouse = new THREE.Vector2();
    
                // Convert mouse position to normalized device coordinates (-1 to +1)
                tempMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                tempMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
                // Set the raycaster from the camera
                tempRaycaster.setFromCamera(tempMouse, camera);
    
                // Find intersections with the country objects
                let intersects = tempRaycaster.intersectObjects(raycastObjs);
    
                if (intersects.length > 0) {
                    let clickedObject = intersects[0].object;
                    let countryName = clickedObject.elementData.properties.county; // Get country name
    
                    console.log("Selected Country:", countryName);
    
                    // Ensure territories is an array before pushing for debugging
                    if (!Array.isArray(window.playersObject[peerId].territories)) {
                        window.playersObject[peerId].territories = [];
                    }
                    
                    // FOLLOWING COMMENTED ISNT NEEDED AS COLOUR SETTING HAS BEEN MOVED TO GAME.JS .....
                    // Get the assigned color for this peer
                    // let assignedColour = window.playersObject[peerId]?.colour;
                    // console.log(`Player ${peerId} selecting ${countryName}, assigned color:`, assignedColour); // Debugging
    
                    // Debugging
                    // if (!assignedColour) {
                    //     console.error(`Assigned color missing for player ${peerId}!`);
                    //     assignedColour = 0xFF7F00; // Reset to orange
                    // }
    
                    let currentPlayerId = playerIds[window.currentTurnIndex];
                    console.log(currentPlayerId);
    
                    if (peerId === currentPlayerId) {
                        // Prevent selecting a territory already owned by any player
                        let alreadySelected = Object.values(window.playersObject).some(player => 
                            player.territories.includes(countryName) // This checks to see if any player includes the country that is clicked to stop duplicates in the playersObject
                        );
    
                        if (alreadySelected) {
                            console.log(`This country, (${countryName}) is already selected`);
                            return; // Stop selection if already owned by a plauer
                        }

                        // Add country name to territories
                        if (clickedObject.elementData) {
                            window.playersObject[peerId].territories.push(countryName);
                            // clickedObject.material.color.set(window.playersObject[peerId].colour);
                            // clickedObject.elementData.shapeColor = window.playersObject[peerId].colour;
                            clickedObject.material.color.set(window.playersObject[peerId].colour);
                            clickedObject.elementData.shapeColor = window.playersObject[peerId].colour;
                            i--; // Decrement i
                            console.log(i);
                        } else {
                            console.log('Please click on the map');
                        }
                        // currentTurnIndex++; // ERROR : this would alternate turns but we cant do that bc of sync
                    }
    
                    if (i === 0) {  // Only does the loop if the player has selected all territories
                        window.currentTurnIndex++;
                        console.log('The final object is : ', window.playersObject);
                        if (window.currentTurnIndex < playerIds.length) {
                            Object.values(connections).forEach(conn => {
                                // ERROR : I DIDNT PUT THIS IN THE IF LOOP SO IF CARRIED ON FOR PLAYERS THAT DIDN"T EXIST
                                if (conn.open) {
                                    conn.send({ type: "syncPlayersObject", playersObject: window.playersObject, currentTurnIndex: window.currentTurnIndex });
                                }
                            });
                            // ERROR I FORGOT TO ADD THIS SO I WAS JUST SENDING IT TO PEERS WITHOUT THE CURRENT WINDOW UPDATING
                            currentPlayerName = window.playersObject[playerIds[window.currentTurnIndex]]?.name
                            console.log(currentPlayerName);
                            showPlayerTurnPopup(currentPlayerName);
    
                            window.removeEventListener("click", handleClick);
                            console.log("Click event removed");
                        } else {
                            window.removeEventListener("click", handleClick);
                            console.log("Click event removed");
                        }
    
                        if (window.currentTurnIndex >= playerIds.length) {
                            // Syncs the attack popup for all players
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncAttackPopup" });
                                }
                            });
                            showAttackPopup();
    
                            const gameState = 'attack';
                            // Syncs gameState as attack for all players
                            Object.values(connections).forEach(conn => {
                                if (conn.open) {
                                    conn.send({ type: "syncGameState", gameState: gameState });
                                }
                            });
                            window.sharedState.gameState = gameState;
                        }
                    }
                }
    
                // Clean up the temporary raycaster
                tempRaycaster = null;
            });
        }, 2700);

        document.addEventListener("click", onDocumentClick, false);
        function onDocumentClick(event) {
            if (window.sharedState.gameState === "deployment") {
                return; // Exit if in deployment phase
            }

            // Prevent clicking through the UI
            if (event.target.closest(".actionPanel")) {
                event.stopPropagation(); // Stop event from reaching Three.js raycasting
                return;
            }

            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            let intersects = raycaster.intersectObjects(raycastObjs);

            if (intersects.length > 0) {

                if (CLICKED) {
                    CLICKED.material.color.set(CLICKED.elementData.shapeColor);
                }

                CLICKED = intersects[0].object;
                CLICKED.material.color.set(0xFF7F00);   //0x164B91

                let territoryClicked = CLICKED.elementData.properties.county;   // NAME change this for name of field for each region, county for uk ceremonial map
                sharedState.territoryClicked = territoryClicked.replace(/\s+/g, '_');   // Replaces spaces with underscores
                // console.log(this.territoryClicked);

                document.querySelector(".country_name").innerText = territoryClicked;

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
                    CLICKED.material.color.set(CLICKED.elementData.shapeColor);
                    document.querySelector(".country_name").innerText = "";
                    document.querySelector(".territoryInfoPanel").style.visibility = "hidden";
                    document.querySelector(".actionPanel").style.visibility = "hidden";
                }

                document.querySelector(".territoryInfoPanel").style.visibility = "hidden";
                CLICKED = null;
                sharedState.territoryClicked = null;
            }
        }

        document.addEventListener("mousemove", onMouseMove, false);
        function onMouseMove(event) {
            if (window.sharedState.gameState !== "deployment") {
                return; // Exit if not in deployment phase
            }
        
            event.preventDefault();
        
            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
        
            raycaster.setFromCamera(mouse, camera);
        
            let intersects = raycaster.intersectObjects(raycastObjs);
        
            if (intersects.length > 0) {
                if (INTERSECTED && INTERSECTED !== CLICKED) {
                    INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColor);
                }
        
                INTERSECTED = intersects[0].object;
        
                if (INTERSECTED !== CLICKED) {
                    INTERSECTED.material.color.setHex(0x666666);
                }
            } else {
                if (INTERSECTED && INTERSECTED !== CLICKED) {
                    INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColor);
                }
                INTERSECTED = null;
            }
        }

        document.getElementById('attackButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
            // window.sharedState.gameState = "attack_country";
            // this.loadmaingame = new mainGame();
            this.loadmaingame.attack();
        });

        document.getElementById('sailButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
            // window.sharedState.gameState = "sail_country";
            // this.loadmaingame = new mainGame();
            this.loadmaingame.sail();
            //this.overlayScreen();
        });

        // ...........................................................

        window.addEventListener("resize", onWindowResize, false);
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            labelRenderer.setSize(window.innerWidth, window.innerHeight); // update the label renderer size with the window
        }

        // // Get the current browser window
        // const currentWindow = window;

        // // Check if the current window is a Firefox window
        // if (currentWindow.navigator.userAgent.includes('Firefox')) {
        //     // Get the Firefox browser window
        //     const browserWindow = window.windowUtils.getFocusedWindow();

        //     browserWindow.addEventListener('resize', handleBrowserResize);

        //     function handleBrowserResize() {
        //         // Get the new window size
        //         const { width, height } = browserWindow.innerSize;

        //         // Resize the renderer accordingly
        //         updateRendererSize(width, height);
        //     }

        //     function updateRendererSize(width, height) {
        //         // Update the renderer's size
        //         labelRenderer.setSize(width, height);
        //     }
        // }
    },

    attack : function() {
        // if (window.sharedState.gameState === "attack_country") {
        console.log("attack is working");

        const isUpdated = true; // For the host the flag allows the host to send the players to attackTerritory without them also being able to do the same bc the flag gets set to false for them
        // console.log('HERE IS THE CHECK FOR THE territoryClicked : ', window.sharedState.territoryClicked); // Debugging
        gameActions.attackTerritory(window.sharedState.territoryClicked, isUpdated);
        // };
    },

    sail : function() {
        // if (window.sharedState.gameState === "sail_country") {
        console.log("sail is working");

        // };
    }
};

init();
animate();

load_init_game = new initGame();
load_init_game.playerSetup();