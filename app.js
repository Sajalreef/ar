let camera, scene, renderer, controller;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
const placedImages = [];

init();
animate();

function init() {
  // Setup scene and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Reticle to show placement point
  const geometry = new THREE.RingGeometry(0.1, 0.12, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  reticle = new THREE.Mesh(geometry, material);
  reticle.visible = false;
  scene.add(reticle);

  // Controller for taps
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Image file upload
  document.getElementById('imageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.onload = () => currentImage = img;
      img.src = URL.createObjectURL(file);
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    placedImages.forEach(o => scene.remove(o));
    placedImages.length = 0;
  });
}

let currentImage = null;

function onSelect() {
  if (reticle.visible && currentImage) {
    const texture = new THREE.CanvasTexture(currentImage);
    const aspect = currentImage.width / currentImage.height;
    const height = 0.4;
    const width = height * aspect;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(reticle.position);
    mesh.quaternion.copy(reticle.quaternion);

    // Display dimension above
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', font => {
      const textGeo = new THREE.TextGeometry(`${(width*100).toFixed(1)} cm`, {
        font, size: 0.05, height: 0.001
      });
      const textMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.set(width / -2, height / 2 + 0.05, 0);
      mesh.add(textMesh);
    });

    placedImages.push(mesh);
    scene.add(mesh);
    currentImage = null;
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then(ref => {
        session.requestHitTestSource({ space: ref }).then(source => hitTestSource = source);
      });
      session.addEventListener('end', () => hitTestSourceRequested = false);
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
        reticle.quaternion.set(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}
