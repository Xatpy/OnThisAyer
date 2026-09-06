import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Synthesizes voice and returns word-level timestamps.
 * @param {Object} options
 * @param {string} options.text Text to synthesize
 * @param {string} [options.voice='es-ES-AlvaroNeural'] Voice to use
 * @param {string} options.outAudioPath Destination for the MP3 file
 * @param {string} options.outJsonPath Destination for the JSON metadata
 * @param {string} [options.rate='+0%'] Rate modifier (e.g. '+5%')
 * @returns {Promise<Object>} Synthesis metadata including words array and durationSeconds
 */
export async function generateSpeech({
  text,
  voice = 'es-ES-AlvaroNeural',
  outAudioPath,
  outJsonPath,
  rate = '+0%'
}) {
  const pythonBin = fs.existsSync(path.join(ROOT_DIR, '.venv/bin/python3'))
    ? path.join(ROOT_DIR, '.venv/bin/python3')
    : 'python3';
  const scriptPath = path.join(__dirname, 'synthesize.py');

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, [
      scriptPath,
      '--text', text,
      '--voice', voice,
      '--out-audio', outAudioPath,
      '--out-json', outJsonPath,
      '--rate', rate
    ], {
      cwd: ROOT_DIR
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`TTS generation failed with code ${code}: ${stderr}`));
      }
      try {
        const rawJson = fs.readFileSync(outJsonPath, 'utf8');
        const data = JSON.parse(rawJson);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  });
}
