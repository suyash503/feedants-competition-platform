import type { ImagePickerAsset } from 'expo-image-picker';
import { API_URL, ApiError, getAuthToken } from './client';

export type UploadedVideo = { url: string; mimeType: string; sizeBytes: number };

/**
 * Upload a picked video with progress. Uses XMLHttpRequest because fetch() has no
 * upload progress events. Works on web (File object) and native (file URI).
 */
export function uploadVideo(
  asset: ImagePickerAsset,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedVideo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/uploads/videos`);
    const token = getAuthToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadedVideo);
      else reject(new ApiError(xhr.status, body?.error?.code ?? 'UPLOAD_FAILED', body?.error?.message ?? 'Upload failed'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server'));
    xhr.onabort = () => reject(new ApiError(0, 'UPLOAD_CANCELLED', 'Upload cancelled'));
    signal?.addEventListener('abort', () => xhr.abort());

    const mimeType = asset.mimeType ?? 'video/mp4';
    const name = asset.fileName ?? `performance.${mimeType.split('/')[1] ?? 'mp4'}`;
    const form = new FormData();
    if (asset.file) {
      form.append('video', asset.file, name); // web: a real File object
    } else {
      // React Native's FormData accepts { uri, name, type } for files on disk.
      form.append('video', { uri: asset.uri, name, type: mimeType } as unknown as Blob);
    }
    xhr.send(form);
  });
}
