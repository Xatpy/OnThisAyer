import { fetchWikipediaDay, saveDayEvents, padZero, isValidDate } from '../core/extractor.js';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const dayArg = args.find(a => a.startsWith('--day='))?.split('=')[1];

  if (isAll) {
    console.log('🚀 Iniciando descarga completa de los 366 días del año...');
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      const maxDays = DAYS_IN_MONTH[m - 1];
      for (let d = 1; d <= maxDays; d++) {
        count++;
        process.stdout.write(`\r[${count}/366] Procesando ${padZero(m)}-${padZero(d)}...`);
        try {
          const data = await fetchWikipediaDay(m, d);
          await saveDayEvents(m, d, data);
        } catch (err) {
          console.error(`\n❌ Error en ${m}-${d}:`, err.message);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }
    console.log('\n\n✅ ¡Descarga de los 366 días completada!');
    return;
  }

  let m = new Date().getMonth() + 1;
  let d = new Date().getDate();

  if (dayArg) {
    const parts = dayArg.split('-');
    if (parts.length === 2 && isValidDate(parts[0], parts[1])) {
      m = parseInt(parts[0], 10);
      d = parseInt(parts[1], 10);
    } else {
      console.error(`❌ Fecha inválida: "${dayArg}". Usa el formato MM-DD (ej: 08-29).`);
      process.exit(1);
    }
  }

  console.log(`📥 Extrayendo efemérides de Wikipedia para el ${padZero(m)}-${padZero(d)}...`);
  const data = await fetchWikipediaDay(m, d);
  const savedPath = await saveDayEvents(m, d, data);
  console.log(`✅ ${data.totalEvents} años con fotos guardados en:`);
  console.log(`   👉 ${savedPath}\n`);
}

main().catch(console.error);
