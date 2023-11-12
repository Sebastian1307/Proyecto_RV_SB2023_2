import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { StereoEffect } from 'three/addons/effects/StereoEffect.js';

let camera, scene, renderer, controls, effect;
let floor, walls;

// Gamepad variables
let gamepad, gamepadIndex;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x505050);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Use StereoEffect for VR-like effect
  effect = new StereoEffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  controls = new DeviceOrientationControls(camera);

  // Load floor model
  const loader = new GLTFLoader();
  loader.load('path/to/floor_model.glb', (gltf) => {
    floor = gltf.scene;
    scene.add(floor);
  });

  // Load walls model
  loader.load('path/to/walls_model.glb', (gltf) => {
    walls = gltf.scene;
    scene.add(walls);
  });

  // Setup gamepad
  window.addEventListener('gamepadconnected', onGamepadConnected);
  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize(window.innerWidth, window.innerHeight);
}

function onGamepadConnected(event) {
  gamepad = event.gamepad;
  gamepadIndex = event.gamepad.index;
  console.log(`Gamepad connected: ${gamepad.id}`);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  controls.update(); // Update device orientation controls

  if (gamepad) {
    // Use gamepad input for movement
    const speed = 0.1;
    camera.position.x -= gamepad.axes[0] * speed;
    camera.position.z += gamepad.axes[1] * speed;
  }

  // Render stereo effect
  effect.render(scene, camera);
}
