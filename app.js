const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
let images = [];

let selectedImage = null;
let offsetX = 0;
let offsetY = 0;

// Resize canvas to video
function resizeCanvas() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      resizeCanvas();
      draw();
    };
  })
  .catch(err => alert('Camera access denied'));

document.getElementById('imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const scale = 0.3;
    images.push({
      img,
      x: canvas.width / 2 - img.width * scale / 2,
      y: canvas.height / 2 - img.height * scale / 2,
      scale
    });
  };
  img.src = URL.createObjectURL(file);
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (let i = images.length - 1; i >= 0; i--) {
    const image = images[i];
    const w = image.img.width * image.scale;
    const h = image.img.height * image.scale;
    if (x >= image.x && x <= image.x + w && y >= image.y && y <= image.y + h) {
      selectedImage = image;
      offsetX = x - image.x;
      offsetY = y - image.y;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!selectedImage) return;
  const rect = canvas.getBoundingClientRect();
  selectedImage.x = e.clientX - rect.left - offsetX;
  selectedImage.y = e.clientY - rect.top - offsetY;
});

canvas.addEventListener('mouseup', () => {
  selectedImage = null;
});

canvas.addEventListener('wheel', (e) => {
  if (!selectedImage) return;
  e.preventDefault();
  selectedImage.scale += e.deltaY * -0.001;
  selectedImage.scale = Math.max(0.05, Math.min(selectedImage.scale, 2));
});

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  images.forEach(image => {
    const w = image.img.width * image.scale;
    const h = image.img.height * image.scale;
    ctx.drawImage(image.img, image.x, image.y, w, h);

    // Show dimensions
    const cmWidth = (w / canvas.width * 100).toFixed(1); // assume canvas width = 100cm
    const cmHeight = (h / canvas.height * 100).toFixed(1);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'yellow';
    ctx.fillText(`${cmWidth}cm x ${cmHeight}cm`, image.x, image.y - 10);
  });
}

function resetImages() {
  images = [];
}
