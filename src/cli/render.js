import { renderMockupScreenshot } from '../core/renderer.js';
import { padZero } from '../core/extractor.js';

async function main() {
  const args = process.argv.slice(2);
  const dayArg = args.find(a => a.startsWith('--day='))?.split('=')[1];

  let m = new Date().getMonth() + 1;
  let d = new Date().getDate();

  if (dayArg) {
    const [monthPart, dayPart] = dayArg.split('-').map(Number);
    if (monthPart && dayPart) {
      m = monthPart;
      d = dayPart;
    }
  }

  console.log(`📸 Renderizando captura de pantalla HD de Ayer para ${padZero(m)}-${padZero(d)}...`);
  const result = await renderMockupScreenshot(m, d);
  console.log(`✅ Captura guardada con éxito en:`);
  console.log(`   👉 ${result}\n`);
}

main().catch(err => {
  console.error('❌ Error al renderizar captura:', err);
  process.exit(1);
});
