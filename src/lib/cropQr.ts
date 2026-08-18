// Detects the dark (black) square frame in an image and returns a cropped,
// centered square PNG so it fits the display box at max size.
export const cropToBlackFrame = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isDark = (i: number) =>
          data[i + 3] > 128 && data[i] < 90 && data[i + 1] < 90 && data[i + 2] < 90;

        // Row/column dark-pixel counts to robustly find the black square bounds
        const rowCounts = new Uint32Array(height);
        const colCounts = new Uint32Array(width);
        const step = Math.max(1, Math.floor(Math.min(width, height) / 600));
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            if (isDark((y * width + x) * 4)) {
              rowCounts[y]++;
              colCounts[x]++;
            }
          }
        }
        const rowThresh = Math.max(3, Math.floor((width / step) * 0.04));
        const colThresh = Math.max(3, Math.floor((height / step) * 0.04));
        let minY = -1, maxY = -1, minX = -1, maxX = -1;
        for (let y = 0; y < height; y++) if (rowCounts[y] >= rowThresh) { minY = y; break; }
        for (let y = height - 1; y >= 0; y--) if (rowCounts[y] >= rowThresh) { maxY = y; break; }
        for (let x = 0; x < width; x++) if (colCounts[x] >= colThresh) { minX = x; break; }
        for (let x = width - 1; x >= 0; x--) if (colCounts[x] >= colThresh) { maxX = x; break; }
        if (minX < 0 || minY < 0 || maxX <= minX || maxY <= minY) return resolve(src);

        // Pad slightly and square it up around the detected frame's center
        const pad = Math.round(Math.min(maxX - minX, maxY - minY) * 0.02);
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(width - 1, maxX + pad);
        maxY = Math.min(height - 1, maxY + pad);
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const size = Math.max(w, h);
        const cx = minX + w / 2;
        const cy = minY + h / 2;
        const sx = Math.max(0, Math.round(cx - size / 2));
        const sy = Math.max(0, Math.round(cy - size / 2));
        const s = Math.min(size, width - sx, height - sy);

        const out = document.createElement("canvas");
        out.width = s;
        out.height = s;
        const octx = out.getContext("2d");
        if (!octx) return resolve(src);
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, s, s);
        octx.drawImage(canvas, sx, sy, s, s, 0, 0, s, s);
        resolve(out.toDataURL("image/png"));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
