// Main variables
let camera, scene, renderer;
let controller, controllerGrip;
let imageMesh = null;
let imageTexture = null;
let imageAspectRatio = 1;
let isMoving = false;
let isResizing = false;
let currentIntersection = null;
let reticle = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let arSession = false;
const MIN_SIZE = 0.1; // 10cm in meters
const MAX_SIZE = 3.0; // 3m in meters
const METERS_TO_CM = 100;

// DOM elements
const uploadContainer = document.getElementById('upload-container');
const imageUpload = document.getElementById('image-upload');
const enterAR = document.getElementById('enter-ar');
const arButton = document.getElementById('ar-button');
const controlsUI = document.getElementById('controls-ui');
const moveBtn = document.getElementById('move-btn');
const resizeBtn = document.getElementById('resize-btn');
const dimensionsDisplay = document.getElementById('dimensions-display').querySelector('span');
const unsupportedModal = document.getElementById('unsupported');
const closeModal = document.getElementById('close-modal');

// Initialize the scene
init();

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Add window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add reticle for placement
    createReticle();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start animation loop
    renderer.setAnimationLoop(render);
}

function setupEventListeners() {
    // Image upload
    imageUpload.addEventListener('change', handleImageUpload);
    
    // AR button
    arButton.addEventListener('click', startAR);
    
    // Control buttons
    moveBtn.addEventListener('click', () => {
        isMoving = true;
        isResizing = false;
        moveBtn.classList.add('active');
        resizeBtn.classList.remove('active');
    });
    
    resizeBtn.addEventListener('click', () => {
        isResizing = true;
        isMoving = false;
        resizeBtn.classList.add('active');
        moveBtn.classList.remove('active');
    });
    
    // Modal close button
    closeModal.addEventListener('click', () => {
        unsupportedModal.style.display = 'none';
    });
}

function createReticle() {
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.1, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.onload = function() {
            // Remove previous image if exists
            if (imageMesh) {
                scene.remove(imageMesh);
            }

            // Create texture
            imageTexture = new THREE.Texture(image);
            imageTexture.needsUpdate = true;
            imageAspectRatio = image.width / image.height;

            // Create initial image mesh
            createImageMesh(0.5); // Default width of 0.5m (50cm)
            
            // Show AR button if not already in AR
            if (!arSession) {
                enterAR.style.display = 'block';
            }
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function createImageMesh(width) {
    const height = width / imageAspectRatio;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide,
        transparent: true
    });

    imageMesh = new THREE.Mesh(geometry, material);
    imageMesh.visible = false;
    scene.add(imageMesh);
    updateDimensionsDisplay();
}

function updateDimensionsDisplay() {
    if (imageMesh) {
        const widthCm = Math.round(imageMesh.scale.x * imageMesh.geometry.parameters.width * METERS_TO_CM);
        const heightCm = Math.round(imageMesh.scale.y * imageMesh.geometry.parameters.height * METERS_TO_CM);
        dimensionsDisplay.textContent = `${widthCm}cm × ${heightCm}cm`;
    }
}

async function startAR() {
    // Check if WebXR is available
    if (!navigator.xr) {
        showUnsupported();
        return;
    }

    try {
        // Request AR session
        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        
        // Set up session
        await renderer.xr.setSession(session);
        arSession = true;
        
        // Hide upload and AR button, show controls
        uploadContainer.style.display = 'none';
        enterAR.style.display = 'none';
        controlsUI.style.display = 'block';
        
        // Set up controller
        setupXRController();
        
        // Add session end event
        session.addEventListener('end', onSessionEnd);
    } catch (error) {
        console.error('AR session failed:', error);
        showUnsupported();
    }
}

function showUnsupported() {
    unsupportedModal.style.display = 'flex';
}

function onSessionEnd() {
    arSession = false;
    uploadContainer.style.display = 'block';
    controlsUI.style.display = 'none';
    
    // Show AR button if we have an image
    if (imageMesh) {
        enterAR.style.display = 'block';
    }
}

function setupXRController() {
    // Create controller
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);
    
    // Create controller model
    const controllerModelFactory = new XRControllerModelFactory();
    controllerGrip = renderer.xr.getControllerGrip(0);
    controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
    scene.add(controllerGrip);
}

function onSelect() {
    if (currentIntersection && imageMesh) {
        if (!imageMesh.visible) {
            // First placement
            imageMesh.position.copy(currentIntersection.point);
            imageMesh.quaternion.copy(reticle.quaternion);
            imageMesh.visible = true;
            reticle.visible = false;
        } else if (isMoving) {
            // Move the image
            imageMesh.position.copy(currentIntersection.point);
            imageMesh.quaternion.copy(reticle.quaternion);
        } else if (isResizing) {
            // Resize the image based on distance from controller
            const distance = controller.position.distanceTo(currentIntersection.point);
            let scale = THREE.MathUtils.clamp(distance, MIN_SIZE, MAX_SIZE);
            imageMesh.scale.set(scale, scale, scale);
            updateDimensionsDisplay();
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    if (!arSession) {
        renderer.render(scene, camera);
        return;
    }

    if (frame) {
        // Get hit test results
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        
        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                return session.requestHitTestSource({ space: referenceSpace });
            }).then((source) => {
                hitTestSource = source;
            });
            hitTestSourceRequested = true;
        }
        
        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitPose = hit.getPose(referenceSpace);
                
                if (hitPose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(hitPose.transform.matrix);
                    
                    // Store current intersection for controller events
                    currentIntersection = {
                        point: new THREE.Vector3().setFromMatrixPosition(reticle.matrix),
                        distance: hitPose.transform.position.z
                    };
                }
            } else {
                reticle.visible = false;
                currentIntersection = null;
            }
        }
    }
    
    renderer.render(scene, camera);
}