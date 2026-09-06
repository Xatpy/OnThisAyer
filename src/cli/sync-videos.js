import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(ROOT_DIR, 'output/videos');
const DEST_DIR = path.join(ROOT_DIR, 'website/videos');

export async function syncVideos() {
  if (!fsSync.existsSync(SOURCE_DIR)) {
    console.log(`⚠️ No videos directory found at: ${SOURCE_DIR}`);
    return 0;
  }

  await fs.mkdir(DEST_DIR, { recursive: true });

  const files = await fs.readdir(SOURCE_DIR);
  const mediaFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.txt'));

  if (mediaFiles.length === 0) {
    console.log(`ℹ️ No .mp4 or .txt videos found in ${SOURCE_DIR} to sync.`);
    return 0;
  }

  let copied = 0;
  for (const file of mediaFiles) {
    const srcPath = path.join(SOURCE_DIR, file);
    const destPath = path.join(DEST_DIR, file);

    // Only copy if destination does not exist or has different size
    let shouldCopy = true;
    if (fsSync.existsSync(destPath)) {
      const srcStat = await fs.stat(srcPath);
      const destStat = await fs.stat(destPath);
      if (srcStat.size === destStat.size) {
        shouldCopy = false;
      }
    }

    if (shouldCopy) {
      await fs.copyFile(srcPath, destPath);
      copied++;
    }
  }

  console.log(`✅ Synced ${copied} video/caption file(s) to website/videos/ (Total available: ${mediaFiles.length})`);
  return copied;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncVideos().catch((err) => {
    console.error('❌ Error syncing videos:', err);
    process.exit(1);
  });
}
