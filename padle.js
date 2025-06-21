const { loadPreviousSlotsFromGist, saveSlotsToGist } = require('./utils/gistCache')
const { loadSettingsFromGist } = require('./utils/loadSettingsFromGist')

const { request } = require('@playwright/test');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { sendTelegramNotification } = require('./utils/telegramNotification');
require('dotenv').config();

const CACHE_FILE = path.join(__dirname, 'last_slots.json');



// Ensure the cache file exists
if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify([], null, 2));
}


(async () => {
  const settings = await loadSettingsFromGist();
  if (!settings) {
    console.error("❌ Eroare: settings_calendis.json not found or invalid.");
    // process.exit(1);
  }
  const STARTING_HOUR = settings?.startingHour ?? 17;
  const STARTING_HOUR_WEEKEND = settings?.startingHourWeekend ?? 12;

  const baseUrl = 'https://www.calendis.ro/api/get_available_slots';

  const headers = {
    'Accept': '*/*',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Connection': 'keep-alive',
    'Referer': 'https://www.calendis.ro/floresti_cj/parcul-sportiv-floresti/teren-de-paddle-2/s',
    'User-Agent': 'Mozilla/5.0',
    'Cookie': process.env.CALENDIS_COOKIE
  };
  const services = [
    { id: 39707, name: 'Padle1-Floresti', location_id: 4870 },
    // { id: 39708, name: 'Padle2-Floresti', location_id: 4870 },
    // { id: 39692, name: 'Tenis1-Floresti', location_id: 4870 },
    // { id: 39706, name: 'Tenis2-Floresti', location_id:4870 },
    // { id: 37695, name: 'Tenis2-LaTerenuri', location_id: 4609 },
  ];

  const apiRequestContext = await request.newContext({ extraHTTPHeaders: headers });
  const today = dayjs();

  let notificationSlots = [];
  let noOfEvents = 0
  for (const service of services) {
    for (let i = 0; i < 14; i++) {
      const date = today.add(i, 'day');
      const timestamp = Math.floor(date.unix());

      const url = `${baseUrl}?service_id=${service.id}&location_id=${service.location_id}&date=${timestamp}&day_only=1`;

      const response = await apiRequestContext.get(url);
      // let rawText = await response.text(); // <-- pentru debug
      // console.log(rawText);


      const data = await response.json();
      if (data.available_slots && data.available_slots.length > 0) {
        for (const slot of data.available_slots) {
          const slotTime = dayjs.unix(Number(slot.time)).tz("Europe/Bucharest");
          const isWeekend = slotTime.day() === 6 || slotTime.day() === 0; // 6 = Saturday, 0 = Sunday
          const dynamicStartHour = isWeekend ? STARTING_HOUR_WEEKEND : STARTING_HOUR;

          const hour = slotTime.hour();
          const timeStr = slotTime.format('HH:mm');
          noOfEvents++;
          if (hour >= dynamicStartHour) {
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
  console.log(`---- Padle Script ----`);
  console.log(`📅 Datele sunt pentru ${today.format('YYYY-MM-DD')}`);
  console.log(`🔔 Total slots found: ${noOfEvents}`);
  console.log(`📤 Total new slots: ${newSlots.length}`);
  console.log("✅ Script completed successfully.");
})();
