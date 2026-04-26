// Meta Lead-Ads webhook → Supabase + Lemlist + Slack alert
// APK-pattern hardened: env-only secrets, timeout, fail-closed Slack alerts on silent failures
//
// Required env vars:
//   META_APP_SECRET           — verify_token for GET subscribe
//   META_ACCESS_TOKEN         — Meta Graph API token (Page-scoped, leads_retrieval)
//   SLACK_WEBHOOK_URL         — Slack incoming webhook (#leads-meta)
//   SLACK_ALERT_WEBHOOK_URL   — Slack webhook for failure alerts (#alerts), falls back to SLACK_WEBHOOK_URL
//   SUPABASE_URL              — https://<id>.supabase.co
//   SUPABASE_SERVICE_KEY      — service_role key
//   LEMLIST_API_KEY           — Lemlist API key
//   LEMLIST_DEFAULT_CAMPAIGN_ID — fallback Lemlist campaign id
//   PIPEDRIVE_API_TOKEN       — optional, for deal creation
//   PIPEDRIVE_COMPANY_DOMAIN  — e.g. recruitinbv (no full URL)

const TIMEOUT_MS = 8000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms: ${label || ''}`)), ms))
  ]);
}

async function fetchJson(url, opts = {}, label = '') {
  const res = await withTimeout(fetch(url, opts), TIMEOUT_MS, label);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { /* keep as text */ }
  return { ok: res.ok, status: res.status, json, text };
}

async function alertSlack(message) {
  const url = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!url) { console.error('[!] alertSlack: no webhook configured'); return; }
  try {
    await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `:rotating_light: *VK meta-webhook alert*\n${message}` })
    }), TIMEOUT_MS, 'slack-alert');
  } catch (e) {
    console.error('[!] alertSlack failed:', e.message);
  }
}

// Pipedrive: search-then-create dedup pattern (APK)
async function pipedriveUpsertPerson({ email, name, phone }) {
  const tok = process.env.PIPEDRIVE_API_TOKEN;
  const dom = process.env.PIPEDRIVE_COMPANY_DOMAIN;
  if (!tok || !dom || !email || email === '-') return null;
  const base = `https://${dom}.pipedrive.com/api/v1`;
  try {
    const search = await fetchJson(
      `${base}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&api_token=${tok}`,
      { method: 'GET' }, 'pipedrive-search');
    const item = search.json && search.json.data && search.json.data.items && search.json.data.items[0];
    if (item && item.item && item.item.id) return item.item.id;
    // Create
    const create = await fetchJson(
      `${base}/persons?api_token=${tok}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || email, email: [{ value: email, primary: true }], phone: phone && phone !== '-' ? [{ value: phone, primary: true }] : undefined })
      },
      'pipedrive-create');
    return create.json && create.json.data && create.json.data.id || null;
  } catch (e) {
    console.error('Pipedrive upsert error:', e.message);
    return null;
  }
}

exports.handler = async function (event) {
  const META_APP_SECRET = process.env.META_APP_SECRET;
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const SLACK_URL = process.env.SLACK_WEBHOOK_URL;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const LEMLIST_API_KEY = process.env.LEMLIST_API_KEY;
  const LEMLIST_CAMPAIGN_ID = process.env.LEMLIST_DEFAULT_CAMPAIGN_ID;

  // Fail-closed: required core secrets must exist
  if (!META_APP_SECRET || !META_ACCESS_TOKEN) {
    await alertSlack('META_APP_SECRET or META_ACCESS_TOKEN missing in env — webhook cannot run.');
    return { statusCode: 500, body: 'config error' };
  }

  // GET = Meta verification handshake
  if (event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    if (qs['hub.mode'] === 'subscribe' && qs['hub.verify_token'] === META_APP_SECRET) {
      return { statusCode: 200, body: qs['hub.challenge'] };
    }
    return { statusCode: 403, body: 'Verificatie mislukt' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (_) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (data.object !== 'page') return { statusCode: 200, body: JSON.stringify({ status: 'ignored' }) };

  const errors = [];

  for (const entry of data.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const leadId = change.value && change.value.leadgen_id;
      const formId = (change.value && change.value.form_id) || 'unknown';
      if (!leadId) continue;

      let name = 'Nieuwe Sollicitant', first_name = 'Kandidaat', last_name = '';
      let phone = '-', city = '-', email = '-', job = 'Onbekend';

      // 1) Fetch full lead from Meta
      try {
        const fb = await fetchJson(
          `https://graph.facebook.com/v21.0/${leadId}?access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`,
          { method: 'GET' }, 'graph-lead');
        const fields = {};
        if (fb.json && fb.json.field_data) fb.json.field_data.forEach(it => { fields[it.name] = it.values && it.values[0]; });
        if (fields['full_name']) {
          name = fields['full_name'];
          const parts = name.split(' ');
          first_name = parts[0]; last_name = parts.slice(1).join(' ');
        }
        if (fields['phone_number']) phone = fields['phone_number'];
        if (fields['email']) email = fields['email'];
        if (fields['city']) city = fields['city'];
        job = fields['job_title'] || fields['vacature'] || job;
      } catch (e) {
        errors.push(`graph: ${e.message}`);
      }

      // 2) Supabase insert (silent failure → alert)
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const r = await fetchJson(`${SUPABASE_URL}/rest/v1/vk_leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              lead_id: leadId, form_id: formId,
              full_name: name, email, phone, city,
              source: 'meta_ads', status: 'new'
            })
          }, 'supabase-insert');
          if (!r.ok) errors.push(`supabase ${r.status}: ${r.text.slice(0,140)}`);
        } catch (e) { errors.push(`supabase: ${e.message}`); }
      } else {
        errors.push('supabase env missing');
      }

      // 3) Lemlist
      if (LEMLIST_API_KEY && LEMLIST_CAMPAIGN_ID && email !== '-') {
        try {
          const r = await fetchJson(`https://api.lemlist.com/api/campaigns/${LEMLIST_CAMPAIGN_ID}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(':' + LEMLIST_API_KEY).toString('base64')}`
            },
            body: JSON.stringify({
              email, firstName: first_name, lastName: last_name, phone,
              customFields: { city, job_title: job, source: 'Vacaturekanon Meta Ad' }
            })
          }, 'lemlist-add');
          // 400 "already in campaign" = duplicate (skip silently)
          if (!r.ok && !(r.text && /already/i.test(r.text))) {
            errors.push(`lemlist ${r.status}: ${(r.text || '').slice(0,140)}`);
          }
        } catch (e) { errors.push(`lemlist: ${e.message}`); }
      }

      // 4) Pipedrive (search-then-create dedup)
      try { await pipedriveUpsertPerson({ email, name, phone }); }
      catch (e) { errors.push(`pipedrive: ${e.message}`); }

      // 5) Slack lead notification
      if (SLACK_URL) {
        try {
          await fetchJson(SLACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `:rocket: *Nieuwe Vacaturekanon-lead*\n*Naam:* ${name}\n*Email:* ${email}\n*Telefoon:* ${phone}\n*Woonplaats:* ${city}\n*Vacature:* ${job}\n_Lead is opgeslagen in Supabase + Lemlist + Pipedrive._`
            })
          }, 'slack-notify');
        } catch (e) { errors.push(`slack: ${e.message}`); }
      }
    }
  }

  if (errors.length) {
    await alertSlack(`Errors during lead processing:\n\`\`\`\n${errors.join('\n')}\n\`\`\``);
  }

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', errors: errors.length }) };
};
