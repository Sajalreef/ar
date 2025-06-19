// // Main variables
// let camera, scene, renderer;
// let controller, controllerGrip;
// let imageMesh = null;
// let imageTexture = null;
// let imageAspectRatio = 1;
// let isMoving = false;
// let isResizing = false;
// let currentIntersection = null;
// let reticle = null;
// let hitTestSource = null;
// let hitTestSourceRequested = false;
// let arSession = false;
// const MIN_SIZE = 0.1; // 10cm in meters
// const MAX_SIZE = 3.0; // 3m in meters
// const METERS_TO_CM = 100;

// // DOM elements
// const uploadContainer = document.getElementById('upload-container');
// const imageUpload = document.getElementById('image-upload');
// const enterAR = document.getElementById('enter-ar');
// const arButton = document.getElementById('ar-button');
// const controlsUI = document.getElementById('controls-ui');
// const moveBtn = document.getElementById('move-btn');
// const resizeBtn = document.getElementById('resize-btn');
// const dimensionsDisplay = document.getElementById('dimensions-display').querySelector('span');
// const unsupportedModal = document.getElementById('unsupported');
// const closeModal = document.getElementById('close-modal');

// // Initialize the scene
// init();

// function init() {
//     // Create scene
//     scene = new THREE.Scene();
    
//     // Create camera
//     camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
//     // Create renderer
//     renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.xr.enabled = true;
//     document.body.appendChild(renderer.domElement);
    
//     // Add window resize handler
//     window.addEventListener('resize', onWindowResize);
    
//     // Add reticle for placement
//     createReticle();
    
//     // Setup event listeners
//     setupEventListeners();
    
//     // Start animation loop
//     renderer.setAnimationLoop(render);
// }

// function setupEventListeners() {
//     // Image upload
//     imageUpload.addEventListener('change', handleImageUpload);
    
//     // AR button
//     arButton.addEventListener('click', startAR);
    
//     // Control buttons
//     moveBtn.addEventListener('click', () => {
//         isMoving = true;
//         isResizing = false;
//         moveBtn.classList.add('active');
//         resizeBtn.classList.remove('active');
//     });
    
//     resizeBtn.addEventListener('click', () => {
//         isResizing = true;
//         isMoving = false;
//         resizeBtn.classList.add('active');
//         moveBtn.classList.remove('active');
//     });
    
//     // Modal close button
//     closeModal.addEventListener('click', () => {
//         unsupportedModal.style.display = 'none';
//     });
// }

// function createReticle() {
//     reticle = new THREE.Mesh(
//         new THREE.RingGeometry(0.05, 0.1, 32).rotateX(-Math.PI / 2),
//         new THREE.MeshBasicMaterial({ color: 0xffffff })
//     );
//     reticle.matrixAutoUpdate = false;
//     reticle.visible = false;
//     scene.add(reticle);
// }

// function handleImageUpload(event) {
//     const file = event.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = function(e) {
//         const image = new Image();
//         image.onload = function() {
//             // Remove previous image if exists
//             if (imageMesh) {
//                 scene.remove(imageMesh);
//             }

//             // Create texture
//             imageTexture = new THREE.Texture(image);
//             imageTexture.needsUpdate = true;
//             imageAspectRatio = image.width / image.height;

//             // Create initial image mesh
//             createImageMesh(0.5); // Default width of 0.5m (50cm)
            
//             // Show AR button if not already in AR
//             if (!arSession) {
//                 enterAR.style.display = 'block';
//             }
//         };
//         image.src = e.target.result;
//     };
//     reader.readAsDataURL(file);
// }

// function createImageMesh(width) {
//     const height = width / imageAspectRatio;
//     const geometry = new THREE.PlaneGeometry(width, height);
//     const material = new THREE.MeshBasicMaterial({
//         map: imageTexture,
//         side: THREE.DoubleSide,
//         transparent: true
//     });

//     imageMesh = new THREE.Mesh(geometry, material);
//     imageMesh.visible = false;
//     scene.add(imageMesh);
//     updateDimensionsDisplay();
// }

// function updateDimensionsDisplay() {
//     if (imageMesh) {
//         const widthCm = Math.round(imageMesh.scale.x * imageMesh.geometry.parameters.width * METERS_TO_CM);
//         const heightCm = Math.round(imageMesh.scale.y * imageMesh.geometry.parameters.height * METERS_TO_CM);
//         dimensionsDisplay.textContent = `${widthCm}cm × ${heightCm}cm`;
//     }
// }

// async function startAR() {
//     // Check if WebXR is available
//     if (!navigator.xr) {
//         showUnsupported();
//         return;
//     }

//     try {
//         // Request AR session
//         const session = await navigator.xr.requestSession('immersive-ar', {
//             requiredFeatures: ['hit-test'],
//             optionalFeatures: ['dom-overlay'],
//             domOverlay: { root: document.body }
//         });
        
//         // Set up session
//         await renderer.xr.setSession(session);
//         arSession = true;
        
//         // Hide upload and AR button, show controls
//         uploadContainer.style.display = 'none';
//         enterAR.style.display = 'none';
//         controlsUI.style.display = 'block';
        
//         // Set up controller
//         setupXRController();
        
//         // Add session end event
//         session.addEventListener('end', onSessionEnd);
//     } catch (error) {
//         console.error('AR session failed:', error);
//         showUnsupported();
//     }
// }

// function showUnsupported() {
//     unsupportedModal.style.display = 'flex';
// }

// function onSessionEnd() {
//     arSession = false;
//     uploadContainer.style.display = 'block';
//     controlsUI.style.display = 'none';
    
//     // Show AR button if we have an image
//     if (imageMesh) {
//         enterAR.style.display = 'block';
//     }
// }

// function setupXRController() {
//     // Create controller
//     controller = renderer.xr.getController(0);
//     controller.addEventListener('select', onSelect);
//     scene.add(controller);
    
//     // Create controller model
//     const controllerModelFactory = new XRControllerModelFactory();
//     controllerGrip = renderer.xr.getControllerGrip(0);
//     controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
//     scene.add(controllerGrip);
// }

// function onSelect() {
//     if (currentIntersection && imageMesh) {
//         if (!imageMesh.visible) {
//             // First placement
//             imageMesh.position.copy(currentIntersection.point);
//             imageMesh.quaternion.copy(reticle.quaternion);
//             imageMesh.visible = true;
//             reticle.visible = false;
//         } else if (isMoving) {
//             // Move the image
//             imageMesh.position.copy(currentIntersection.point);
//             imageMesh.quaternion.copy(reticle.quaternion);
//         } else if (isResizing) {
//             // Resize the image based on distance from controller
//             const distance = controller.position.distanceTo(currentIntersection.point);
//             let scale = THREE.MathUtils.clamp(distance, MIN_SIZE, MAX_SIZE);
//             imageMesh.scale.set(scale, scale, scale);
//             updateDimensionsDisplay();
//         }
//     }
// }

// function onWindowResize() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }

// function render(timestamp, frame) {
//     if (!arSession) {
//         renderer.render(scene, camera);
//         return;
//     }

//     if (frame) {
//         // Get hit test results
//         const referenceSpace = renderer.xr.getReferenceSpace();
//         const session = renderer.xr.getSession();
        
//         if (!hitTestSourceRequested) {
//             session.requestReferenceSpace('viewer').then((referenceSpace) => {
//                 return session.requestHitTestSource({ space: referenceSpace });
//             }).then((source) => {
//                 hitTestSource = source;
//             });
//             hitTestSourceRequested = true;
//         }
        
//         if (hitTestSource) {
//             const hitTestResults = frame.getHitTestResults(hitTestSource);
//             if (hitTestResults.length > 0) {
//                 const hit = hitTestResults[0];
//                 const hitPose = hit.getPose(referenceSpace);
                
//                 if (hitPose) {
//                     reticle.visible = true;
//                     reticle.matrix.fromArray(hitPose.transform.matrix);
                    
//                     // Store current intersection for controller events
//                     currentIntersection = {
//                         point: new THREE.Vector3().setFromMatrixPosition(reticle.matrix),
//                         distance: hitPose.transform.position.z
//                     };
//                 }
//             } else {
//                 reticle.visible = false;
//                 currentIntersection = null;
//             }
//         }
//     }
    
//     renderer.render(scene, camera);
// }
// Detect iPhone 8 Plus
const isiPhone8Plus = /iPhone8,2/.test(navigator.userAgent) || 
                     (navigator.platform === 'iPhone' && window.screen.height === 736);

// Main variables
let camera, scene, renderer;
let controller;
let imageMesh = null;
let imageTexture = null;
let imageAspectRatio = 1;
let isMoving = false;
let isResizing = false;
let reticle = null;
let hitTestSource = null;
let hitTestSourceRequested = false;
let arSession = false;
const MIN_SIZE = 0.1; // 10cm in meters
const MAX_SIZE = 2.0; // Reduced max size for iPhone 8 Plus
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
    // Create scene with simplified lighting
    scene = new THREE.Scene();
    
    // Create camera with adjusted parameters for iPhone 8 Plus
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 10);
    
    // Create optimized renderer
    renderer = new THREE.WebGLRenderer({
        antialias: !isiPhone8Plus, // Disable antialias on iPhone 8 Plus
        alpha: true,
        powerPreference: isiPhone8Plus ? "low-power" : "default"
    });
    
    // Set conservative pixel ratio for iPhone 8 Plus
    renderer.setPixelRatio(isiPhone8Plus ? 1 : window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Add window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Create simplified reticle
    createReticle();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check WebXR availability
    checkXRSupport();
    
    // Start animation loop
    renderer.setAnimationLoop(render);
}

function checkXRSupport() {
    if (!navigator.xr) {
        showUnsupported();
        return;
    }
    
    // Additional check for iPhone 8 Plus compatibility
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (!supported) {
            showUnsupported();
        }
    });
}

function createReticle() {
    // Simplified reticle for better performance
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.08, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

function setupEventListeners() {
    // Image upload with resizing for iPhone 8 Plus
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
    
    // Add warning for iPhone 8 Plus users
    if (isiPhone8Plus) {
        const warning = document.createElement('div');
        warning.id = 'performance-warning';
        warning.textContent = 'Tip: Move your device slowly for better AR detection';
        warning.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 0;
            right: 0;
            text-align: center;
            color: white;
            background-color: rgba(0,0,0,0.7);
            padding: 10px;
            z-index: 1000;
            font-size: 14px;
        `;
        document.body.appendChild(warning);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.onload = function() {
            // Optimize image size for iPhone 8 Plus
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (max 1024px for iPhone 8 Plus)
            let width = image.width;
            let height = image.height;
            const maxSize = isiPhone8Plus ? 1024 : 2048;
            
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize/width, maxSize/height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0, width, height);
            
            // Create texture
            imageTexture = new THREE.Texture(canvas);
            imageTexture.needsUpdate = true;
            imageAspectRatio = width / height;

            // Remove previous image if exists
            if (imageMesh) {
                scene.remove(imageMesh);
            }

            // Create optimized image mesh
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
    
    // Optimized material for iPhone 8 Plus
    const material = new THREE.MeshBasicMaterial({
        map: imageTexture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1 // Helps with transparency performance
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
    try {
        // Request AR session with simplified options for iPhone 8 Plus
        const sessionInit = {
            requiredFeatures: ['hit-test'],
            optionalFeatures: isiPhone8Plus ? [] : ['dom-overlay']
        };
        
        if (!isiPhone8Plus) {
            sessionInit.domOverlay = { root: document.body };
        }

        const session = await navigator.xr.requestSession('immersive-ar', sessionInit);
        
        // Set up session
        await renderer.xr.setSession(session);
        arSession = true;
        
        // Update UI
        uploadContainer.style.display = 'none';
        enterAR.style.display = 'none';
        controlsUI.style.display = 'block';
        
        // Set up controller with simplified model
        setupXRController();
        
        // Add session end event
        session.addEventListener('end', onSessionEnd);
    } catch (error) {
        console.error('AR session failed:', error);
        showUnsupported();
    }
}

function setupXRController() {
    // Simplified controller for iPhone 8 Plus
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);
    
    // Skip complex controller model for iPhone 8 Plus
    if (!isiPhone8Plus) {
        const controllerModelFactory = new XRControllerModelFactory();
        const controllerGrip = renderer.xr.getControllerGrip(0);
        controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
        scene.add(controllerGrip);
    }
}

function onSelect() {
    if (!imageMesh) return;
    
    if (!imageMesh.visible) {
        // Initial placement - use simplified method for iPhone 8 Plus
        if (isiPhone8Plus && !reticle.visible) {
            // Fallback placement when no surfaces detected
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            imageMesh.position.copy(camera.position).add(direction.multiplyScalar(1.2));
            imageMesh.quaternion.copy(camera.quaternion);
        } else {
            // Normal placement when surface is detected
            imageMesh.position.copy(reticle.position);
            imageMesh.quaternion.copy(reticle.quaternion);
        }
        
        imageMesh.visible = true;
        reticle.visible = false;
    } else if (isMoving) {
        // Move the image
        if (reticle.visible) {
            imageMesh.position.copy(reticle.position);
            imageMesh.quaternion.copy(reticle.quaternion);
        }
    } else if (isResizing) {
        // Resize the image based on controller distance
        if (controller && reticle.visible) {
            const distance = controller.position.distanceTo(reticle.position);
            let scale = THREE.MathUtils.clamp(distance * 0.8, MIN_SIZE, MAX_SIZE);
            imageMesh.scale.set(scale, scale, scale);
            updateDimensionsDisplay();
        }
    }
}

function onSessionEnd() {
    arSession = false;
    uploadContainer.style.display = 'block';
    controlsUI.style.display = 'none';
    
    // Reset image visibility
    if (imageMesh) {
        imageMesh.visible = false;
    }
    
    // Show AR button if we have an image
    if (imageMesh) {
        enterAR.style.display = 'block';
    }
}

function showUnsupported() {
    unsupportedModal.style.display = 'flex';
    enterAR.style.display = 'none';
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
        // Simplified hit test for iPhone 8 Plus
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        
        if (!hitTestSourceRequested) {
            session.requestReferenceSpace('viewer').then((refSpace) => {
                return session.requestHitTestSource({
                    space: refSpace,
                    entityTypes: isiPhone8Plus ? ['plane'] : ['plane', 'mesh']
                });
            }).then((source) => {
                hitTestSource = source;
            }).catch(() => {
                // Fallback for when plane detection fails
                hitTestSource = null;
            });
            hitTestSourceRequested = true;
        }
        
        if (hitTestSource && frame.getHitTestResults) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitPose = hit.getPose(referenceSpace);
                
                if (hitPose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(hitPose.transform.matrix);
                }
            } else {
                reticle.visible = false;
            }
        } else {
            reticle.visible = false;
        }
    }
    
    renderer.render(scene, camera);
}