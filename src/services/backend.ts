import { Platform } from 'react-native';

import type { OcrExtractionResult } from '../types/portfolio';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'web' ? 'http://127.0.0.1:8000' : 'http://10.0.2.2:8000');

export async function extractPortfolioFromBackend(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
}): Promise<OcrExtractionResult> {
  const formData = new FormData();

  if (asset.file) {
    formData.append('file', asset.file);
  } else {
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'portfolio-screenshot.png',
      type: asset.mimeType || 'image/png',
    } as never);
  }

  const response = await fetch(`${API_BASE_URL}/api/ocr/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `OCR backend failed with status ${response.status}`);
  }

  return response.json() as Promise<OcrExtractionResult>;
}
