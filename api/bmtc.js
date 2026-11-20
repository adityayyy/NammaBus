/* Vercel serverless function: BMTC API proxy.
   Frontend calls /api/bmtc?endpoint=<name> with a POST JSON body. */
const https = require('https');
const BMTC_HOST = 'bmtcmobileapi.karnataka.gov.in';
const BMTC_PATH = '/WebAPI/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,lan,deviceType,Accept'
};

const HEADERS = {
  'Content-Type': 'application/json',
  'lan': 'en',
  'deviceType': 'WEB',
  'Accept': 'text/plain'
};

function viaFetch(endpoint, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body || {});
  return fetch('https://' + BMTC_HOST + BMTC_PATH + endpoint, {
    method: 'POST', headers: HEADERS, body: payload
  }).then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); });
}

function viaHttps(endpoint, body) {
  return new Promise(function (resolve, reject) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body || {});
    const req = https.request({
      host: BMTC_HOST, path: BMTC_PATH + endpoint, method: 'POST',
      headers: Object.assign({}, HEADERS, { 'Content-Length': Buffer.byteLength(payload) })
    }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { resolve({ status: res.statusCode, body: data }); });
    });
    req.on('error', reject);
    req.setTimeout(15000, function () { req.destroy(new Error('BMTC upstream timeout')); });
    req.write(payload);
    req.end();
  });
}

module.exports = async (req, res) => {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const endpoint = req.query.endpoint;
  if (!endpoint || !/^[A-Za-z0-9_]+$/.test(endpoint)) {
    res.status(400).json({ error: 'Invalid endpoint' });
    return;
  }

  try {
    // Prefer native fetch (Node 18+). Full Node 20+ pin is in package.json.
    // Fall back to the https module if fetch is unavailable.
    const transport = (typeof fetch === 'function') ? viaFetch : viaHttps;
    let result;
    try {
      result = await transport(endpoint, req.body);
    } catch (e) {
      result = await viaHttps(endpoint, req.body);
    }
    res.status(result.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(result.body);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
};
