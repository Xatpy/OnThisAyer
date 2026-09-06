import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const DIRS_TO_CLEAN = [
  path.join(ROOT_DIR, 'output/temp'),
  path.join(ROOT_DIR, 'output/videos'),
  path.join(ROOT_DIR, 'output/renders'),
];

async function clean() {
  const args = process.argv.slice(2);
  const tempOnly = args.includes('--temp-only');
  const videosOnly = args.includes('--videos-only');

  console.log('🧹 Cleaning workspace output directories...\n');

  for (const dir of DIRS_TO_CLEAN) {
    const isTemp = dir.endsWith('temp');
    const isVideos = dir.endsWith('videos');

    if (tempOnly && !isTemp) continue;
    if (videosOnly && !isVideos) continue;

    if (fsSync.existsSync(dir)) {
      await fs.rm(dir, { recursive: true, force: true });
      console.log(`   🗑️  Removed: ${path.relative(ROOT_DIR, dir)}/`);
    }

    // Recreate clean output/videos directory
    if (isVideos) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, '.gitkeep'), '');
    }
  }

  console.log('\n✨ Output cleaned successfully.');
}

clean().catch((err) => {
  console.error('❌ Error during clean:', err);
  process.exit(1);
});
