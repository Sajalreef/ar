// Full working example: Zappar Instant World Tracking with camera debug
import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import './index.css';

if (ZapparThree.browserIncompatible()) {
  ZapparThree.browserIncompatibleUI();
  throw new Error('Unsupported browser');
}

const manager = new ZapparThree.LoadingManager();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new ZapparThree.Camera();
ZapparThree.glContextSet(renderer.getContext());
scene.background = camera.backgroundTexture;

ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) {
    console.log('Permission granted ✅');
    camera.start();
    console.log('Camera started:', camera);
  } else {
    ZapparThree.permissionDeniedUI();
  }
});

const instantTracker = new ZapparThree.InstantWorldTracker();
const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);
scene.add(instantTrackerGroup);

const planeTexture = new THREE.TextureLoader(manager).load('image.jpg');
const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture });
const planeGeometry = new THREE.PlaneGeometry(1, 1.5);
const imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
imagePlane.visible = false;
instantTrackerGroup.add(imagePlane);

const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.position.set(0, 5, 0);
instantTrackerGroup.add(directionalLight);

const ambientLight = new THREE.AmbientLight('white', 0.4);
instantTrackerGroup.add(ambientLight);

let hasPlaced = false;
const placeButton = document.getElementById('tap-to-place') || document.createElement('button');
placeButton.textContent = 'Place Image';
placeButton.style.position = 'absolute';
placeButton.style.bottom = '20px';
placeButton.style.left = '50%';
placeButton.style.transform = 'translateX(-50%)';
placeButton.style.padding = '10px 20px';
placeButton.style.zIndex = '10';
placeButton.style.fontSize = '16px';
placeButton.style.backgroundColor = '#0080ff';
placeButton.style.color = 'white';
placeButton.style.border = 'none';
placeButton.style.borderRadius = '5px';
placeButton.style.cursor = 'pointer';
document.body.appendChild(placeButton);

placeButton.addEventListener('click', () => {
  hasPlaced = true;
  imagePlane.visible = true;
  placeButton.remove();
  console.log('✅ Image placed');
});

function render() {
  if (!hasPlaced) {
    instantTrackerGroup.setAnchorPoseFromCameraOffset(0, 0, -3);
  }
  camera.updateFrame(renderer);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
