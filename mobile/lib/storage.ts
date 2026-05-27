import { File } from 'expo-file-system';
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

/**
 * Uploads a government ID image to the private 'user-ids' bucket.
 * 
 * @param userId - The Supabase Auth ID of the user.
 * @param imageUri - The local URI of the captured image.
 * @returns The file path in the storage bucket.
 */
export async function uploadGovernmentID(userId: string, imageUri: string): Promise<string> {
  try {
    const file = new File(imageUri);
    
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

    const filePath = `ids/${userId}/id-card.png`;

    const { data, error } = await supabase.storage
      .from('user-ids')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/png',
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
    const file = new File(imageUri);
    
    if (!file.exists) {
      throw new Error("Image file does not exist.");
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new Error("Incident photo exceeds 25MB limit.");
    }

    const base64 = await file.base64();
    const arrayBuffer = decode(base64);

    const filePath = `scenes/${randomId}/photo.png`;

    const { data, error } = await supabase.storage
      .from('incident-photos')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/png',
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
