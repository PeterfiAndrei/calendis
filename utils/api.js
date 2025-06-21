import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
dotenv.config();
require('dotenv').config();

const COOKIE = process.env.CALENDIS_COOKIE;

export async function fetchAvailableSlot(item) {
  const url = 'https://www.calendis.ro/api/appointment/';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 
      'Cookie': COOKIE,
      'Referer': item.referer,
      'Origin': 'https://www.calendis.ro',
      'User-Agent': item.userAgent
    },
    body: JSON.stringify({ appointments: [item] })
  });
  return resp.json();
}

export async function fetchReservationForm(slotTimeUnix) {
  const resp = await fetch(`https://www.calendis.ro/appointment/popup?time=${slotTimeUnix}`, {
    headers: { Cookie: COOKIE }
  });
  const html = await resp.text();
  return new JSDOM(html).window.document;
}

export async function postReservation(reservationId) {
  const resp = await fetch('https://www.calendis.ro/api/appointment/create', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': COOKIE
    },
    body: JSON.stringify({ reservationId })
  });
  return resp.json();
}
