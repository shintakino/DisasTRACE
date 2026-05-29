import { File } from 'expo-file-system';
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
 * Uploads a government ID image to the private 'user-ids' bucket.
 * 
 * @param userId - The Supabase Auth ID of the user.
 * @param imageUri - The local URI of the captured image.
 * @returns The file path in the storage bucket.
 */
export async function uploadGovernmentID(userId: string, imageUri: string): Promise<string> {
  try {
    // 1. Optimize the image on-device before reading
    const optimizedUri = await optimizeImage(imageUri, 1024);

    const file = new File(optimizedUri);
    
    if (!file.exists) {
      throw new Error("Image file does not exist.");
    }

    // Limit check: 25MB
    if (file.size > 25 * 1024 * 1024) {
      throw new Error("ID photo exceeds 25MB limit.");
    }

    // Convert local file to base64 and decode to ArrayBuffer
    const base64 = await file.base64();
    const arrayBuffer = decode(base64);

    // Save as JPEG (extremely efficient)
    const filePath = `ids/${userId}/id-card.jpg`;

    const { data, error } = await supabase.storage
      .from('user-ids')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return filePath; // Return file path to store in database idImageUrl field
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
