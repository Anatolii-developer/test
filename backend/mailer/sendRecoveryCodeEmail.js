// backend/mailer/sendRecoveryCodeEmail.js
const nodemailer = require('nodemailer');

module.exports = async function sendRecoveryCodeEmail(to, code) {
  const is465 = String(process.env.SMTP_PORT) === '465';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: is465, // true для 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Відновлення паролю',
    text: `Ваш код: ${code} (дійсний 15 хвилин)`,
    html: `<p>Ваш код: <b>${code}</b></p><p>Код дійсний 15 хвилин.</p>`,
  });
};