const fetch = require('node-fetch');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(timezone);
require('dotenv').config();

// 🔧 Lista de servicii disponibile
const services = [
  { id: 39707, name: 'Padle1-Floresti', location_id: 4870, staff_id: '21359' },
  { id: 39708, name: 'Padle2-Floresti', location_id: 4870, staff_id: '21360' },
  { id: 39692, name: 'Tenis1-Floresti', location_id: 4870, staff_id: '0'  },
  { id: 39706, name: 'Tenis2-Floresti', location_id: 4870, staff_id: '0'  },
  { id: 37695, name: 'Tenis2-LaTerenuri', location_id: 4609, staff_id: '0'  }
];

const cookie = process.env.CALENDIS_COOKIE;

async function reserveSlotByName({ serviceName, date, hour }) {
  const service = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
  if (!service) {
    console.error(`❌ Serviciul "${serviceName}" nu a fost găsit în listă.`);
    return;
  }

  await reserveSlot({
    date,
    hour,
    location_id: service.location_id,
    service_id: service.id,
    staff_id: service.staff_id
  });
}

async function reserveSlot({ date, hour, location_id, service_id, staff_id }) {
  try {
    const dateTime = dayjs.tz(`${date} ${hour}`, 'YYYY-MM-DD HH:mm', 'Europe/Bucharest');
    const dateUnix = dateTime.unix();
    const dateUtcUnix = dateTime.startOf('day').unix();

    // Pasul 1
    const payload = {
      appointments: [{
        dateUnix,
        dateUtcUnix,
        location_id,
        service_id,
        staff_id,
        startTime: hour,
        originalSlot: 0
      }],
      group_id: null
    };

    const response1 = await fetch('https://www.calendis.ro/api/appointment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.calendis.ro',
        'Referer': 'https://www.calendis.ro/',
        'Cookie': cookie
      },
      body: JSON.stringify(payload)
    });

    console.log('🔄 Pasul 1 - payload:', payload);
    const json1 = await response1.json();
    console.log('🔄 Pasul 1 - Response:', json1);

    // Pasul 2
    const response2 = await fetch('https://www.calendis.ro/finalizeaza-programarea', {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.calendis.ro/',
        'Cookie': cookie
      }
    });

    const html = await response2.text();
    const $ = cheerio.load(html);
    const group_id = $('#appointment_group_id').val();

    if (!group_id) throw new Error('❌ Nu am găsit appointment_group_id!');
    console.log('✅ group_id găsit:', group_id);

    // Pasul 3
    const response3 = await fetch(`https://www.calendis.ro/api/appointment/${group_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.calendis.ro',
        'Referer': 'https://www.calendis.ro/finalizeaza-programarea',
        'Cookie': cookie
      },
      body: JSON.stringify({
        clients: [{
          own_appointment: 1,
          dateUnix,
          appointment_id: Number(group_id)
        }]
      })
    });

    const json3 = await response3.json();
    console.log('🎉 Rezervare confirmată:', json3);
  } catch (err) {
    console.error('⚠️ Eroare rezervare:', err.message || err);
  }
}

// 🔍 Exemplu de apel cu nume de serviciu:
reserveSlotByName({
  serviceName: 'Padle2-Floresti',
  date: '2025-07-04',
  hour: '14:00'
});

module.exports = { reserveSlotByName, reserveSlot };
