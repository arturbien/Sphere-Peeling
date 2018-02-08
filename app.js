

var container;
var camera, scene, controls, renderer;
var mesh, geometry, material;
var raycaster, mouse, target, time;
var objects = [];
var plateObjects = [];

var r = 30;
var rotationSpeedX = 0;
var rotationSpeedZ = 0.32;
const G = 0.5;

init();


function init() {

    ///////////////////
    // CAMERA  //
    ///////////////////
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 20;
    camera.position.x = 120;
    camera.position.y =-40;

    ///////////////////
    // SCENE  //
    ///////////////////
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1E2630, 0.002);
    scene.position.x = 0;
    scene.position.y = 0;
    scene.rotateY(Math.PI/2);
    scene.rotateX(-Math.PI/2);
    scene.rotateZ(-Math.PI/2);

    ///////////////////
    // LIGHT  //
    ///////////////////
    var spotLight = new THREE.SpotLight(0x222222);
    spotLight.position.set(0, 0, 100);
    spotLight.castShadow = true;
    spotLight.shadow.bias = 0.0001;
    spotLight.shadow.mapSize.width = 2048; // Shadow Quality
    spotLight.shadow.mapSize.height = 2048; // Shadow Quality
    scene.add(spotLight);
    
    ///////////////////
    // CONTROLS  //
    ///////////////////
    controls = new THREE.OrbitControls( camera );
    controls.update();

    ///////////////////
    // SURROUNDINGS  //
    ///////////////////
    var insideGeometry = new THREE.IcosahedronGeometry(500, 1);
    var domeMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFffff,
      shading: THREE.FlatShading,
      side: THREE.BackSide
    });
    var dome = new THREE.Mesh(insideGeometry, domeMaterial);
    scene.add(dome);

    var floorGeometry = new THREE.PlaneGeometry(2000, 2000, 20, 20);
    var floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xff8888,
      specular: 0xff0000,
      shininess: 100
    });
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.z = -4*r-r/14;
    floor.receiveShadow = true;
    scene.add(floor);

    ///////////////////
    // SPHERE  //
    ///////////////////
    var meshMaterial = new THREE.MeshBasicMaterial({
      color: 0xfb355f, wireframe: true
    });
    // Setting target to center of the sphere. Target is the direction in which plates will be oriented
    target = new THREE.Vector3(0,0,0);
    geometry = new THREE.SphereGeometry(r,  r, r);
    mesh = new THREE.Mesh(geometry, meshMaterial);
    scene.add(mesh);

    ///////////////////
    // PLATES ON SPHERE  //
    ///////////////////
    var boxMaterial = new THREE.MeshPhongMaterial({ // Required For Shadows
      color: 0xecebec,
      specular: 0xffffff,
      shininess: 30
    });
    for (var i = 0; i < geometry.vertices.length; i++) {
        let boxGeometry = new THREE.BoxGeometry( r/9 ,r/9, r/25 );
        let box = new THREE.Mesh( boxGeometry, boxMaterial );
        box.position.set(geometry.vertices[i].x, geometry.vertices[i].y, geometry.vertices[i].z);
        box.objectIndex = i;
        box.castShadow = true;
        box.receiveShadow = true;
        objects.push(box);
        plateObjects.push(new PlateObject(i));
        scene.add(box)
    }

    ///////////////////
    // RAYCASTER  //
    ///////////////////
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    ///////////////////
    // RENDERER  //
    ///////////////////
    renderer = new THREE.WebGLRenderer( { antialias: false });
    renderer.setClearColor(scene.fog.color);
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true; //Shadow
    renderer.shadowMapSoft = true; // Shadow
    renderer.shadowMap.type = THREE.PCFShadowMap; //Shadow  
    
    ///////////////////
    // EVENT LISTENERS  //
    ///////////////////
    window.addEventListener( 'mousemove', onDocumentMouseMove, false );
    window.addEventListener( 'resize', onWindowResize, false );


    container = document.getElementById( 'container' );
    container.appendChild( renderer.domElement );
    time = 0;
    animate();
}

function animate() {
    time++;
    controls.update();
    render();
    requestAnimationFrame( animate );
    updateSphere(time);
    peelSphere();
}

function render() {
    renderer.render( scene, camera );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    render();
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    mouse.x = (event.clientX / renderer.domElement.width ) * 2 - 1;
    mouse.y = - ( event.clientY/renderer.domElement.height ) * 2 + 1;
}

function peelSphere() {
    raycaster.setFromCamera( mouse, camera);
    var intersects = raycaster.intersectObjects( objects )
   
    if (intersects.length > 0) {
        plateObjects[intersects[0].object.objectIndex].flying = true;
    }
}

function updateSphere(time) {
    for (var i = 0; i < geometry.vertices.length; i++) {
        plateObjects[i].update();
    }
    geometry.rotateZ(rotationSpeedZ);
    geometry.rotateX(rotationSpeedX);
    geometry.verticesNeedUpdate = true;
}

function PlateObject(index) {
    this.flying = false;
    this.position = geometry.vertices[index].clone();
    this.previousPosition = objects[index].position;
    this.index = index;
    this.vel = new THREE.Vector3();
    this.level = 0;
    this.offset = r*4;
    this.ripped = false;

    this.update = function(){
        if (!this.done){
            if (!this.flying && !this.done) {
                this.previousPosition = this.position;
                this.position = geometry.vertices[this.index].clone();
                objects[this.index].lookAt(target);
            } else if (this.done){
                this.z = - this.offset;
            } else {
                if (this.position.z <= -this.offset) {
                    this.done = true;
                    this.position.z = -this.offset;
                    objects[this.index].position.set(this.position.x, this.position.y, this.position.z);
                } else {
                    //WHEN THE PLATE IS RIPPED OFF
                    if (this.flying && !this.ripped) {
                        this.vel.subVectors( this.position, this.previousPosition );
                        this.ripped = true;
                    }
                    this.vel.z -= G;
                    this.position.add(this.vel);
                }
            }
            objects[this.index].position.set(this.position.x, this.position.y, this.position.z);
        }
    }
}
