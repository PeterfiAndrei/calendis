const fetch = require('node-fetch');
require('dotenv').config();

const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_ID = process.env.GIST_ID;
const FILENAME = 'last_slots.json';

async function loadPreviousSlotsFromGist() {
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { Authorization: `Bearer ${GIST_TOKEN}` }
    });

    const data = await res.json();

    if (!data.files || !data.files[FILENAME]) {
      console.warn(`⚠️ Fișierul ${FILENAME} nu există în Gist. Întoarcem []`);
      return [];
    }

    const content = data.files[FILENAME].content;
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      console.warn('⚠️ Conținutul din Gist nu este un array. Resetăm.');
      return [];
    }

    return parsed;
  } catch (err) {
    console.error('❌ Eroare la parsarea Gist:', err);
    return [];
  }
}


async function saveSlotsToGist(slots) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GIST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        [FILENAME]: {
          content: JSON.stringify(slots, null, 2)
        }
      }
    })
  });

  if (!res.ok) {
    console.error('❌ Eroare la actualizarea Gist:', await res.text());
  } else {
    console.log('💾 Gist actualizat cu sloturile curente.');
  }
}

module.exports = { loadPreviousSlotsFromGist, saveSlotsToGist };
