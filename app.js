let camera, scene, renderer;
let controller;
let hitTestSource = null;
let hitTestSourceRequested = false;
let arSession = null;
let currentImage = null;
let currentAnchor = null;
let selectedImageUrl = null;
let isPlacingMode = false;
let tempMesh = null;
let currentScale = 1;

// Initialize the application
init();

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        canvas: document.getElementById('ar-canvas')
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Add light to scene
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
    
    // Setup UI event listeners
    setupUI();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Start non-AR scene initially
    renderer.setAnimationLoop(render);
}

function setupUI() {
    document.getElementById('start-ar').addEventListener('click', async () => {
        await startAR();
    });
    
    document.getElementById('place-image').addEventListener('click', () => {
        if (!selectedImageUrl) {
            alert('Please select an image first');
            return;
        }
        isPlacingMode = true;
        document.getElementById('scale-controls').style.display = 'flex';
    });
    
    document.getElementById('select-image').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedImageUrl = URL.createObjectURL(file);
        }
    });
    
    document.getElementById('scale-up').addEventListener('click', () => {
        currentScale *= 1.1;
        if (tempMesh) tempMesh.scale.set(currentScale, currentScale, currentScale);
    });
    
    document.getElementById('scale-down').addEventListener('click', () => {
        currentScale *= 0.9;
        if (tempMesh) tempMesh.scale.set(currentScale, currentScale, currentScale);
    });
    
    document.getElementById('confirm-placement').addEventListener('click', () => {
        if (tempMesh && currentAnchor) {
            currentAnchor.add(tempMesh.clone());
            scene.add(currentAnchor);
            isPlacingMode = false;
            document.getElementById('scale-controls').style.display = 'none';
            tempMesh = null;
        }
    });
}

async function startAR() {
    // Request session with 'local' tracking for world tracking
    const sessionInit = { 
        requiredFeatures: ['hit-test', 'local'], 
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    };
    
    try {
        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        arSession = session;
        
        // Hide start button and show other controls
        document.getElementById('start-ar').style.display = 'none';
        document.getElementById('place-image').style.display = 'block';
        document.getElementById('select-image').style.display = 'block';
        
        // Set up XR session
        await renderer.xr.setSession(session);
        
        // Add controller for hit testing
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);
        
        // Start animation loop
        renderer.setAnimationLoop(render);
        
        // Handle session end
        session.addEventListener('end', onSessionEnd);
    } catch (error) {
        console.error('AR session failed:', error);
        alert('AR not supported or failed to start: ' + error.message);
    }
}

function onSessionEnd() {
    arSession = null;
    document.getElementById('start-ar').style.display = 'block';
    document.getElementById('place-image').style.display = 'none';
    document.getElementById('select-image').style.display = 'none';
    document.getElementById('scale-controls').style.display = 'none';
    
    // Clean up
    if (currentAnchor) {
        scene.remove(currentAnchor);
        currentAnchor = null;
    }
    tempMesh = null;
    isPlacingMode = false;
    
    // Return to normal rendering loop
    renderer.setAnimationLoop(render);
}

function onSelect() {
    if (isPlacingMode && selectedImageUrl && hitTestSource) {
        // Get the hit test results
        const frame = renderer.xr.getFrame();
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            
            // Create anchor at hit point
            if (!currentAnchor) {
                currentAnchor = new THREE.Group();
                const anchor = frame.createAnchor(hit.getAnchorPose().transform, renderer.xr.getReferenceSpace());
                currentAnchor.matrix.fromArray(anchor.anchorSpace.transform.matrix);
                currentAnchor.matrixAutoUpdate = false;
            }
            
            // Create temporary mesh for placement preview
            if (!tempMesh) {
                createImageMesh(selectedImageUrl).then(mesh => {
                    tempMesh = mesh;
                    tempMesh.scale.set(currentScale, currentScale, currentScale);
                });
            }
        }
    }
}

async function createImageMesh(imageUrl) {
    return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(imageUrl, (texture) => {
            // Calculate aspect ratio to maintain proportions
            const aspectRatio = texture.image.width / texture.image.height;
            const width = 0.5;
            const height = width / aspectRatio;
            
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({ 
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Make it face up initially
            
            resolve(mesh);
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    if (frame && arSession) {
        // Request hit test source if not already done
        if (!hitTestSourceRequested) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            hitTestSource = frame.getHitTestSourceForTransientInput({
                profile: 'generic-touchscreen',
                offsetRay: new XRRay(new DOMPointReadOnly(0, 0, 0), {x: 0, y: 0, z: -1, w: 1})
            });
            
            if (hitTestSource) {
                hitTestSourceRequested = true;
            }
        }
        
        // Update hit test results for controller
        if (hitTestSource && frame) {
            const hitTestResults = frame.getHitTestResultsForTransientInput(hitTestSource);
            
            if (hitTestResults.length > 0 && isPlacingMode) {
                const hit = hitTestResults[0];
                const hitMatrix = new THREE.Matrix4().fromArray(hit.inputSource.gamepad.targetRaySpace.transform.matrix);
                
                // Position temporary mesh at hit point
                if (tempMesh) {
                    tempMesh.position.setFromMatrixPosition(hitMatrix);
                    
                    // Make the mesh face the camera
                    const cameraPosition = new THREE.Vector3();
                    camera.getWorldPosition(cameraPosition);
                    tempMesh.lookAt(cameraPosition);
                    
                    // Rotate to make it stand up
                    tempMesh.rotation.x += Math.PI / 2;
                    
                    // Add to scene if not already there
                    if (!tempMesh.parent) {
                        scene.add(tempMesh);
                    }
                }
            }
        }
    }
    
    renderer.render(scene, camera);
}