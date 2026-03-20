
exports.handler = async function (event, context) {
  // Dit is de NETLIFY SERVERLESS FUNCTION structuur (ipv Vercel)
  const META_APP_SECRET = process.env.META_APP_SECRET || 'mijn_geheime_verificatie_token_beutech';
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  // GET: De verificatie door Meta App
  if (event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    if (qs['hub.mode'] === 'subscribe' && qs['hub.verify_token'] === META_APP_SECRET) {
      return { statusCode: 200, body: qs['hub.challenge'] };
    }
    return { statusCode: 403, body: 'Verificatie mislukt' };
  }

  // POST: Lead komt binnen
  if (event.httpMethod === 'POST') {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch(e) {
      return { statusCode: 400, body: 'Invalid JSON' };
    }

    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadId = change.value?.leadgen_id;
            if (leadId) {
              try {
                // Haal details op bij Facebook
                const fetch = (await import('node-fetch')).default;
                const fbRes = await fetch(`https://graph.facebook.com/v21.0/${leadId}?access_token=${META_ACCESS_TOKEN}`);
                const fullLead = await fbRes.json();

                if (fullLead.field_data) {
                  let fields = {};
                  fullLead.field_data.forEach(item => { fields[item.name] = item.values[0]; });

                  const name = fields['full_name'] || 'Onbekend';
                  const phone = fields['phone_number'] || 'Onbekend';
                  const city = fields['city'] || 'Onbekend';

                  // Stuur Slack alert als webhook is ingesteld
                  if (SLACK_WEBHOOK_URL) {
                    await fetch(SLACK_WEBHOOK_URL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: `🚨 *NIEUWE BEUTECH LEAD BINNEN (VIA NETLIFY)!* 🚨\n\n*Naam:* ${name}\n*Telefoon:* ${phone}\n*Woonplaats:* ${city}\n\n👉 _Bel deze kandidaat nu direct!_`
                      })
                    });
                  }
                }
              } catch (err) {
                console.error('[!] Fout bij ophalen/sturen lead in Netlify:', err);
              }
            }
          }
        }
      }
    }
    return { statusCode: 200, body: JSON.stringify({status: 'ok'}) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
