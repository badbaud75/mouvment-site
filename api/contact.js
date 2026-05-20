import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { nom, email, telephone, objet, message, honeypot } = req.body || {};

  // Anti-spam honeypot (les bots remplissent ce champ caché)
  if (honeypot) return res.status(200).json({ success: true });

  if (!nom || !email || !objet || !message) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message trop long.' });
  }

  const esc = (s) => String(s).replace(/[<>]/g, '');
  const n = esc(nom);
  const e = esc(email);
  const t = telephone ? esc(telephone) : 'Non renseigné';
  const o = esc(objet);
  const m = esc(message);

  try {
    const data = await resend.emails.send({
      from: 'MOUV-MENT <contact@mouvment.fr>',
      to: ['contact@mouvment.fr'],
      replyTo: e,
      subject: `[Contact MOUV-MENT] ${o}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 600px; color: #1A1814;">
          <h2 style="font-family: Georgia, serif; color: #1A1814; margin: 0 0 16px;">Nouveau message via mouvment.fr</h2>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
            <tr><td style="padding: 6px 0; color: #8A8275; width: 120px;">Nom</td><td style="padding: 6px 0;"><strong>${n}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #8A8275;">Email</td><td style="padding: 6px 0;"><a href="mailto:${e}" style="color: #8B6526;">${e}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #8A8275;">Téléphone</td><td style="padding: 6px 0;">${t}</td></tr>
            <tr><td style="padding: 6px 0; color: #8A8275;">Objet</td><td style="padding: 6px 0;">${o}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #E8DEC7;">
          <p style="white-space: pre-wrap; line-height: 1.6; margin: 16px 0;">${m}</p>
          <hr style="border: none; border-top: 1px solid #E8DEC7;">
          <p style="color: #8A8275; font-size: 12px; margin-top: 16px;">
            💡 Pour répondre, cliquez simplement sur "Répondre" — votre message ira directement à ${e}.
          </p>
        </div>
      `,
    });

    if (data.error) {
      console.error('Resend error:', data.error);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
