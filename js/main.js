import * as THREE from "three";

import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

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

  const envmap = new THREE.CubeTextureLoader()
    .setPath("assets/")
    .load([
      "sh_lf.png",
      "sh_rt.png",
      "sh_up.png",
      "sh_dn.png",
      "sh_ft.png",
      "sh_bk.png",
    ]);

  scene.background = envmap;
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
    new THREE.MeshPhysicalMaterial({
      map: floortext,
      color: 0xffffff,
      metalness: 0.8, // Ajusta según sea necesario
      roughness: 0.1, // Ajusta según sea necesario
      envMap: envmap, // Asigna el entorno de mapeo
      envMapIntensity: 0.1, // Ajusta según sea necesario
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
    frame.scale.set(0.6, 0.6, 0.1);
    frame.rotation.y = Math.PI / 2; // Ajusta la rotación según sea necesario
    frame.position.y += -4;

    // Poner un cuadro en la pared izquierda
    const leftPainting = frame.clone();
    leftPainting.position.set(-floorWidth / 2 + 1, wallHeight / 2 + 2, 0);
    scene.add(leftPainting);

    // Cargar imagen para el cuadro en la pared izquierda
    const leftTexture = new THREE.TextureLoader().load("assets/pintura3.jpeg"); // Reemplaza con la ruta de tu imagen
    // Escala de la textura para que se ajuste al marco
    const textureScaleX = 0.9; // Ajusta según sea necesario
    const textureScaleY = 0.9; // Ajusta según sea necesario

    leftPainting.traverse((child) => {
      if (child.isMesh) {
        child.material.map = leftTexture;
        child.material.map.repeat.set(textureScaleX, textureScaleY);
        child.material.map.wrapS = THREE.RepeatWrapping;
        child.material.map.wrapT = THREE.RepeatWrapping;
      }
    });
  });
  // Crear cilindros como exhibidores
  const numExhibitors = 3;
  const exhibitors = new THREE.Group();
  const cylinderRadius = 0.7;
  const cylinderHeight = 1;

  for (let i = 0; i < numExhibitors; i++) {
    const angle = (i / numExhibitors) * Math.PI * 2;

    // Ajusta la distancia de los cilindros para que no se salgan de las paredes
    const distanceToWall = floorWidth / 2 - cylinderRadius - 0.3; // 0.3 es la nueva separación
    const x = Math.cos(angle) * distanceToWall;
    const z = Math.sin(angle) * distanceToWall;

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(
        cylinderRadius,
        cylinderRadius,
        cylinderHeight,
        32
      ),
      new THREE.MeshStandardMaterial({
        color: 0x695756,
        metalness: 1, // Ajusta según sea necesario
        roughness: 0, // Ajusta según sea necesario
        envMap: envmap, // Asigna el entorno de mapeo
        envMapIntensity: 1, // Ajusta según sea necesario
      })
    );

    cylinder.position.set(x, cylinderHeight / 2, z);
    cylinder.castShadow = true;
    exhibitors.add(cylinder);
  }

  scene.add(exhibitors);

  // Cargar instancias de los cargadores
  const objLoaderEx = new OBJLoader();
  const mtlLoaderEx = new MTLLoader();

  // Rutas de los archivos OBJ y MTL para cada modelo
  const objPaths = [
    "assets/caballero.obj",
    "assets/caballero2.obj",
    "assets/caballero3.obj",
  ];
  const mtlPaths = [
    "assets/caballero.mtl",
    "assets/caballero2.mtl",
    "assets/caballero3.mtl",
  ];

  const models = []; // Array para almacenar los modelos cargados

  // Cargar modelos para cada cilindro
  for (let i = 0; i < numExhibitors; i++) {
    const objPath = objPaths[i];
    const mtlPath = mtlPaths[i];

    mtlLoaderEx.load(mtlPath, (materials) => {
      materials.preload();
      objLoaderEx.setMaterials(materials);

      objLoaderEx.load(objPath, (model) => {
        models.push(model);

        if (models.length === numExhibitors) {
          // Todos los modelos cargados, posicionar sobre los cilindros
          for (let j = 0; j < models.length; j++) {
            const selectedExhibitor = exhibitors.children[j];
            models[j].position.copy(selectedExhibitor.position);
            models[j].position.y += cylinderHeight / 2;

            // Marcar para rotación
            models[j].userData.rotate = true;

            scene.add(models[j]);
          }
        }
      });
    });
  }

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


// Obtén la referencia al elemento "toast"
const toastElement = document.getElementById("toast");

// Función para mostrar la interfaz
function showInterface(artworkTitle, artworkDescription) {
  // Muestra el "toast"
  toastElement.style.display = "block";

  // Llena la información de la obra de arte en el "toast"
  document.getElementById("artworkTitle").innerText = artworkTitle;
  document.getElementById("artworkDescription").innerText = artworkDescription;
}

// Función para ocultar la interfaz
function hideInterface() {
  // Oculta el "toast"
  toastElement.style.display = "none";
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
  // Agrega la rotación a los modelos marcados con userData.rotate
  scene.traverse((object) => {
    if (object.isMesh && object.userData.rotate) {
      object.rotation.y += 0.005; // Ajusta la velocidad de rotación según sea necesario
    }
  });
}

function render() {
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;

      // Mostrar el "toast" con información de la obra de arte
      showInterface("Nombre de la obra", "Descripción de la obra");
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;

      // Mostrar el "toast" con información de la obra de arte
      showInterface("Nombre de la obra", "Descripción de la obra");
    }
  } else {
    // Si no hay intersección, oculta el "toast"
    hideInterface();
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}
