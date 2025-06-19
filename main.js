// main.js
// This is a simplified version. Full code already shared previously.
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// Scene setup, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const imageUpload = document.getElementById('image-upload');
const imageUploadContainer = document.getElementById('image-upload-container');
const placementUI = document.getElementById('placement-ui');
const controlsUI = document.getElementById('controls-ui');
const placeBtn = document.getElementById('place-btn');
const moveBtn = document.getElementById('move-btn');
const resizeBtn = document.getElementById('resize-btn');
const dimensionsDisplay = document.getElementById('dimensions-display').querySelector('span');

let imageTexture = null;
let imageMesh = null;
let imageAspectRatio = 1;
let hasPlaced = false;
let isResizing = false;
let currentImageWidth = 0.5;

function createImageMesh(width) {
  if (imageMesh) {
    scene.remove(imageMesh);
    imageMesh.geometry.dispose();
    imageMesh.material.dispose();
  }
  const height = width / imageAspectRatio;
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: imageTexture, side: THREE.DoubleSide, transparent: true });
  imageMesh = new THREE.Mesh(geometry, material);
  imageMesh.position.set(0, 0, -2);
  scene.add(imageMesh);
  updateDimensionsDisplay();
}

function updateDimensionsDisplay() {
  const w = (currentImageWidth * 100).toFixed(1);
  const h = (currentImageWidth / imageAspectRatio * 100).toFixed(1);
  dimensionsDisplay.textContent = `${w}x${h} cm`;
}

imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      imageTexture = new THREE.Texture();
      imageTexture.image = img;
      imageTexture.needsUpdate = true;
      imageAspectRatio = img.width / img.height;
      createImageMesh(currentImageWidth);
      placementUI.style.display = 'block';
      placeBtn.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

placeBtn.addEventListener('click', () => {
  hasPlaced = true;
  placementUI.style.display = 'none';
  controlsUI.style.display = 'block';
});

moveBtn.addEventListener('click', () => {
  hasPlaced = false;
  placementUI.style.display = 'block';
  controlsUI.style.display = 'none';
});

resizeBtn.addEventListener('click', () => {
  isResizing = true;
});

document.addEventListener('pointermove', (e) => {
  if (isResizing && imageMesh) {
    const deltaY = e.movementY;
    const newWidth = Math.max(0.1, Math.min(3.0, currentImageWidth - deltaY * 0.005));
    if (Math.abs(newWidth - currentImageWidth) > 0.01) {
      currentImageWidth = newWidth;
      createImageMesh(currentImageWidth);
    }
  }
});

document.addEventListener('pointerup', () => {
  isResizing = false;
});

// AR Button
const webxrBtn = ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test', 'dom-overlay'],
  domOverlay: { root: document.body }
});
const btnContainer = document.getElementById('ar-button');
btnContainer.replaceWith(webxrBtn);

// Animate
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
