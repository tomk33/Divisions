document.querySelector(".country_name").style.visibility = "visible";
let renderer = new THREE.WebGLRenderer({ canvas: artifactCanvas }); // {canvas: artifactCanvas}
renderer.autoClear = false;

let scene = new THREE.Scene();
let scene1 = new THREE.Scene();   
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 
let isShaderOn = false;           
let uniforms = {
            time: { type: "f", value: .1 },
            resolution: { type: "v2", value: new THREE.Vector2() },
            currentPos: { type: "v3", value: new THREE.Vector3() }
        };      
let startTime = Date.now();

let raycastObjs = [];
let lineObjs = [];

let sharedState = {
    gameState: null,
    attackDifficulty: null
};

// ---------------------------------------------------------------------------------------------------------------------------------
    
function init() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    controls.target.set(0,50,0);  // for world map (0,40,0) for us map (-100,40,0) maybe 144  for london map ()
    camera.position.set( 0, 50, 2 );  // for world map (0,-20,170) for us map (-100,30,40) for london map ()

    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.ZOOM,
        //RIGHT: THREE.MOUSE.ROTATE
    };

    controls.maxPolarAngle = Math.PI;

    controls.enableDamping = true;
    controls.dampingFactor = 0.5;
    //controls.zoomToCursor = true;
    controls.screenSpacePanning = true;

    controls.update();

    scene.background = new THREE.Color(0x41c7ff);  //0x222222

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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

            raycastObjs.push(shape);
            lineObjs.push(line);

            // Create troop count div
            let troopLabel = document.createElement("div");
            troopLabel.className = "troop-count";
            troopLabel.innerText = "0"; // Default troop count
            troopLabel.dataset.country = feature.properties.county; // Assign country name
            document.getElementById("troopContainer").appendChild(troopLabel);

            // Store reference in shape object
            shape.userData.troopLabel = troopLabel;

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
            
            // let textMesh;
            // fontLoader.load('path_to_your_font.json', (font) => {
            // const textGeometry = new THREE.TextGeometry('0', {
            //     font: font,
            //     size: 0.5,
            //     height: 0.1
            // });

            // const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            // textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // // Position the text relative to the cube
            // textMesh.position.set(2, 0, 0);
            // idk
            // scene.add(textMesh);

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
        }

        uniforms.resolution.value.x = window.innerWidth;
        uniforms.resolution.value.y = window.innerHeight;

    });

}

function updateTroopLabels() {
    raycastObjs.forEach((shape) => {
        const label = shape.userData.troopLabel;
        if (!label) return;

        // Get world position of the country shape
        const worldPosition = new THREE.Vector3();
        shape.getWorldPosition(worldPosition);

        // Project world position into 2D screen coordinates
        const screenPosition = worldPosition.clone().project(camera);

        // Convert to pixel values
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (1 - (screenPosition.y * 0.5 + 0.5)) * window.innerHeight;

        // Apply new position to troop label
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
    });
}

function updateTroopCount(countryName, newTroopCount) {
    console.log('update working .....');
    raycastObjs.forEach((shape) => {
        if (shape.elementData.properties.county === countryName) {  // might be country.properties????
            const label = shape.userData.troopLabel;
            if (label) {
                label.innerText = newTroopCount;

                console.log(`Troop count updated for ${countryName}: ${newTroopCount}`);
                console.log(`Label position: ${label.style.left}, ${label.style.top}`);
                console.log(`Label text: ${label.innerText}`);
            } else {
                console.warn(`No label found for ${countryName}`);
            }
        }
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

    updateTroopLabels(); // Move labels
}


let initGame = function() {
    this.troops = null;
};

initGame.prototype = {

    playerSetup : function() {

        // let gameData = JSON.parse(sessionStorage.getItem("gameData"));

        // let playerNames = gameData.names;

        // console.log(playerNames);

        this.troopSetup();

        // read this for specialised prototypes,  https://stackoverflow.com/questions/560829/calling-method-using-javascript-prototype

        // https://stackoverflow.com/questions/3357553/how-do-i-store-an-array-in-localstorage

    },

    troopSetup : function() {
        this.troops = 35;  // do setup of troops for each player etc.......
        this.loadGame();
    },
    
    loadGame : function() {
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
        console.log(this.troops);
        //console.log(this.gameState)
        // let that = this;

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();
        let INTERSECTED = null;
        let CLICKED = null;

        document.addEventListener("click", onDocumentClick, false);
        function onDocumentClick(event) {
                                                                  
            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            let intersects = raycaster.intersectObjects(raycastObjs);

            if(isShaderOn) {
                if (intersects.length > 0) {
                    let countryClicked = intersects[0].CLICKED.elementData.properties.NAME;

                    document.querySelector(".country_name").innerText = countryClicked;
                    
                    // document.querySelector(".country_name").innerText = countryClicked;

                    // The fetch json could also be added here, but it isn't necessary

                } else
                    document.querySelector(".country_name").innerText = "";
            }
            else {
                if (intersects.length > 0) {

                    if (CLICKED) {
                        CLICKED.material.color.set(CLICKED.elementData.shapeColor);
                    }

                    CLICKED = intersects[0].object;
                    CLICKED.material.color.set(0xFF7F00);   //0x164B91

                    let countryClicked = CLICKED.elementData.properties.county;   // NAME  change this for name of field for each region, county for uk ceremonial map

                    document.querySelector(".country_name").innerText = countryClicked;

                    document.querySelector(".territory_info_div").style.visibility = "visible";
                    
                    // if (this.gameState === 'attackPhase') {
                    //     document.querySelector(".territory_info_div").style.visibility = "visible";
                    // };
                    
                    // <------------- SEPERATE THE MAKE DIV VISIBLE BIT AND MAKE IT WORK AFTER TROOPS LOADED ------------------------->

                    fetch('country_attack_difficulty.json')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log(data);
                        // Finds the index of the country
                        let index = data.countries.findIndex(function (indexFind) {
                            return indexFind.country === countryClicked; // Using '===' for comparison
                        });

                        if (index !== -1) { // Ensures the country is found
                            sharedState.attackDifficulty = data.countries[index].difficulty_index;
                            console.log(`the attack difficulty is ` + sharedState.attackDifficulty); // Output difficulty for attack
                        } else {
                            console.log(`Territory not found`);
                        }
                    })
                    .catch(error => {
                        console.error('There has been a problem with the fetch operation:', error);
                    });

                } else {

                    if (CLICKED) {
                        CLICKED.material.color.set(CLICKED.elementData.shapeColor);
                        document.querySelector(".country_name").innerText = "";
                        document.querySelector(".territory_info_div").style.visibility = "hidden";
                    }

                    CLICKED = null;
                }
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
            sharedState.gameState = "attack_country";
            this.loadmaingame = new mainGame();
            this.loadmaingame.attackTerritory();
        });

        //that.gameState = "attack_country";  // Update the current gameState

        document.getElementById('sailButton').addEventListener('click', (event) => {  // 'this' refers to the clickEvents instance
            sharedState.gameState = "sail_country";
            this.loadmaingame = new mainGame();
            this.loadmaingame.sailTerritory();
            //this.overlayScreen();
        });

        // ...........................................................

        window.addEventListener("resize", onWindowResize, false);
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    },

    reinfocrementPhase : function() {
        if (sharedState.gameState === "reinforcement") {
            return
        }
    },

    attackTerritory : function() {
        if (sharedState.gameState === "attack_country") {
            console.log("attack is working");

            let countryUnderAttack = "London";  // dynamically set
            let newTroopCount = 10;  // should be calculated
    
            updateTroopCount(countryUnderAttack, newTroopCount);
        };
    },

    sailTerritory : function() {
        if (sharedState.gameState === "sail_country") {
            console.log("sail is working");
        };
    }
};

init();
updateTroopCount("Surrey", 10);
animate();

load_init_game = new initGame();
load_init_game.playerSetup();

