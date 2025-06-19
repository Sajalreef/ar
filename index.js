// Setup ThreeJS
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setAnimationLoop(render);

// Setup Zappar camera
const camera = new ZapparThree.Camera();
ZapparThree.glContextSet(renderer.getContext());

// Create scene
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

// Request camera permission
ZapparThree.permissionRequestUI().then((granted) => {
    if (granted) camera.start();
    else ZapparThree.permissionDeniedUI();
});

// Set up tracker
const tracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

// UI elements
const placementUI = document.getElementById("zappar-placement-ui");
const imageUpload = document.getElementById("image-upload");
const controlsUI = document.getElementById("controls-ui");
const moveBtn = document.getElementById("move-btn");
const resizeBtn = document.getElementById("resize-btn");
const dimensionsDisplay = document.getElementById("dimensions-display");

// Image variables
let imageMesh = null;
let imageTexture = null;
let imageAspectRatio = 1;
let hasPlaced = false;
let isMoving = false;
let isResizing = false;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startDistance = 0;
const MIN_SIZE = 0.1; // 10cm in meters
const MAX_SIZE = 3.0; // 3m in meters

// Conversion factor (1 unit in Three.js = 1 meter in real world)
const METERS_TO_CM = 100;

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

            // Create texture
            imageTexture = new THREE.Texture(image);
            imageTexture.needsUpdate = true;
            imageAspectRatio = image.width / image.height;

            // Create initial image mesh
            createImageMesh(0.5); // Default width of 0.5m (50cm)
            
            // Show placement UI
            placementUI.style.display = "block";
            controlsUI.style.display = "none";
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

function createImageMesh(width) {
    const height = width / imageAspectRatio;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide,
        transparent: true
    });

    imageMesh = new THREE.Mesh(geometry, material);
    imageMesh.position.set(0, 0, 0);
    updateDimensionsDisplay();
}

function updateDimensionsDisplay() {
    if (imageMesh) {
        const widthCm = Math.round(imageMesh.scale.x * imageMesh.geometry.parameters.width * METERS_TO_CM);
        const heightCm = Math.round(imageMesh.scale.y * imageMesh.geometry.parameters.height * METERS_TO_CM);
        dimensionsDisplay.textContent = `Size: ${widthCm}cm × ${heightCm}cm`;
    }
}

// Handle placement
placementUI.addEventListener("click", () => {
    if (imageMesh) {
        trackerGroup.add(imageMesh);
        placementUI.style.display = "none";
        controlsUI.style.display = "block";
        hasPlaced = true;
    }
});

// Control buttons
moveBtn.addEventListener("click", () => {
    isMoving = true;
    isResizing = false;
    moveBtn.classList.add("active");
    resizeBtn.classList.remove("active");
});

resizeBtn.addEventListener("click", () => {
    isResizing = true;
    isMoving = false;
    resizeBtn.classList.add("active");
    moveBtn.classList.remove("active");
});

// Touch/mouse events
renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!hasPlaced || !imageMesh) return;
    
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    
    if (isMoving) {
        startWidth = imageMesh.position.x;
    } else if (isResizing) {
        startDistance = Math.hypot(
            e.clientX - window.innerWidth/2,
            e.clientY - window.innerHeight/2
        );
        startWidth = imageMesh.scale.x;
    }
});

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!hasPlaced || !imageMesh || (!isMoving && !isResizing)) return;
    
    e.preventDefault();
    
    if (isMoving) {
        // Move the image horizontally and vertically
        const deltaX = (e.clientX - startX) * 0.005;
        const deltaY = (e.clientY - startY) * -0.005; // Invert Y axis
        
        imageMesh.position.x = startWidth + deltaX;
        imageMesh.position.y += deltaY;
        
        startX = e.clientX;
        startY = e.clientY;
        startWidth = imageMesh.position.x;
    } else if (isResizing) {
        // Resize the image based on pinch/scroll
        const currentDistance = Math.hypot(
            e.clientX - window.innerWidth/2,
            e.clientY - window.innerHeight/2
        );
        
        let scale = startWidth * (currentDistance / startDistance);
        scale = Math.max(MIN_SIZE, Math.min(scale, MAX_SIZE));
        
        imageMesh.scale.set(scale, scale, 1);
    }
    
    updateDimensionsDisplay();
});

renderer.domElement.addEventListener("pointerup", () => {
    isMoving = false;
    isResizing = false;
    moveBtn.classList.remove("active");
    resizeBtn.classList.remove("active");
});

// Set up our render loop
function render() {
    camera.updateFrame(renderer);

    if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

    renderer.render(scene, camera);
}