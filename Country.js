let Country = function(geoCoords, properties, lineColor, shapeColor) {
    this.geoCoords = geoCoords;
    this.properties = properties;      
    this.lineColor = (!lineColor) ? 0x00FF80 : lineColor; 
    this.shapeColor = (!shapeColor) ? 0x000000 : shapeColor;           
}

Country.prototype = {
    createLine : function() {
        const geometry = new THREE.Geometry();
        for (let P of this.geoCoords.coordinates) {
            if(this.geoCoords.type === "MultiPolygon"){
                P = P[0];
            }

            let p0 = new THREE.Vector3(P[0][0], P[0][1], 0);
            for (let i = 1; i < P.length; ++ i) {

                let p1 = new THREE.Vector3(P[i][0], P[i][1], 0);
                geometry.vertices.push(p0, p1);
                p0 = p1;

            }
        }
        
        let mat = new THREE.LineBasicMaterial({color: this.lineColor});
        let lineSegments = new THREE.LineSegments(geometry, mat);
        lineSegments.elementData = this;
        return lineSegments;
    },

    createShape : function() {
        let vecs2 = [];
        let shapearray = [];
        
        for (let P of this.geoCoords.coordinates) {
            if(this.geoCoords.type === "MultiPolygon") {
                P = P[0];
            } 
                
            let p0 = new THREE.Vector2(P[0][0], P[0][1]);
            for (let i = 1; i < P.length; ++ i) {

                let p1 = new THREE.Vector2(P[i][0], P[i][1]);
                vecs2.push(p0, p1);
                p0 = p1;
            }

            shapearray.push(new THREE.Shape(vecs2));      
            vecs2 = [];
        }

        let mat = new THREE.MeshBasicMaterial({color: this.shapeColor}); // side: THREE.BackSide, wireframe: true
        let shapeGeo = new THREE.ShapeBufferGeometry(shapearray);
        let mesh = new THREE.Mesh( shapeGeo, mat ) ;

        mesh.elementData = this;
        
        return mesh;
    },

    createTextLabel : function(text) {
        const div = document.createElement('div');
        div.id = this.properties.county.replace(/\s+/g, '_'); // removes whitespace and adds underscore
        console.log(div.id);

        div.textContent = text;

        div.style.color = "white";
        div.style.fontFamily = "'Roboto', sans-serif";
        div.style.fontSize = "15px";
        div.style.backgroundColor = "rgba(255, 0, 0, 0.671)";
        div.style.padding = "2px";
        div.style.borderRadius = "3px";
        div.style.textAlign = "center";
        div.style.marginTop = '-1em';

        const label = new THREE.CSS2DObject(div);
        let position = this.getCenterPosition();
        label.position.copy(position);
        return label;
    },

    getCenterPosition : function() {
        // THIS DID NOT CENTRE THE TEXT TO THE COUNTRY SINCE THE COUNTRY IS NOT A REGULAR SHAPE

        // let box = new THREE.Box3().setFromObject(this.createShape());
        // let center = new THREE.Vector3();
        // box.getCenter(center);
        // // center.z = 0.5; // Ensure the z-coordinate is set to 0.5
        // console.log(`Center position: ${center.x}, ${center.y}, ${center.z}`);
        // return center;

        // THIS CENTRES THE TEXT TO THE COUNTRY BY AREA NO MATTER THE SHAPE

        let totalArea = 0;
        let center = new THREE.Vector3();

        for (let P of this.geoCoords.coordinates) {
            if(this.geoCoords.type === "MultiPolygon") {
                P = P[0];
            }

            let area = 0;
            let x = 0;
            let y = 0;

            for (let i = 0; i < P.length; ++ i) {
                let x0 = P[i][0];
                let y0 = P[i][1];
                let x1 = P[(i + 1) % P.length][0]; // Wraps around to the first vertex as it must connect and when x0 is the last vertex x1 will give an error which this fixes
                let y1 = P[(i + 1) % P.length][1];


                let a = x0 * y1 - x1 * y0;
                area += a;
                x += (x0 + x1) * a;
                y += (y0 + y1) * a;
            }

            area /= 2;
            x /= 6 * area;
            y /= 6 * area;

            totalArea += area;
            center.x += x * area;
            center.y += y * area;

        }

        center.x /= totalArea;
        center.y /= totalArea;

        console.log(`center position: ${center.x}, ${center.y}, ${center.z}`);
        return center;

    }
};

    // createTextLabel : function(text) {
    //     const canvas = document.createElement('canvas');
    //     canvas.width = 512;
    //     canvas.height = 256;
    //     const context = canvas.getContext('2d');
    //     context.font = 'Bold 60px Arial';
    //     context.fillStyle = 'rgb(255, 255, 255)'; // Set text color to white
    //     context.textAlign = 'center'; // Center the text horizontally
    //     context.textBaseline = 'middle'; // Center the text vertically

    //     // Add a background color to the canvas
    //     context.fillStyle = 'rgb(145, 0, 0)'; // Semi-transparent black background
    //     context.fillRect(0, 0, canvas.width, canvas.height);

    //     // Set text color and draw the text
    //     context.fillStyle = 'rgb(255, 255, 255)'; // Set text color to white
    //     // context.fillText(text, 0, 20);
    //     context.fillText(text, canvas.width / 2, canvas.height / 2); // Position the text in the center

    //     context.strokeStyle = 'rgb(208, 255, 0)'; // Set border color to black
    //     context.lineWidth = 5; // Set border width
    //     context.strokeText(text, canvas.width / 2, canvas.height / 2); // Draw the border


    //     const texture = new THREE.CanvasTexture(canvas);
    //     const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    //     const sprite = new THREE.Sprite(spriteMaterial);
    //     sprite.scale.set(10, 5, 1.0); // scale the sprite

    //     let position = this.getCenterPosition();
    //     position.z = 0.5; // Set the z-coordinate to 0.5
    //     sprite.position.copy(position);

    //     return sprite;
    // },

    // getCenterPosition : function() {
    //     let box = new THREE.Box3().setFromObject(this.createShape());
    //     let center = new THREE.Vector3();
    //     box.getCenter(center);
    //     center.z = 0.5; // Ensure the z-coordinate is set to 0.5
    //     console.log(`Center position: ${center.x}, ${center.y}, ${center.z}`);
    //     return center;
    // }
// };