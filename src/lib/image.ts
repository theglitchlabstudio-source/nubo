/** Resize + compress an uploaded image in the browser (canvas → WebP). Keeps uploads small on mobile data. */
export async function compressImage(file: File, maxSize: number, quality = 0.84): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', quality),
  );
  return { blob, width, height };
}

export const IMAGE_SIZES = { logo: 512, cover: 1600, gallery: 1200, staff: 400 } as const;
