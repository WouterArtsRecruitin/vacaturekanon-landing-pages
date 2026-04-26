// Vercel variant of meta-webhook (mirror of netlify/functions/meta-webhook.js)
// Hardened: env-only secrets (no hardcoded fallback), timeout, fail-closed on missing secrets.

const TIMEOUT_MS = 8000;
function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms: ${label || ''}`)), ms))]);
}
async function alertSlack(msg) {
  const url = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `:rotating_light: *VK meta-webhook (vercel)*\n${msg}` })
    }), TIMEOUT_MS, 'slack');
  } catch (_) {}
}

export default async function handler(req, res) {
  const META_APP_SECRET = process.env.META_APP_SECRET;
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if (!META_APP_SECRET || !META_ACCESS_TOKEN) {
    await alertSlack('META_APP_SECRET or META_ACCESS_TOKEN missing — webhook cannot run.');
    return res.status(500).json({ error: 'config' });
  }

  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === META_APP_SECRET) return res.status(200).send(challenge);
    return res.status(403).send('Verificatie mislukt');
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'leadgen') continue;
          const leadId = change.value && change.value.leadgen_id;
          if (!leadId) continue;
          try {
            const fbResponse = await withTimeout(
              fetch(`https://graph.facebook.com/v21.0/${leadId}?access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`),
              TIMEOUT_MS, 'graph');
            const full = await fbResponse.json();
            if (full && full.field_data && SLACK_WEBHOOK_URL) {
              const fields = {};
              full.field_data.forEach(it => { fields[it.name] = it.values && it.values[0]; });
              const name = fields.full_name || 'Onbekend';
              const phone = fields.phone_number || '-';
              const city = fields.city || '-';
              await withTimeout(fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `:rocket: *Nieuwe lead* — ${name} · ${phone} · ${city}` })
              }), TIMEOUT_MS, 'slack');
            }
          } catch (e) {
            console.error('webhook err:', e.message);
            await alertSlack(`Lead ${leadId} processing failed: ${e.message}`);
          }
        }
      }
    }
    return res.status(200).json({ status: 'ok' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
