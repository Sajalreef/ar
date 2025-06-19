// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

// Setup a Zappar camera
const camera = new ZapparThree.Camera();

// The Zappar library needs your WebGL context, so pass it
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
    if (granted) camera.start();
    else ZapparThree.permissionDeniedUI();
});

// Set up our instant tracker group
const tracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

// Variables for our image
let imageMesh = null;
const placementUI = document.getElementById("zappar-placement-ui");
const imageUpload = document.getElementById("image-upload");

let hasPlaced = false;

// Handle image upload
imageUpload.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.onload = function() {
            // Remove previous image if exists
            if (imageMesh) {
                trackerGroup.remove(imageMesh);
            }

            // Create texture from the uploaded image
            const texture = new THREE.Texture(image);
            texture.needsUpdate = true;

            // Calculate aspect ratio to maintain proportions
            const aspectRatio = image.width / image.height;
            const width = 1.0; // Fixed width
            const height = width / aspectRatio;

            // Create a plane geometry with the correct aspect ratio
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true
            });

            // Create mesh and position it
            imageMesh = new THREE.Mesh(geometry, material);
            imageMesh.position.set(0, 0, 0);
            
            // Show placement UI
            placementUI.style.display = "block";
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Handle placement
placementUI.addEventListener("click", () => {
    if (imageMesh) {
        trackerGroup.add(imageMesh);
        placementUI.style.display = "none";
        hasPlaced = true;
    }
});

// Set up our render loop
function render() {
    camera.updateFrame(renderer);

    if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

    renderer.render(scene, camera);
}