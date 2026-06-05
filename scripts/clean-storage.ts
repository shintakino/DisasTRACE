import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteFolderRecursive(bucketId: string, folderPath: string) {
  const { data: items, error } = await supabase.storage.from(bucketId).list(folderPath);

  if (error) {
    // If the bucket doesn't exist yet, ignore the error and move on
    if (error.message.includes('not found')) {
      console.log(`ℹ️ Bucket "${bucketId}" does not exist or has not been initialized yet. Skipping...`);
      return;
    }
    console.error(`❌ Error listing folder "${folderPath}" in bucket "${bucketId}":`, error.message);
    return;
  }

  if (!items || items.length === 0) return;

  const filesToDelete: string[] = [];
  
  for (const item of items) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
    
    // folders do not have metadata fields (e.g. metadata is missing or empty)
    const isFolder = !item.metadata;
    
    if (isFolder) {
      await deleteFolderRecursive(bucketId, fullPath);
    } else {
      filesToDelete.push(fullPath);
    }
  }

  if (filesToDelete.length > 0) {
    console.log(`🗑️ Deleting ${filesToDelete.length} files from bucket "${bucketId}" in directory "${folderPath || 'root'}"...`);
    const { error: deleteError } = await supabase.storage.from(bucketId).remove(filesToDelete);
    if (deleteError) {
      console.error(`❌ Failed to delete files in bucket "${bucketId}" path "${folderPath}":`, deleteError.message);
    }
  }
}

async function cleanAllBuckets() {
  console.log('====================================================');
  console.log('       Purging All Supabase Storage Buckets         ');
  console.log('====================================================');

  const buckets = ['avatars', 'user-ids', 'reports'];
  
  for (const bucket of buckets) {
    try {
      await deleteFolderRecursive(bucket, '');
    } catch (err) {
      console.error(`❌ Unexpected error cleaning bucket "${bucket}":`, err);
    }
  }
  
  console.log('\n====================================================');
  console.log('✅ Supabase Storage Bucket Purge Completed!        ');
  console.log('====================================================');
}

cleanAllBuckets();
