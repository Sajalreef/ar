// main.js
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// UI Elements
const imageUpload = document.getElementById('image-upload');
const uploadContainer = document.getElementById('image-upload-container');
const placementUI = document.getElementById('placement-ui');
const controlsUI = document.getElementById('controls-ui');
const placeBtn = document.getElementById('place-btn');
const moveBtn = document.getElementById('move-btn');
const resizeBtn = document.getElementById('resize-btn');
const dimensionsSpan = document.querySelector('#dimensions-display span');

let imageTexture = null;
let imageMesh = null;
let imageAspectRatio = 1;
let currentWidth = 0.5;
let isPlaced = false;
let isResizing = false;

function createImageMesh(width) {
  if (imageMesh) {
    scene.remove(imageMesh);
    imageMesh.geometry.dispose();
    imageMesh.material.dispose();
  }
  const height = width / imageAspectRatio;
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: imageTexture, transparent: true, side: THREE.DoubleSide });
  imageMesh = new THREE.Mesh(geometry, material);
  imageMesh.position.set(0, 0, -2);
  scene.add(imageMesh);
  updateSizeDisplay();
}

function updateSizeDisplay() {
  const w = (currentWidth * 100).toFixed(1);
  const h = ((currentWidth / imageAspectRatio) * 100).toFixed(1);
  dimensionsSpan.textContent = `${w} x ${h} cm`;
}

imageUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = () => {
      imageTexture = new THREE.Texture();
      imageTexture.image = img;
      imageTexture.needsUpdate = true;
      imageAspectRatio = img.width / img.height;
      createImageMesh(currentWidth);
      uploadContainer.style.display = 'none';
      placementUI.style.display = 'block';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

placeBtn.addEventListener('click', () => {
  isPlaced = true;
  placementUI.style.display = 'none';
  controlsUI.style.display = 'block';
});

moveBtn.addEventListener('click', () => {
  isPlaced = false;
  placementUI.style.display = 'block';
  controlsUI.style.display = 'none';
});

resizeBtn.addEventListener('click', () => {
  isResizing = true;
});

document.addEventListener('pointermove', e => {
  if (isResizing && imageMesh) {
    const delta = e.movementY;
    const newWidth = Math.max(0.1, Math.min(3.0, currentWidth - delta * 0.005));
    if (Math.abs(newWidth - currentWidth) > 0.01) {
      currentWidth = newWidth;
      createImageMesh(currentWidth);
    }
  }
});

document.addEventListener('pointerup', () => {
  isResizing = false;
});

const arBtn = ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test', 'dom-overlay'],
  domOverlay: { root: document.body }
});
document.body.appendChild(arBtn);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
