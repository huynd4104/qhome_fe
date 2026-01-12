import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_ASSET_MAINTENANCE_URL || 'http://localhost:8084';

export interface AssetResponse {
  id: string;
  name: string;
  code?: string;
  type?: string;
  status?: string;
  images?: string[];
  primaryImage?: string;
  [key: string]: any;
}

export async function uploadAssetImages(
  assetId: string,
  files: File[]
): Promise<AssetResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/assets/${assetId}/upload-images`,
    formData,
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function deleteAssetImage(
  assetId: string,
  imageUrl: string
): Promise<AssetResponse> {
  const response = await axios.delete(
    `${BASE_URL}/api/asset-maintenance/assets/${assetId}/images?imageUrl=${encodeURIComponent(imageUrl)}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function setPrimaryImage(
  assetId: string,
  imageUrl: string
): Promise<AssetResponse> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/assets/${assetId}/primary-image?imageUrl=${encodeURIComponent(imageUrl)}`,
    {},
    { withCredentials: true }
  );
  return response.data;
}

export function getAssetImageUrl(imagePath: string): string {
  return `${BASE_URL}/api/asset-maintenance/assets/images/${imagePath}`;
}

