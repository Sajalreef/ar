// main.js - NO CHANGES NEEDED FOR CDN
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js'; // For the AR button and session handling

// --- Three.js Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true for transparent background in AR
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true; // Enable WebXR for the renderer
document.body.appendChild(renderer.domElement);

// --- UI Elements ---
const arButton = document.getElementById('ar-button');
const placementUI = document.getElementById('placement-ui');
const placeBtn = document.getElementById('place-btn');
const imageUploadContainer = document.getElementById('image-upload-container');
const imageUpload = document.getElementById('image-upload');
const controlsUI = document.getElementById('controls-ui');
const moveBtn = document.getElementById('move-btn');
const resizeBtn = document.getElementById('resize-btn');
const dimensionsDisplay = document.getElementById('dimensions-display').querySelector('span');

// --- Image Variables ---
let imageMesh = null;
let imageTexture = null;
let imageAspectRatio = 1;
let hasPlaced = false;
let isMoving = false;
let isResizing = false;
const MIN_SIZE = 0.1; // 10cm in meters
const MAX_SIZE = 3.0; // 3m in meters
const METERS_TO_CM = 100;
let currentImageWidth = 0.5; // Default width

// --- WebXR Variables ---
let hitTestSource = null;
let hitTestSourceInitialized = false;
let xrRefSpace = null; // Reference space for tracking

// --- State Management ---
let currentState = 'upload'; // upload -> placing -> placed

// --- Helper Functions ---
function updateDimensionsDisplay() {
    if (imageMesh) {
        const widthCm = (currentImageWidth * METERS_TO_CM).toFixed(1);
        const heightCm = (currentImageWidth / imageAspectRatio * METERS_TO_CM).toFixed(1);
        dimensionsDisplay.textContent = `${widthCm}x${heightCm} cm`;
    }
}

function setState(newState) {
    currentState = newState;
    imageUploadContainer.style.display = 'none';
    placementUI.style.display = 'none';
    controlsUI.style.display = 'none';
    arButton.style.display = 'none'; // Hide AR button once session starts or image is uploaded

    switch (currentState) {
        case 'upload':
            imageUploadContainer.style.display = 'block';
            arButton.style.display = 'block'; // Show AR button if not in session
            break;
        case 'placing':
            placementUI.style.display = 'block';
            if (imageMesh) placeBtn.style.display = 'block'; // Show place button after image loaded
            break;
        case 'placed':
            controlsUI.style.display = 'block';
            placeBtn.style.display = 'none'; // Hide place button once placed
            break;
    }
}

// --- Create Image Mesh ---
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
    imageMesh.position.set(0, 0, -2); // Initial position, will be updated by hit test or placement
    scene.add(imageMesh);
    currentImageWidth = width;
    updateDimensionsDisplay();
}

// --- WebXR Session Management ---
renderer.xr.addEventListener('sessionstart', () => {
    console.log('XR Session Started');
    // Hide upload UI and show placement UI
    if (imageTexture) {
        setState('placing');
    } else {
        setState('upload'); // Stay in upload state if no image yet
    }
    document.body.appendChild(ARButton.domOverlay);
});

renderer.xr.addEventListener('sessionend', () => {
    console.log('XR Session Ended');
    hitTestSourceInitialized = false;
    hitTestSource = null;
    xrRefSpace = null;
    hasPlaced = false;
    if (imageMesh) {
        scene.remove(imageMesh);
        imageMesh = null;
    }
    setState('upload'); // Go back to upload state
    if (ARButton.domOverlay && ARButton.domOverlay.parentNode) {
        document.body.removeChild(ARButton.domOverlay);
    }
});

// --- AR Button Setup ---
// ARButton creates a button that requests an AR session.
// It also handles the default DOM overlay for permissions.
arButton.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test', 'dom-overlay', 'local-floor'], // 'local-floor' for better reference space
    domOverlay: { root: document.body }
}));

// --- Render Loop ---
function render(timestamp, frame) {
    if (frame) {
        const session = renderer.xr.getSession();

        if (session && !hitTestSourceInitialized) {
            session.requestReferenceSpace('viewer').then((refSpace) => {
                session.requestHitTestSource({ space: refSpace }).then((source) => {
                    hitTestSource = source;
                    hitTestSourceInitialized = true;
                    console.log('Hit test source initialized');
                });
            });
            session.requestReferenceSpace('local-floor').then((refSpace) => {
                xrRefSpace = refSpace;
                console.log('Local-floor reference space initialized');
            });
        }

        if (hitTestSourceInitialized && xrRefSpace && currentState === 'placing' && imageMesh) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hitPose = hitTestResults[0].getPose(xrRefSpace);
                // Update imageMesh position to follow the hit test result
                imageMesh.position.copy(hitPose.transform.position);
                imageMesh.quaternion.copy(hitPose.transform.orientation);
                // Ensure the image faces the camera roughly
                imageMesh.rotation.y += Math.PI; // Adjust as needed
                // If the user has not placed it yet, update the preview position
                if (!hasPlaced) {
                    placeBtn.style.display = 'block'; // Show place button once a hit test is available
                }
            } else {
                placeBtn.style.display = 'none'; // Hide place button if no hit test
            }
        }
    }

    renderer.render(scene, camera);
}
renderer.setAnimationLoop(render);

// --- Event Listeners ---

// Handle image upload
imageUpload.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.onload = function() {
            if (imageMesh) {
                scene.remove(imageMesh);
            }
            imageTexture = new THREE.Texture(image);
            imageTexture.needsUpdate = true;
            imageAspectRatio = image.width / image.height;
            createImageMesh(currentImageWidth); // Create with default width
            // If AR session is active, go to placing state, otherwise stay in upload
            if (renderer.xr.isPresenting) {
                setState('placing');
            } else {
                setState('upload'); // User still needs to click 'Start AR'
            }
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Handle 'Place Image' button click
placeBtn.addEventListener('click', () => {
    if (imageMesh && !hasPlaced) {
        hasPlaced = true;
        setState('placed');
        console.log('Image placed!');
    }
});

// Handle 'Move' button click
moveBtn.addEventListener('click', () => {
    isMoving = true;
    isResizing = false;
    hasPlaced = false; // Allow re-placement
    setState('placing');
    console.log('Moving image...');
});

// Handle 'Resize' button click
resizeBtn.addEventListener('click', () => {
    isResizing = true;
    isMoving = false;
    console.log('Resizing image. Use pinch/zoom or drag up/down.');
    // For simplicity, we'll implement a basic drag for resize.
    // In a real AR app, pinch gestures are more common for resize.
});


// Basic interaction for moving/resizing (conceptual, needs refinement for touch)
// For WebXR, touch events would be on the XR controller if available, or screen taps.
// Here, we'll use a simple conceptual interaction for desktop mouse or mobile touch.

let startX, startY, startDistance; // For resizing

document.addEventListener('pointerdown', (event) => {
    if (!renderer.xr.isPresenting || !imageMesh) return;

    const session = renderer.xr.getSession();
    if (!session) return;

    // Simulate a tap for hit testing if the session is active and not currently moving/resizing
    if (!isMoving && !isResizing && !hasPlaced && hitTestSourceInitialized && xrRefSpace) {
        // In a real AR app, you'd get the touch coordinates and perform a more precise hit test
        // This is a simplification: if a hit test is available, we assume the user intends to place
        // on the current detected surface.
        // For actual tap-to-place, you'd need to cast a ray from the screen touch point.
    }

    if (hasPlaced) { // Only interact with placed object
        startX = event.clientX;
        startY = event.clientY;

        if (isResizing) {
            // For resizing, we'll use a simple vertical drag
        } else if (isMoving) {
            // For moving, we'll allow interaction to update the position
            // This re-enables placing state
            hasPlaced = false;
            setState('placing');
        }
    }
});

document.addEventListener('pointermove', (event) => {
    if (!renderer.xr.isPresenting || !imageMesh || !hasPlaced) return;

    const session = renderer.xr.getSession();
    if (!session) return;

    if (isResizing) {
        const deltaY = event.clientY - startY;
        // Adjust scale based on vertical drag
        let newWidth = currentImageWidth - (deltaY * 0.005); // Arbitrary scaling factor
        newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newWidth));
        if (newWidth !== currentImageWidth) {
            createImageMesh(newWidth);
            startY = event.clientY; // Update startY for continuous drag
        }
    }
});

document.addEventListener('pointerup', () => {
    if (isResizing) {
        isResizing = false;
        // Optionally go back to placed state if not already handled by move/place logic
        if (hasPlaced) { // Ensure we stay in 'placed' state after resizing
            setState('placed');
        }
    }
    // If we were moving, the user has lifted their finger, so we consider it placed again
    if (isMoving) {
        isMoving = false;
        if (!hasPlaced) { // If moving caused re-placement
            hasPlaced = true;
            setState('placed');
        }
    }
});


// Handle window resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial state
setState('upload');