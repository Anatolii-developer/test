// backend/mailer/sendRecoveryCodeEmail.js
const nodemailer = require('nodemailer');

async function buildTransport(port) {
  const isSecure = String(port) === '465'; // 587/2525 -> STARTTLS, 465 -> SSL
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(port),
    secure: isSecure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }, {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  });

  // проверим соединение заранее — удобнее дебажить
  await transporter.verify();
  return transporter;
}

module.exports = async function sendRecoveryCodeEmail(to, code) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Mailer] ❌ SMTP env missing');
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

  const mail = {
    to,
    subject: 'Відновлення паролю',
    text: `Ваш код: ${code} (дійсний 15 хвилин)`,
    html,
    replyTo: process.env.SMTP_FROM, // чтобы ответы шли на твой Gmail
  };

  // 1-я попытка: 587 → 2-я: 2525
  const ports = [process.env.SMTP_PORT || 587, 2525].map(Number);
  let lastErr;
  for (const port of ports) {
    try {
      const transporter = await buildTransport(port);
      const info = await transporter.sendMail(mail);
      console.log(`[Mailer] ✅ sent via port ${port}: ${info.messageId || ''}`);
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`[Mailer] ⚠️ failed on port ${port}:`, e.message);
    }
  }
  console.error('[Mailer] ❌ all ports failed:', lastErr?.message);
  throw lastErr || new Error('send failed');
};