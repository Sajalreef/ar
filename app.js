
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    const imageEntity = document.getElementById('image-entity');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    const resizeBtn = document.getElementById('resize-btn');
    const moveBtn = document.getElementById('move-btn');
    const saveBtn = document.getElementById('save-btn');
    const dimensionDisplay = document.getElementById('dimension-display');
    const sizeValues = document.querySelectorAll('.size-value');
    const orientationWarning = document.getElementById('orientation-warning');
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    document.body.appendChild(spinner);

    let currentImageUrl = null;
    let isResizing = false;
    let isMoving = false;
    let currentScale = 1;
    let currentPosition = { x: 0, y: 0, z: -2 };
    let initialDistance = null;
    let lastTouchX, lastTouchY;
    let touchStartTime;

    checkARSupport();
    setupEventListeners();
    handleOrientationChange();
    loadSavedDesign();

    function checkARSupport() {
        if (!navigator.xr) {
            alert('AR not supported in your browser. Try Chrome on Android or Safari on iOS.');
        }
    }

    function setupEventListeners() {
        uploadBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', handleImageUpload);
        resizeBtn.addEventListener('click', activateResizeMode);
        moveBtn.addEventListener('click', activateMoveMode);
        saveBtn.addEventListener('click', saveDesign);
        scene.addEventListener('touchstart', handleTouchStart);
        scene.addEventListener('touchmove', handleTouchMove, { passive: false });
        scene.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('resize', handleOrientationChange);
        window.addEventListener('orientationchange', handleOrientationChange);
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        showSpinner(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageUrl = event.target.result;
            placeImageOnWall();
            showSpinner(false);
        };
        reader.onerror = () => {
            alert('Error loading image');
            showSpinner(false);
        };
        reader.readAsDataURL(file);
    }

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
        imageEntity.setAttribute('position', currentPosition);
        imageEntity.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
        updateDimensionDisplay();
    }

    function activateResizeMode() {
        isResizing = true;
        isMoving = false;
        resizeBtn.classList.add('active');
        moveBtn.classList.remove('active');
    }

    function activateMoveMode() {
        isMoving = true;
        isResizing = false;
        moveBtn.classList.add('active');
        resizeBtn.classList.remove('active');
    }

    function handleTouchStart(e) {
        touchStartTime = Date.now();
        if (e.touches.length === 2) {
            initialDistance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
            );
        } else if (e.touches.length === 1 && isMoving) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (Date.now() - touchStartTime < 100) return;
        if (isResizing && e.touches.length === 2) {
            const distance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
            );
            const scaleFactor = distance / initialDistance;
            currentScale = Math.max(0.3, Math.min(scaleFactor * currentScale, 5));
            imageEntity.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
            initialDistance = distance;
            updateDimensionDisplay();
        } else if (isMoving && e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;
            currentPosition.x += deltaX * 0.005;
            currentPosition.y -= deltaY * 0.005;
            currentPosition.x = Math.max(-2, Math.min(2, currentPosition.x));
            currentPosition.y = Math.max(-2, Math.min(2, currentPosition.y));
            imageEntity.setAttribute('position', currentPosition);
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    }

    function handleTouchEnd() {
        initialDistance = null;
    }

    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    function updateDimensionDisplay() {
        const size = (1 * currentScale).toFixed(2);
        const pixelSize = Math.round(1000 * currentScale);
        sizeValues.forEach(el => el.textContent = size);
        dimensionDisplay.innerHTML = `Size: ${size}m × ${size}m<br><small>(${pixelSize}px × ${pixelSize}px)</small>`;
    }

    function saveDesign() {
        if (!currentImageUrl) {
            alert('Please upload an image first');
            return;
        }
        const scale = currentScale;
        const canvasSize = 1000;
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize * scale;
        canvas.height = canvasSize * scale;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement('a');
            link.download = 'my_ar_design.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            const design = {
                image: currentImageUrl,
                position: currentPosition,
                scale: currentScale,
                dimensions: {
                    width: 1 * currentScale,
                    height: 1 * currentScale
                },
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('savedDesign', JSON.stringify(design));
            alert('Image saved to your device!');
        };
        img.src = currentImageUrl;
    }

    function handleOrientationChange() {
        if (window.innerHeight < window.innerWidth) {
            orientationWarning.style.display = 'flex';
        } else {
            orientationWarning.style.display = 'none';
        }
    }

    function showSpinner(show) {
        spinner.style.display = show ? 'block' : 'none';
    }

    function loadSavedDesign() {
        const saved = localStorage.getItem('savedDesign');
        if (saved) {
            try {
                const design = JSON.parse(saved);
                currentImageUrl = design.image;
                currentPosition = design.position || { x: 0, y: 0, z: -2 };
                currentScale = design.scale || 1;
                placeImageOnWall();
            } catch (e) {
                console.error('Error loading saved design:', e);
            }
        }
    }
});
