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

let playerIds = Object.keys(window.playersObject);
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
    const popup = document.getElementById("deploymentPopup");
    popup.style.display = "block";

    // Move after 3 seconds
    setTimeout(() => {
        // popup.style.display = "none";
        popup.style.top = "2.8%";
        popup.style.padding = "0.1vh 2vw";
    }, 3000);

    window.sharedState.gameState = "deployment";
    console.log(' AT THIS STAGE IT IS : ', window.sharedState.gameState);
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
        const myTimeout = setTimeout((console.log(window.playersObject)), 10000); // Delays the clog so that the peerjs has time to handle messages

        // Call this function when deployment phase starts
        showDeploymentPopup();

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

        // let that = this;
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        let INTERSECTED = null;
        let CLICKED = null;

        if (window.sharedState.gameState === "deployment") {
            console.log('select your first teraritory');
        }

        let i = Object.keys(window.playersObject).length;

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

                let currentPlayerId = playerIds[window.currentTurnIndex];
                console.log(currentPlayerId); // Debugging

                if (peerId === currentPlayerId) {
                    // Add country name to territories
                    if (clickedObject.elementData) {
                        window.playersObject[peerId].territories.push(countryName);
                        i--; // Decrement i
                        console.log(i);
                    } else {
                        alert('Please click on the map');
                    }
                    // currentTurnIndex++; // ERROR this would alternate turns but we cant do that bc of sync
                }

                if (i === 0) {  // currentTurnIndex >= playerIds.length
                    window.currentTurnIndex++;
                    // console.log("Updated currentTurnIndex:", window.currentTurnIndex);  // Debugging
                    // console.log(playerIds[window.currentTurnIndex]); // Debugging
                    console.log('The final object is : ', window.playersObject);
                    window.removeEventListener("click", handleClick);
                    console.log("Click event removed.");
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "syncPlayersObject", playersObject: window.playersObject, currentTurnIndex: window.currentTurnIndex});
                        }
                    });
                }

                if (i === 0 && currentTurnIndex >= playerIds.length) {
                    Object.values(connections).forEach(conn => {
                        if (conn.open) {
                            conn.send({ type: "syncPlayersObject", playersObject: window.playersObject });
                        }
                    });
                }
            }

            // Delete the temporary raycaster
            tempRaycaster = null;
        });

        document.addEventListener("click", onDocumentClick, false);
        function onDocumentClick(event) {

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

                document.querySelector(".actionPanel").style.visibility = "visible";

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
            event.preventDefault();

            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            let intersects = raycaster.intersectObjects(raycastObjs);

            if (intersects.length > 0) {
                // Checks if the multiple intersects were clicked
                if (INTERSECTED && INTERSECTED != CLICKED) {
                    INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColor);
                }

                INTERSECTED = intersects[0].object;

                if (INTERSECTED != CLICKED) {
                    INTERSECTED.material.color.setHex(0x666666);
                }

            } else {
                if (INTERSECTED && INTERSECTED != CLICKED) {
                    INTERSECTED.material.color.set(INTERSECTED.elementData.shapeColor);
                }
            }
        }

        document.getElementById('attackButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
            window.sharedState.gameState = "attack_country";
            // this.loadmaingame = new mainGame();
            this.loadmaingame.attack();
        });

        document.getElementById('sailButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
            window.sharedState.gameState = "sail_country";
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

    reinfocrementPhase : function() {
        if (window.sharedState.gameState === "reinforcement") {
            return
        }
    },

    attack : function() {
        if (window.sharedState.gameState === "attack_country") {
            console.log("attack is working");

            const isUpdated = true; // For the host the flag allows the host to send the players to attackTerritory without them also being able to do the same bc the flag gets set to false for them
            // console.log('HERE IS THE CHECK FOR THE territoryClicked : ', window.sharedState.territoryClicked); // Debugging
            gameActions.attackTerritory(window.sharedState.territoryClicked, isUpdated);
        };
    },

    sail : function() {
        if (window.sharedState.gameState === "sail_country") {
            console.log("sail is working");

        };
    }
};

init();
animate();

load_init_game = new initGame();
load_init_game.playerSetup();