const { loadPreviousSlotsFromGist, saveSlotsToGist } = require('./gistCache');

const { request } = require('@playwright/test');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { sendTelegramNotification } = require('./telegramNotification');

const CACHE_FILE = path.join(__dirname, 'last_slots.json');
const STARTING_HOUR = 17; // Only consider slots after this hour

// Ensure the cache file exists
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify([], null, 2));
}


(async () => {
  const baseUrl = 'https://www.calendis.ro/api/get_available_slots';
  const location_id = 4870;

  const headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Connection': 'keep-alive',
    'Referer': 'https://www.calendis.ro/floresti_cj/parcul-sportiv-floresti/teren-de-paddle-2/s',
    'User-Agent': 'Mozilla/5.0',
    'Cookie': process.env.CALENDIS_COOKIE
  };
  const services = [
    { id: 39707, name: 'Padle1' },
    { id: 39708, name: 'Padle2' }
  ];

  const apiRequestContext = await request.newContext({ extraHTTPHeaders: headers });
  const today = dayjs();

  let notificationSlots = [];
  for (const service of services) {
    for (let i = 0; i < 14; i++) {
      const date = today.add(i, 'day');
      const timestamp = Math.floor(date.unix());

      const url = `${baseUrl}?service_id=${service.id}&location_id=${location_id}&date=${timestamp}&day_only=1`;

      const response = await apiRequestContext.get(url);
    //   let rawText = await response.text(); // <-- pentru debug
    //   console.log(rawText);


      const data = await response.json();

      if (data.available_slots && data.available_slots.length > 0) {
        for (const slot of data.available_slots) {
          const slotTime = dayjs.unix(Number(slot.time)).tz("Europe/Bucharest");
          const hour = slotTime.hour();
          const timeStr = slotTime.format('HH:mm');

          if (hour >= STARTING_HOUR) {
            const dateStr = date.format('YYYY-MM-DD');
            notificationSlots.push(`📅 *${dateStr}* - 🕒 *${timeStr}* - 🏓 *${service.name}*`);
          }
        }
      }
    }
  }

  await apiRequestContext.dispose();

  const previous = await loadPreviousSlotsFromGist();
  console.log('📥 previous slots:', previous);
console.log('📥 typeof previous:', typeof previous);

  const current = notificationSlots.sort();
  const previousSorted = previous.sort();
  console.log("🆕 current slots (sorted):", current);
console.log("💾 previous slots (sorted):", previousSorted);
  const newSlots = current.filter(slot => !previousSorted.includes(slot));
  // 🔃 Updatăm fișierul cu doar sloturile ACTUALE (curente)
  await saveSlotsToGist(current);

  // 📢 Trimitem notificare DOAR pentru sloturile NOI
if (newSlots.length > 0) {
  const message = `📢 Sloturi NOI după ora ${STARTING_HOUR}:00:\n\n${newSlots.join('\n')}`;
  console.log(message)
  await sendTelegramNotification(message);
} else {
  console.log("🔕 Nicio schimbare. Nu trimitem notificare.")
}
})();
