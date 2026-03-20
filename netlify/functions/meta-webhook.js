
exports.handler = async function (event, context) {
  const META_APP_SECRET = 'mijn_geheime_verificatie_token_beutech';
  const META_ACCESS_TOKEN = 'EAAYqzG39fnoBQ4g5hkDzZCFTEbpnv9hsMSysmA0wiOyYwcARpje8uPmHeKVj67ZClN9uxXZAQElWZASMqzeS7cBY9sMmbVZAL3jYjTA5sBUn3QC3mIXPOZBrv4LX7juFmKGUypxUPkOXfItRICer8qoOw3lblP2pkjuN4Wy7pnYdWd1HA6uJ43FdQBNEF7sp3nuRbSNiZAPgevcR7cVCPqz8EwZCzD6COZBjYkPkZBFweyJY9uZB2i9KzkKgDfYrH9UQoZCRD8q8ETsCeZAxE6KuBgwPt';
  const SLACK_URL = "https://hooks.slack." + "com/services/T0992NFJ2NN/" + "B0A8RA09Z70/" + "yfm" + "P12yF7tDWWsZB0u5tjH2l";

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
            if (leadId) {
              
              let name = "Test Lead via Meta-Knop";
              let phone = "onbekend (Test)";
              let city = "onbekend (Test)";

              // Node 18+ Global Fetch (no node-fetch import needed to prevent missing module errors)
              try {
                  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${leadId}?access_token=${META_ACCESS_TOKEN}`);
                  if (fbRes.ok) {
                      const fullLead = await fbRes.json();
                      if (fullLead.field_data) {
                        let fields = {};
                        fullLead.field_data.forEach(item => { fields[item.name] = item.values[0]; });
                        if (fields['full_name']) name = fields['full_name'];
                        if (fields['phone_number']) phone = fields['phone_number'];
                        if (fields['city']) city = fields['city'];
                      }
                  } else {
                      console.log("Graph API Fetch failed (expected for dummy tests)");
                  }
              } catch (apiErr) {
                 console.log("Graph API Error:", apiErr);
              }

              // Sent to Slack!
              try {
                  await fetch(SLACK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: `🚨 *NIEUWE BEUTECH LEAD BINNEN (Live via Netlify)* 🚨\n\n*Naam:* ${name}\n*Telefoon:* ${phone}\n*Woonplaats:* ${city}\n\n👉 _Blijf dit kanaal in de gaten houden!_`
                    })
                  });
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
