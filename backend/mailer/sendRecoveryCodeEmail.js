// backend/mailer/sendRecoveryCodeEmail.js
const nodemailer = require('nodemailer');

function makeTransport(port) {
  const secure = String(port) === '465';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(port),
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 8000,   // 8s
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false } // на shared IP бывает полезно
  }, {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  });
}

module.exports = async function sendRecoveryCodeEmail(to, code) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration missing');
  }

  const html = `
    <div style="font-family:Poppins,Arial,sans-serif;font-size:16px;color:#333">
      <p>Ваш код для відновлення паролю:</p>
      <div style="display:flex;align-items:center;gap:12px;margin:12px 0">
        <span style="font:bold 28px/1.2 Poppins,Arial;color:#275D2B;letter-spacing:2px">${code}</span>
        <span style="font-size:12px;color:#888;background:#F5F5F5;border-radius:8px;padding:6px 10px">дійсний 15 хвилин</span>
      </div>
      <p style="margin-top:8px;color:#666">Якщо ви не надсилали запит — просто ігноруйте цей лист.</p>
    </div>
  `;

  const mail = { to, subject: 'Відновлення паролю', text: `Ваш код: ${code} (дійсний 15 хвилин)`, html };

  const ports = [Number(process.env.SMTP_PORT) || 587, 2525, 465];
  let lastErr;
  for (const port of ports) {
    try {
      const t = makeTransport(port);
      const info = await t.sendMail(mail);
      console.log(`[Mailer] ✅ sent via ${port}: ${info.messageId || ''}`);
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`[Mailer] ⚠️ port ${port} failed: ${e.message}`);
    }
  }
  console.error('[Mailer] ❌ all ports failed:', lastErr?.message);
  throw lastErr || new Error('send failed');
};