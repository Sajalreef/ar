// Global variables
let currentImageUrl = null;
let isResizing = false;
let isMoving = false;
let currentScale = 1;
let currentPosition = { x: 0, y: 0, z: -2 };

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AR scene
    const scene = document.querySelector('a-scene');
    const imageEntity = document.getElementById('image-entity');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    const resizeBtn = document.getElementById('resize-btn');
    const moveBtn = document.getElementById('move-btn');
    const saveBtn = document.getElementById('save-btn');
    const controls = document.getElementById('controls');

    // Step 1: Upload Image
    uploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentImageUrl = event.target.result;
                placeImageOnWall();
                controls.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Step 2: Place Image in AR
    function placeImageOnWall() {
        imageEntity.setAttribute('geometry', {
            primitive: 'plane',
            width: 1,
            height: 1
        });
        
        imageEntity.setAttribute('material', {
            src: currentImageUrl,
            transparent: true
        });
        
        imageEntity.setAttribute('position', {
            x: currentPosition.x,
            y: currentPosition.y,
            z: currentPosition.z
        });
        
        imageEntity.setAttribute('scale', '1 1 1');
    }

    // Step 3: Resize Functionality
    resizeBtn.addEventListener('click', () => {
        isResizing = true;
        isMoving = false;
        alert('Pinch or use two fingers to resize the image');
    });

    // Step 4: Move Functionality
    moveBtn.addEventListener('click', () => {
        isMoving = true;
        isResizing = false;
        alert('Drag with one finger to move the image');
    });

    // Handle touch events for resizing and moving
    let initialDistance = null;
    
    scene.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
            );
        }
    });

    scene.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (isResizing && e.touches.length === 2) {
            // Resize logic
            const distance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
            );
            
            const scaleFactor = distance / initialDistance;
            currentScale = Math.max(0.5, Math.min(scaleFactor * currentScale, 3));
            
            imageEntity.setAttribute('scale', {
                x: currentScale,
                y: currentScale,
                z: currentScale
            });
        } 
        else if (isMoving && e.touches.length === 1) {
            // Move logic
            const touch = e.touches[0];
            const movementX = touch.clientX - (window.innerWidth / 2);
            const movementY = touch.clientY - (window.innerHeight / 2);
            
            currentPosition.x = movementX * 0.01;
            currentPosition.y = -movementY * 0.01;
            
            imageEntity.setAttribute('position', {
                x: currentPosition.x,
                y: currentPosition.y,
                z: currentPosition.z
            });
        }
    });

    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // Step 5: Save Design
    saveBtn.addEventListener('click', () => {
        if (!currentImageUrl) return;
        
        const design = {
            image: currentImageUrl,
            position: currentPosition,
            scale: currentScale,
            dimensions: {
                width: 1 * currentScale,  // Assuming original width is 1 meter
                height: 1 * currentScale  // Assuming original height is 1 meter
            },
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('savedDesign', JSON.stringify(design));
        
        // Optionally save to server
        // saveToServer(design);
        
        alert('Design saved successfully!');
    });

    // Optional: Load saved design
    function loadSavedDesign() {
        const saved = localStorage.getItem('savedDesign');
        if (saved) {
            const design = JSON.parse(saved);
            currentImageUrl = design.image;
            currentPosition = design.position;
            currentScale = design.scale;
            placeImageOnWall();
            controls.classList.remove('hidden');
        }
    }
    
    // Uncomment to enable loading saved designs on startup
    // loadSavedDesign();
});