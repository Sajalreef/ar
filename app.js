
import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { ARButton } from 'https://cdn.skypack.dev/three@0.152.2/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, controller;
let reticle, hitTestSource = null, referenceSpace = null;
let selectedImageUrl = null;
let tempMesh = null;
let currentScale = 1.0;

init();

function init() {
  const container = document.body;
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();
  scene.add(camera);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  controller = renderer.xr.getController(0);
  scene.add(controller);

  const geometry = new THREE.RingGeometry(0.1, 0.11, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => selectedImageUrl = reader.result;
    reader.readAsDataURL(file);
  });

  document.getElementById('placeBtn').onclick = async () => {
    if (!selectedImageUrl || !hitTestSource) return alert('Select image first!');
    const frame = renderer.xr.getFrame();
    const hits = frame.getHitTestResults(hitTestSource);
    if (hits.length === 0) return alert('No surface found. Try pointing at the floor or a wall.');

    const hitPose = hits[0].getPose(referenceSpace);
    if (!hitPose) return;

    if (tempMesh) scene.remove(tempMesh);

    tempMesh = await createImageMesh(selectedImageUrl);
    tempMesh.position.set(
      hitPose.transform.position.x,
      hitPose.transform.position.y,
      hitPose.transform.position.z
    );
    tempMesh.scale.set(currentScale, currentScale, currentScale);
    scene.add(tempMesh);

    document.getElementById('scale-controls').style.display = 'flex';
    reticle.visible = true;
  };

  document.getElementById('scaleUp').onclick = () => {
    if (!tempMesh) return;
    currentScale += 0.1;
    tempMesh.scale.set(currentScale, currentScale, currentScale);
  };

  document.getElementById('scaleDown').onclick = () => {
    if (!tempMesh) return;
    currentScale = Math.max(0.1, currentScale - 0.1);
    tempMesh.scale.set(currentScale, currentScale, currentScale);
  };

  renderer.setAnimationLoop(render);
  renderer.xr.addEventListener('sessionstart', initHitTest);
}

async function initHitTest() {
  const session = renderer.xr.getSession();
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  referenceSpace = await session.requestReferenceSpace('local');
}

async function createImageMesh(url) {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function render(timestamp, frame) {
  if (frame && hitTestSource) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(referenceSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      reticle.visible = false;
    }
  }
  renderer.render(scene, camera);
}
