// Main application variables
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
let reticle = null;

// Initialize the application
init();

async function init() {
    // Check for WebXR support
    if (!navigator.xr) {
        document.getElementById('loading').textContent = 'WebXR not supported in your browser';
        return;
    }

    // Check if AR is supported
    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!arSupported) {
        document.getElementById('loading').textContent = 'AR not supported on your device';
        return;
    }

    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Create renderer with proper configuration
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        canvas: document.getElementById('ar-canvas')
    });
    renderer.autoClear = false; // Important for AR
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Add light to scene
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
    
    // Create reticle for placement preview
    createReticle();
    
    // Setup UI event listeners
    setupUI();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Hide loading message
    document.getElementById('loading').style.display = 'none';
    
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
        if (reticle) reticle.visible = true;
    });
    
    document.getElementById('select-image').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedImageUrl = URL.createObjectURL(file);
            document.getElementById('place-image').style.display = 'block';
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
            const clonedMesh = tempMesh.clone();
            currentAnchor.add(clonedMesh);
            scene.add(currentAnchor);
            resetPlacementMode();
        }
    });
}

function resetPlacementMode() {
    isPlacingMode = false;
    document.getElementById('scale-controls').style.display = 'none';
    if (tempMesh) {
        scene.remove(tempMesh);
        tempMesh = null;
    }
    if (reticle) reticle.visible = false;
    currentScale = 1;
}

function createReticle() {
    const ringGeometry = new THREE.RingGeometry(0.05, 0.1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    reticle = new THREE.Mesh(ringGeometry, ringMaterial);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);
}

async function startAR() {
    try {
        // First request camera permissions
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.warn('Camera permission error:', error);
        }
        
        // Request AR session
        const sessionInit = { 
            requiredFeatures: ['hit-test', 'local'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        };
        
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
        alert(`AR failed to start: ${error.message}`);
    }
}

function onSessionEnd() {
    arSession = null;
    document.getElementById('start-ar').style.display = 'block';
    document.getElementById('place-image').style.display = 'none';
    document.getElementById('select-image').style.display = 'none';
    resetPlacementMode();
    
    // Clean up
    if (currentAnchor) {
        scene.remove(currentAnchor);
        currentAnchor = null;
    }
    
    // Return to normal rendering loop
    renderer.setAnimationLoop(render);
}

function onSelect() {
    if (isPlacingMode && selectedImageUrl) {
        if (tempMesh) {
            // If we already have a temp mesh, place it
            const clonedMesh = tempMesh.clone();
            currentAnchor.add(clonedMesh);
            scene.add(currentAnchor);
            resetPlacementMode();
        } else if (hitTestSource) {
            // Get the hit test results
            const frame = renderer.xr.getFrame();
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                
                // Create anchor at hit point
                currentAnchor = new THREE.Group();
                const anchor = frame.createAnchor(hit.getAnchorPose().transform, renderer.xr.getReferenceSpace());
                currentAnchor.matrix.fromArray(anchor.anchorSpace.transform.matrix);
                currentAnchor.matrixAutoUpdate = false;
                
                // Create temporary mesh for placement preview
                createImageMesh(selectedImageUrl).then(mesh => {
                    tempMesh = mesh;
                    tempMesh.scale.set(currentScale, currentScale, currentScale);
                });
            }
        }
    }
}

async function createImageMesh(imageUrl) {
    return new Promise((resolve, reject) => {
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
                opacity: 0.9
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2; // Make it face up initially
            
            resolve(mesh);
        }, undefined, reject);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    if (!frame || !arSession) {
        // Regular non-AR rendering
        renderer.clear();
        renderer.render(scene, camera);
        return;
    }
    
    // Get the XR device pose
    const referenceSpace = renderer.xr.getReferenceSpace();
    const pose = frame.getViewerPose(referenceSpace);
    
    if (!pose) {
        return;
    }
    
    // Clear with transparent
    renderer.setClearAlpha(0);
    renderer.clear();
    
    // Get the camera texture from the XR session
    const glLayer = arSession.renderState.baseLayer;
    if (glLayer) {
        // Render camera background
        renderer.clearColor();
        renderer.context.bindFramebuffer(renderer.context.FRAMEBUFFER, null);
        renderer.context.drawImage(glLayer.framebuffer, 0, 0);
    }
    
    // Render AR content
    renderer.clearDepth();
    
    // Update hit test source if needed
    if (!hitTestSourceRequested && frame.session.requestHitTestSource) {
        frame.session.requestHitTestSource({ space: referenceSpace }).then((source) => {
            hitTestSource = source;
            hitTestSourceRequested = true;
        }).catch(err => {
            console.error('Hit test failed:', err);
        });
    }
    
    // Update hit test results for placement
    if (hitTestSource && frame && (isPlacingMode || reticle.visible)) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const hitMatrix = new THREE.Matrix4().fromArray(hit.getPose(referenceSpace).transform.matrix);
            
            // Update reticle position
            if (reticle) {
                reticle.position.setFromMatrixPosition(hitMatrix);
                reticle.visible = true;
            }
            
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
        } else if (reticle) {
            reticle.visible = false;
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
}