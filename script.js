document.getElementById('imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const uploadedImg = document.getElementById('uploaded');
    uploadedImg.setAttribute('src', event.target.result);

    // Optional: Adjust plane dimensions dynamically
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const width = 0.4;
      const height = width / aspectRatio;

      // update both planes and text
      [0, 1].forEach(index => {
        const plane = document.getElementById(`plane${index}`);
        const text = document.getElementById(`text${index}`);
        plane.setAttribute('width', width);
        plane.setAttribute('height', height);

        const realWidth = (width * 100).toFixed(0);
        const realHeight = (height * 100).toFixed(0);
        text.setAttribute('value', `${realWidth}cm x ${realHeight}cm`);
      });
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});
