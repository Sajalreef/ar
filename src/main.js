import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

const app = document.getElementById('app');
const unsupported = document.getElementById('unsupported');
const imageUpload = document.getElementById('imageUpload');
const canvas = document.getElementById('xr-canvas');

if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (supported) {
      app.classList.remove('hidden');
    } else {
      unsupported.classList.remove('hidden');
    }
  });
} else {
  unsupported.classList.remove('hidden');
}

let scene, camera, renderer, controller, imageMesh;

function initAR(imageTexture) {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: imageTexture });
  imageMesh = new THREE.Mesh(geometry, material);

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.position.set(0, 0, -2).applyMatrix4(controller.matrixWorld);
    imageMesh.position.copy(reticle.position);
    scene.add(imageMesh);
  });
  scene.add(controller);

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(e.target.result, (texture) => {
        initAR(texture);
      });
    };
    reader.readAsDataURL(file);
  }
});
