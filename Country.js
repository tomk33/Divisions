let Region = function(geoCoords, properties, lineColour, shapeColour) {
    this.geoCoords = geoCoords;
    this.properties = properties;      
    this.lineColour = (!lineColour) ? 0x000000 : lineColour; // 0x00FF80 solomon suggested that the colours for the map and the lines should be flipped. Default to black
    this.shapeColour = (!shapeColour) ? 0x98FB98 : shapeColour; // 0x000000 Default to green
};

Region.prototype = {
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
        
        let material = new THREE.LineBasicMaterial({color: this.lineColour});
        let lineSegments = new THREE.LineSegments(geometry, material);
        lineSegments.elementData = this;
        return lineSegments;
    },

    createShape: function() {
        let pointsArray = [];
        let shapeList = [];
        
        for (let shape of this.geoCoords.coordinates) {
            if (this.geoCoords.type === "MultiPolygon") {
                shape = shape[0]; 
            } 
                
            let start = new THREE.Vector2(shape[0][0], shape[0][1]);
            for (let i = 1; i < shape.length; i++) {
                let next = new THREE.Vector2(shape[i][0], shape[i][1]);
                pointsArray.push(start, next);
                start = next;
            }

            shapeList.push(new THREE.Shape(pointsArray));      
            pointsArray = [];
        }

        let material = new THREE.MeshBasicMaterial({ color: this.shapeColour });
        let shapeGeometry = new THREE.ShapeBufferGeometry(shapeList);
        let mesh = new THREE.Mesh(shapeGeometry, material);

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
