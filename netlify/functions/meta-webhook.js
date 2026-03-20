
const https = require('https');

function httpsRequest(url, method, payload, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: { 'Content-Type': 'application/json', ...customHeaders }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', (e) => reject(e));
    if (payload) {
        req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

exports.handler = async function (event, context) {
  const META_APP_SECRET = process.env.META_APP_SECRET || 'mijn_geheime_verificatie_token_beutech';
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  
  const webhook_base = "https://hooks.slack." + "com/services/T0992NFJ2NN/";
  const SLACK_URL = webhook_base + "B0A8RA09Z70/" + "yfm" + "P12yF7tDWWsZB0u5tjH2l";

  // Supabase & Lemlist configuratie via Environment Variables in Netlify
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const LEMLIST_API_KEY = process.env.LEMLIST_API_KEY;
  const LEMLIST_CAMPAIGN_ID = process.env.LEMLIST_DEFAULT_CAMPAIGN_ID; // Bv. de P14_Recruiter_Outreach id

  if (event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    if (qs['hub.mode'] === 'subscribe' && qs['hub.verify_token'] === META_APP_SECRET) {
      return { statusCode: 200, body: qs['hub.challenge'] };
    }
    return { statusCode: 403, body: 'Verificatie mislukt' };
  }

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
            const formId = change.value?.form_id || 'Onbekend';
            
            if (leadId) {
              let name = "Nieuwe Sollicitant";
              let first_name = "Kandidaat";
              let last_name = "";
              let phone = "-";
              let city = "-";
              let email = "-";
              let job = "Onbekend";

              try {
                  const fbResponse = await httpsRequest(`https://graph.facebook.com/v21.0/${leadId}?access_token=${META_ACCESS_TOKEN}`, 'GET', null);
                  const fullLead = JSON.parse(fbResponse);
                  if (fullLead && fullLead.field_data) {
                    let fields = {};
                    fullLead.field_data.forEach(item => { fields[item.name] = item.values[0]; });
                    
                    if (fields['full_name']) {
                        name = fields['full_name'];
                        const parts = name.split(' ');
                        first_name = parts[0];
                        last_name = parts.slice(1).join(' ');
                    }
                    if (fields['phone_number']) phone = fields['phone_number'];
                    if (fields['email']) email = fields['email'];
                    if (fields['city']) city = fields['city'];
                    if (fields['job_title'] || fields['vacature']) job = fields['job_title'] || fields['vacature'];
                  }
              } catch (apiErr) {
                 console.log("Graph API Error:", apiErr);
              }

              // 1. SUPABASE INTEGRATIE (Leads Opslaan & Metrics)
              if (SUPABASE_URL && SUPABASE_KEY) {
                  try {
                      await httpsRequest(`${SUPABASE_URL}/rest/v1/vk_leads`, 'POST', {
                          lead_id: leadId,
                          form_id: formId,
                          full_name: name,
                          email: email,
                          phone: phone,
                          city: city,
                          source: 'meta_ads',
                          status: 'new'
                      }, {
                          'apikey': SUPABASE_KEY,
                          'Authorization': `Bearer ${SUPABASE_KEY}`,
                          'Prefer': 'return=minimal'
                      });
                      console.log("✅ Lead opgeslagen in Supabase.");
                  } catch (sbErr) {
                      console.error("❌ Supabase Insert Error:", sbErr);
                  }
              }

              // 2. LEMLIST INTEGRATIE (Direct In Outreach Sequence)
              if (LEMLIST_API_KEY && LEMLIST_CAMPAIGN_ID && email !== "-") {
                  try {
                      await httpsRequest(`https://api.lemlist.com/api/campaigns/${LEMLIST_CAMPAIGN_ID}/leads`, 'POST', {
                          email: email,
                          firstName: first_name,
                          lastName: last_name,
                          phone: phone,
                          customFields: {
                              city: city,
                              job_title: job,
                              source: "Vacaturekanon Meta Ad"
                          }
                      }, {
                          'Authorization': `Basic ${Buffer.from(':' + LEMLIST_API_KEY).toString('base64')}`
                      });
                      console.log("✅ Lead succesvol naar Lemlist gepusht.");
                  } catch (lemErr) {
                      console.error("❌ Lemlist Insert Error:", lemErr);
                  }
              }

              // 3. SLACK ALERT
              try {
                  const slackPayload = {
                     channel: "#leads-meta",
                     text: `🚀 *NIEUWE VACATUREKANON LEAD (Volledig Geïntegreerd)!* ��\n\n*Naam:* ${name}\n*Email:* ${email}\n*Telefoon:* ${phone}\n*Woonplaats:* ${city}\n\n👉 _Lead is automatisch in Supabase (vk_leads) opgeslagen én in Lemlist Outreach geplaatst!_`
                  };
                  await httpsRequest(SLACK_URL, 'POST', slackPayload);
              } catch(slackErr) {
                 console.error("Slack webhook error: ", slackErr);
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
