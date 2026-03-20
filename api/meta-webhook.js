export default async function handler(req, res) {
  const META_APP_SECRET = process.env.META_APP_SECRET || 'mijn_geheime_verificatie_token_beutech';
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === META_APP_SECRET) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verificatie mislukt');
  }

  if (req.method === 'POST') {
    const data = req.body;
    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadId = change.value?.leadgen_id;
            if (leadId) {
              try {
                const fbResponse = await fetch(`https://graph.facebook.com/v21.0/${leadId}?access_token=${META_ACCESS_TOKEN}`);
                const fullLeadData = await fbResponse.json();

                if (fullLeadData.field_data) {
                  const fields = {};
                  fullLeadData.field_data.forEach(item => { fields[item.name] = item.values[0]; });

                  const name = fields['full_name'] || 'Onbekend';
                  const phone = fields['phone_number'] || 'Onbekend';
                  const city = fields['city'] || 'Onbekend';

                  if (SLACK_WEBHOOK_URL) {
                    await fetch(SLACK_WEBHOOK_URL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: `🚨 *NIEUWE BEUTECH LEAD BINNEN!* 🚨\n\n*Naam:* ${name}\n*Telefoon:* ${phone}\n*Woonplaats:* ${city}\n\n👉 _Bel deze kandidaat nu direct!_`
                      })
                    });
                  }
                }
              } catch (error) {
                console.error('[!] Fout:', error);
              }
            }
          }
        }
      }
    }
    return res.status(200).json({ status: 'ok' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
