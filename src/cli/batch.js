import { getDayEvents, saveCuratedDay, selectBest3MarketingEvents, padZero, isValidDate } from '../core/extractor.js';

function getDynamicDates(daysCount = 14, startDate = null) {
  const dates = [];
  const start = startDate ? new Date(startDate) : new Date();

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push({
      month: d.getMonth() + 1,
      day: d.getDate()
    });
  }
  return dates;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let days = 14;
  let start = null;

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) days = val;
    } else if (arg.startsWith('--start=')) {
      const val = arg.split('=')[1];
      if (val && val.includes('-')) {
        const [m, d] = val.split('-').map(Number);
        if (isValidDate(m, d)) {
          const now = new Date();
          start = new Date(now.getFullYear(), m - 1, d);
        }
      }
    }
  }

  return { days, start };
}

async function main() {
  const { days, start } = parseArgs();
  const datesToProcess = getDynamicDates(days, start);

  console.log(`🚀 Extrayendo y curando automáticamente los próximos ${datesToProcess.length} días...`);
  console.log('---------------------------------------------------------------------------');

  for (const { month, day } of datesToProcess) {
    const mm = padZero(month);
    const dd = padZero(day);
    
    const data = await getDayEvents(month, day, false);
    const top3Ids = selectBest3MarketingEvents(data.events);
    
    if (top3Ids.length > 0) {
      await saveCuratedDay(month, day, top3Ids);
    }

    console.log(`\n📅 FECHA: ${mm}-${dd} (${data.events.length} años candidatos con fotos únicas):`);
    top3Ids.forEach((id, index) => {
      const ev = data.events.find(e => e.id === id);
      if (ev) {
        console.log(`   #${index + 1} [Año ${ev.year}] [Score ${ev.marketingScore}] [${ev.imagesCount} fotos] ${ev.category.icon} ${ev.text.substring(0, 85)}...`);
      }
    });
  }

  console.log('\n✅ ¡Días curados y guardados con éxito en data/curated.json!');
}

main().catch(console.error);
