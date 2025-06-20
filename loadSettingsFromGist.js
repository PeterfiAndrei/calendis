const fetch = require('node-fetch');
require('dotenv').config();

async function loadSettingsFromGist() {
  const gistId = process.env.SETTINGS_GIST_ID;
  const token = process.env.GIST_TOKEN;

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    console.error(`❌ Eroare la încărcarea Gist-ului: ${response.statusText}`);
    return null;
  }

  const gistData = await response.json();
  const fileContent = gistData.files['settings_calendis.json']?.content;

  if (!fileContent) {
    console.error('❌ Fișierul settings_calendis.json nu există în Gist.');
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