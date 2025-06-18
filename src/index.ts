import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import './index.css';

// 📁 DOM UI
const btnUpload = document.createElement('input');
btnUpload.type = 'file';
btnUpload.accept = 'image/*';
btnUpload.id = 'imageUpload';
btnUpload.style.cssText = `
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
`;
document.body.appendChild(btnUpload);

const btnPlace = document.createElement('button');
btnPlace.textContent = 'Tap to Place';
btnPlace.id = 'tap-to-place';
btnPlace.style.cssText = `
  display: none;
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  font-size: 18px;
  z-index: 100;
`;
document.body.appendChild(btnPlace);

// Check browser compatibility
if (ZapparThree.browserIncompatible()) {
  ZapparThree.browserIncompatibleUI();
  throw new Error('Unsupported browser');
}

const manager = new ZapparThree.LoadingManager();

// Scene & renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 🚀 Zappar camera
const camera = new ZapparThree.Camera();
ZapparThree.permissionRequestUI().then(granted => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});
ZapparThree.glContextSet(renderer.getContext());
document.body.style.background = 'black';
scene.background = camera.backgroundTexture;

const scene = new THREE.Scene();

// Instant world tracking
const instantTracker = new ZapparThree.InstantWorldTracker();
const instantGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);
scene.add(instantGroup);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
light.position.set(0.5, 1, 0.25);
instantGroup.add(light);

// 📸 User-uploaded image texture placeholder
let userTexture: THREE.Texture | null = null;
let userPlane: THREE.Mesh | null = null;
let placed = false;

// Load user image
btnUpload.onchange = (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      userTexture = new THREE.Texture(img);
      userTexture.needsUpdate = true;

      // Create a plane with that texture
      const ar = img.width / img.height;
      const height = 0.5;
      const width = height * ar;

      const geom = new THREE.PlaneGeometry(width, height);
      const mat = new THREE.MeshBasicMaterial({
        map: userTexture!,
        side: THREE.DoubleSide
      });

      userPlane = new THREE.Mesh(geom, mat);
      userPlane.visible = false;
      instantGroup.add(userPlane!);

      // Enable placement
      btnPlace.style.display = 'block';
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
};

// Place on tap
btnPlace.onclick = () => {
  if (!userPlane) return;
  placed = true;
  userPlane!.visible = true;
  btnPlace.style.display = 'none';
  btnUpload.style.display = 'none';
};

// 🎥 Render loop
function render() {
  if (!placed && userPlane) {
    // Keep it slightly in front till placed
    instantGroup.setAnchorPoseFromCameraOffset(0, 0, -2);
  }

  camera.updateFrame(renderer);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
