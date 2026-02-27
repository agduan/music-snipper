const FALLBACK = { r: 140, g: 126, b: 111 }; // warm brown #8C7E6F

export function extractDominantColor(imageUrl) {
  if (!imageUrl) return rgbToHex(FALLBACK);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rgbToHex(FALLBACK));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const buckets = {};
        const step = 4;
        for (let i = 0; i < data.length; i += step * 3) {
          const r = Math.floor(data[i] / 32) * 32;
          const g = Math.floor(data[i + 1] / 32) * 32;
          const b = Math.floor(data[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }

        let maxCount = 0;
        let dominant = FALLBACK;
        for (const [key, count] of Object.entries(buckets)) {
          if (count > maxCount) {
            maxCount = count;
            const [r, g, b] = key.split(',').map(Number);
            dominant = { r, g, b };
          }
        }
        resolve(rgbToHex(dominant));
      } catch {
        resolve(rgbToHex(FALLBACK));
      }
    };

    img.onerror = () => resolve(rgbToHex(FALLBACK));
    img.src = imageUrl;
  });
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
