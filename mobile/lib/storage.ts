import { File } from 'expo-file-system';
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { fetchWithTimeout } from './network-timeout';
import { getMobileApiBaseUrl } from './api-base-url';

/**
 * Optimizes an image URI on-device by resizing and compressing it.
 * 
 * @param imageUri - The local URI of the image to optimize.
 * @param maxDimension - The maximum width or height of the optimized image.
 * @returns The new local URI of the optimized image.
 */
export async function optimizeImage(imageUri: string, maxDimension: number = 1024): Promise<string> {
  try {
    console.log('[Storage] Fetching image dimensions for:', imageUri);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => {
          console.error('[Storage] Failed to get image dimensions:', error);
          reject(error);
        }
      );
    });

    const { width, height } = dimensions;
    const actions: any[] = [];

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        actions.push({ resize: { width: maxDimension } });
      } else {
        actions.push({ resize: { height: maxDimension } });
      }
      console.log(`[Storage] Scaling image down from ${width}x${height} to fit max dimension ${maxDimension}`);
    } else {
      console.log(`[Storage] Image size (${width}x${height}) is already within limits. No scaling needed.`);
    }

    const result = await manipulateAsync(
      imageUri,
      actions,
      { compress: 0.6, format: SaveFormat.JPEG }
    );

    console.log('[Storage] On-device image optimization completed. Optimized URI:', result.uri);
    return result.uri;
  } catch (err) {
    console.warn('[Storage] On-device image optimization failed, falling back to original image:', err);
    return imageUri;
  }
}

/**
 * Uploads a government ID image through the authenticated verification API.
 * Pending applicants do not receive direct Storage write access.
 *
 * @param imageUri - The local URI of the captured image.
 * @param idType - The selected government ID type, when it changes.
 * @returns The file path in the storage bucket.
 */
export async function uploadGovernmentID(imageUri: string, idType?: string): Promise<string> {
  try {
    // 1. Optimize the image on-device before reading
    const optimizedUri = await optimizeImage(imageUri, 1024);

    const file = new File(optimizedUri);
    
    if (!file.exists) {
      throw new Error("Image file does not exist.");
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      throw new Error("ID photo must be no larger than 5MB.");
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your account session is not ready. Please sign in and try again.');

    const formData = new FormData();
    formData.append('file', {
      uri: optimizedUri,
      name: 'government-id.jpg',
      type: 'image/jpeg',
    } as never);
    if (idType) formData.append('idType', idType);

    const response = await fetchWithTimeout(`${getMobileApiBaseUrl()}/api/verification/id`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
      body: formData,
    }, 30_000, 'government ID upload');
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.data?.filePath) {
      throw new Error(result?.error || 'Government ID upload could not be completed.');
    }
    return result.data.filePath;
  } catch (err: any) {
    console.error("Upload error:", err);
    throw err;
  }
}

/**
 * Uploads an incident scene photo to the public 'incident-photos' bucket.
 * 
 * @param randomId - A unique folder ID to prevent collisions.
 * @param imageUri - The local URI of the captured image.
 * @returns The public URL of the uploaded image.
 */
export async function uploadIncidentPhoto(randomId: string, imageUri: string): Promise<string> {
  try {
    // 1. Optimize the image on-device before reading
    const optimizedUri = await optimizeImage(imageUri, 1024);

    const file = new File(optimizedUri);
    
    if (!file.exists) {
      throw new Error("Image file does not exist.");
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new Error("Incident photo exceeds 25MB limit.");
    }

    const base64 = await file.base64();
    const arrayBuffer = decode(base64);

    // Save as JPEG (extremely efficient)
    const filePath = `scenes/${randomId}/photo.jpg`;

    const { data, error } = await supabase.storage
      .from('incident-photos')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('incident-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err: any) {
    console.error("Upload incident photo error:", err);
    throw err;
  }
}

/** Returns whether the current signed-in applicant has submitted their ID. */
export async function getGovernmentIDStatus(): Promise<{ hasDocument: boolean; verificationStatus: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to continue your verification.');

  const response = await fetchWithTimeout(`${getMobileApiBaseUrl()}/api/verification/id`, {
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
  }, 15_000, 'verification requirements');
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data) {
    throw new Error(result?.error || 'Unable to load your verification requirements.');
  }
  return {
    hasDocument: result.data.hasDocument === true,
    verificationStatus: String(result.data.verificationStatus || 'PENDING'),
  };
}

/**
 * Uploads chatbot evidence through the emergency-intake API. Unlike direct
 * Storage uploads, this works before a guest has an authenticated session.
 */
export async function uploadEmergencyEvidence(apiUrl: string, imageUri: string): Promise<string> {
  const optimizedUri = await optimizeImage(imageUri, 1024);
  const file = new File(optimizedUri);

  if (!file.exists) throw new Error('Evidence photo no longer exists on this device. Please take it again.');
  if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error('Evidence photo must be no larger than 5MB.');

  const formData = new FormData();
  formData.append('file', {
    uri: optimizedUri,
    name: 'emergency-evidence.jpg',
    type: 'image/jpeg',
  } as any);

  const response = await fetchWithTimeout(`${apiUrl}/emergency-intake/evidence`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  }, 30_000, 'Evidence upload');
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.imageUrl) throw new Error(result.error || 'Unable to upload the evidence image.');
  return result.imageUrl;
}

/**
 * Uploads a profile avatar using the optimized image pipeline.
 * 
 * @param imageUri - The local URI of the selected avatar image.
 * @returns The public URL of the uploaded avatar.
 */
export async function uploadAvatar(imageUri: string): Promise<string> {
  try {
    // 1. Optimize on-device before uploading
    const optimizedUri = await optimizeImage(imageUri, 1024);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active auth session.");

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    const formData = new FormData();
    formData.append('file', {
      uri: optimizedUri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as any);

    console.log('[Storage] Uploading optimized avatar to backend:', optimizedUri);

    const response = await fetch(`${apiUrl}/api/users/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to upload avatar.");
    }

    console.log('[Storage] Avatar successfully updated on server. Public URL:', result.avatarUrl);
    return result.avatarUrl;
  } catch (err: any) {
    console.error('[Storage] Error in uploadAvatar:', err);
    throw err;
  }
}
