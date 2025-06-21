const fetch = require('node-fetch');
require('dotenv').config();

async function loadSettingsFromGist() {
  const gistId = process.env.SETTINGS_GIST_ID;
  const GIST_TOKEN = process.env.GIST_TOKEN;
  const FILENAME = 'settings_calendis.json';

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `Bearer ${GIST_TOKEN}` }
  });
    const data = await response.json();

    if (!data || !data.files) {
      console.error('❌ Gist response invalid sau lipsesc fișierele:', data);
      return [];
   }

  console.log('📁 Fișiere disponibile în Gist:', Object.keys(data.files));
    if (!data.files || !data.files[FILENAME]) {
      console.warn(`⚠️ Fișierul ${FILENAME} nu există în Gist. Întoarcem []`);
      return [];
    }
    
  const fileContent = data.files[FILENAME]?.content;

  if (!fileContent) {
    console.error(`❌ Fișierul ${FILENAME} nu există în Gist.`);
    return null;
  }

  try {
    return JSON.parse(fileContent);
  } catch (err) {
    console.error('❌ Eroare la parsarea JSON-ului:', err.message);
    return null;
  }
}


module.exports = { loadSettingsFromGist };