import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

let camera, scene, raycaster, renderer;
let floor, walls, marker;

let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  scene.background = new THREE.CubeTextureLoader()
  .setPath('assets/')
  .load([
    'sh_lf.png',
    'sh_rt.png',
    'sh_up.png',
    'sh_dn.png',
    'sh_ft.png',
    'sh_bk.png'
  ]);
  

  const textureLoader = new THREE.TextureLoader();
  // Cargar textura para el suelo
const floorLoader = new OBJLoader();
floorLoader.load('assets/galeria_floor.obj', function (floorObject) {
  floorObject.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      // Asignar textura al suelo
      const texture = textureLoader.load('assets/floor_texture.jpg');
      child.material.map = texture;
    }
  });
  floor = floorObject;
  scene.add(floor);
});

// Cargar textura para las paredes
const wallsLoader = new OBJLoader();
wallsLoader.load('assets/galeria_walls.obj', function (wallsObject) {
  wallsObject.traverse(function (child) {
    if (child instanceof THREE.Mesh) {
      // Asignar textura a las paredes
      const texture = textureLoader.load('assets/walls_texture.jpg');
      child.material.map = texture;
    }
  });
  walls = wallsObject;
  scene.add(walls);
});

  // Marker
  marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
  );
  scene.add(marker);

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

  window.addEventListener("resize", onWindowResize, false);

  // Agregar evento de clic en la ventana para simular interacción
  window.addEventListener("click", onWindowClick, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onWindowClick(event) {
  // Obtener posición del clic en la ventana
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Actualizar raycaster y obtener intersección con el suelo
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([floor]);

  // Mover al usuario si hay una intersección válida
  if (intersects.length > 0) {
    INTERSECTION = intersects[0].point;

    // Puedes ajustar la velocidad de movimiento según tus necesidades
    const moveSpeed = 0.1;
    const player = renderer.xr.getSession().renderState.baseLayer;
    player.session.updateRenderState({ baseLayer: player });
    player.session.updateRenderState({ inlineVerticalFieldOfView: 45 });
    player.session.updateRenderState({ fixedFoveation: { stage: 3, viewportScale: 1 } });

    const offsetPosition = {
      x: -INTERSECTION.x * moveSpeed,
      y: -INTERSECTION.y * moveSpeed,
      z: -INTERSECTION.z * moveSpeed,
      w: 1,
    };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const teleportSpaceOffset =
      baseReferenceSpace.getOffsetReferenceSpace(transform);

    renderer.xr.setReferenceSpace(teleportSpaceOffset);
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // Actualizar la posición del marker
  marker.position.copy(camera.position);
  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}
