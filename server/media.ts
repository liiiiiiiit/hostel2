import sharp from 'sharp';
import { put, del } from '@vercel/blob';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const mediaDirectory = () => path.resolve(process.env.MEDIA_DIRECTORY || 'data/uploads');
export async function optimizeImage(input: Buffer, contentType: string) {
  if (!input.length || input.length > MAX_IMAGE_BYTES) throw new Error('حجم تصویر باید حداکثر ۴ مگابایت باشد.');
  if (!['image/jpeg','image/png','image/webp'].includes(contentType)) throw new Error('فقط تصویر JPEG، PNG و WebP پذیرفته می‌شود.');
  try {
    const instance = sharp(input, { limitInputPixels: 40_000_000, animated: false });
    const metadata = await instance.metadata();
    if (!['jpeg','png','webp'].includes(metadata.format || '') || metadata.pages && metadata.pages > 1) throw new Error();
    // Autorotate; discard EXIF/GPS; bounded dimensions and modern, smaller output.
    return await instance.rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new Error('تصویر معتبر نیست یا ابعاد آن بیش از حد مجاز است.'); }
}
export async function storeImage(id: string, bytes: Buffer) {
  const key = `properties/${id}.webp`;
  const backend = process.env.MEDIA_STORAGE || (process.env.VERCEL ? 'blob' : 'local');
  if (backend === 'blob') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('ذخیره‌سازی تصویر تنظیم نشده است.');
    const result = await put(key, bytes, { access: 'public', addRandomSuffix: false, contentType: 'image/webp' });
    return { backend, key: result.url, url: result.url };
  }
  if (backend !== 'local' || process.env.VERCEL) throw new Error('ذخیره‌سازی پایدار تصویر تنظیم نشده است.');
  await mkdir(mediaDirectory(), { recursive: true });
  await writeFile(path.join(mediaDirectory(), `${id}.webp`), bytes, { flag: 'wx' });
  return { backend, key: `${id}.webp`, url: `/api/app?media=${id}` };
}
export async function deleteStoredImage(asset: { backend: string; storage_key: string }) {
  if (asset.backend === 'blob') await del(asset.storage_key);
  else await unlink(path.join(mediaDirectory(), path.basename(asset.storage_key))).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
}
export const readStoredImage = (key: string) => readFile(path.join(mediaDirectory(), path.basename(key)));
