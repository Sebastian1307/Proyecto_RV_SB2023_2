import * as THREE from "three";

import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let marker, floor, baseReferenceSpace;

let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.updateProjectionMatrix(); // asegúrate de actualizar la matriz de proyección
  camera.frustumCulled = false; // desactiva el culling del frustum

  camera.position.set(0, 1, 3);

  scene.background = new THREE.CubeTextureLoader()
    .setPath("assets/")
    .load([
      "sh_lf.png",
      "sh_rt.png",
      "sh_up.png",
      "sh_dn.png",
      "sh_ft.png",
      "sh_bk.png",
    ]);
  //
  const luz2 = new THREE.HemisphereLight(0xffffff, 0xfffff, 1);
  scene.add(luz2);
  luz2.castShadow = true;

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  light.castShadow = true; // Habilitar sombras para la luz
  scene.add(light);

  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(marker);

  // Dimensiones del suelo
  const floorWidth = 50;
  const floorHeight = 50;

  const floortext = new THREE.TextureLoader().load("assets/galleryfloor.jpg");
  // Configura la repetición de la textura
  floortext.wrapS = THREE.RepeatWrapping; // Repetición en la dirección horizontal (x)
  floortext.wrapT = THREE.RepeatWrapping; // Repetición en la dirección vertical (y)

  // Establece el número de repeticiones en x e y
  floortext.repeat.set(10, 10); // Ajusta el valor según sea necesario
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorHeight, 2, 2).rotateX(
      -Math.PI / 2
    ),
    new THREE.MeshStandardMaterial({
      map: floortext,
      color: 0xffffff,
    })
  );
  floor.receiveShadow = true; // Permitir que el suelo reciba sombras
  scene.add(floor);

  const wallHeight = 10;

  // Crear las paredes con textura
  const walls = new THREE.Group();
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });

  // Pared izquierda
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(1, wallHeight, floorHeight),
    wallMaterial
  );
  leftWall.position.set(-floorWidth / 2, wallHeight / 2, 0);
  leftWall.castShadow = true;
  walls.add(leftWall);

  // Pared derecha
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(1, wallHeight, floorHeight),
    wallMaterial
  );
  rightWall.position.set(floorWidth / 2, wallHeight / 2, 0);
  rightWall.castShadow = true;
  walls.add(rightWall);

  // Pared frontal
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(floorWidth, wallHeight, 1),
    wallMaterial
  );
  frontWall.position.set(0, wallHeight / 2, -floorHeight / 2);
  frontWall.castShadow = true;
  walls.add(frontWall);

  // Pared trasera
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(floorWidth, wallHeight, 1),
    wallMaterial
  );
  backWall.position.set(0, wallHeight / 2, floorHeight / 2);
  backWall.castShadow = true;
  walls.add(backWall);

  scene.add(walls);
 // Cargar modelo OBJ para el cuadro y el marco
 const objLoader = new OBJLoader();
 let frame, painting;

 // Cargar modelo OBJ para el cuadro y el marco
 objLoader.load("assets/cuadro.obj", (object) => {
   frame = object;
   frame.scale.set(0.1, 0.1, 0.1);
   frame.rotation.y = Math.PI / 2; // Ajusta la rotación según sea necesario

   // Poner un cuadro en la pared izquierda
   const leftPainting = frame.clone();
   leftPainting.position.set(-floorWidth / 2 + 1, wallHeight / 2 + 2, 0);
   scene.add(leftPainting);

   // Cargar imagen para el cuadro en la pared izquierda
   const leftTexture = new THREE.TextureLoader().load("assets/pintura.jpeg"); // Reemplaza con la ruta de tu imagen
   leftPainting.traverse((child) => {
     if (child.isMesh) {
       child.material.map = leftTexture;
     }
   });
 });


  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.xr.addEventListener(
    "sessionstart",
    () => (baseReferenceSpace = renderer.xr.getReferenceSpace())
  );
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // controllers

  function onSelectStart() {
    this.userData.isSelecting = true;
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;

    if (INTERSECTION) {
      const offsetPosition = {
        x: -INTERSECTION.x,
        y: -INTERSECTION.y,
        z: -INTERSECTION.z,
        w: 1,
      };
      const offsetRotation = new THREE.Quaternion();
      const transform = new XRRigidTransform(offsetPosition, offsetRotation);
      const teleportSpaceOffset =
        baseReferenceSpace.getOffsetReferenceSpace(transform);

      renderer.xr.setReferenceSpace(teleportSpaceOffset);
    }
  }

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controller1.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller1.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("connected", function (event) {
    this.add(buildController(event.data));
  });
  controller2.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(
    controllerModelFactory.createControllerModel(controllerGrip2)
  );
  scene.add(controllerGrip2);

  //

  window.addEventListener("resize", onWindowResize, false);
}

function buildController(data) {
  let geometry, material;

  switch (data.targetRayMode) {
    case "tracked-pointer":
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      material = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Line(geometry, material);

    case "gaze":
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
  }
}

let infoPanel; // variable para almacenar la interfaz de información

function createInfoPanel(name, description) {
  const panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.top = "10%";
  panel.style.left = "50%";
  panel.style.transform = "translate(-50%, 0)";
  panel.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  panel.style.padding = "10px";
  panel.style.borderRadius = "5px";
  panel.style.pointerEvents = "auto";

  const title = document.createElement("h3");
  title.textContent = name;

  const desc = document.createElement("p");
  desc.textContent = description;

  panel.appendChild(title);
  panel.appendChild(desc);

  return panel;
}

function showInfoPanel(name, description) {
  infoPanel = createInfoPanel(name, description);
  document.body.appendChild(infoPanel);
}

function hideInfoPanel() {
  if (infoPanel) {
    document.body.removeChild(infoPanel);
    infoPanel = undefined;
  }
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  renderer.setAnimationLoop(render);
}


function render() {
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor, leftPainting]); // Asegúrate de agregar el objeto del cuadro

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
      showInfoPanel("Obra de arte", "Descripción de la obra de arte."); // Puedes personalizar esto con los detalles de la obra
    } else {
      hideInfoPanel();
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor, leftPainting]); // Asegúrate de agregar el objeto del cuadro

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
      showInfoPanel("Obra de arte", "Descripción de la obra de arte."); // Puedes personalizar esto con los detalles de la obra
    } else {
      hideInfoPanel();
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}