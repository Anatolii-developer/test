// backend/mailer/sendRecoveryCodeEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

module.exports = async function sendRecoveryCodeEmail(to, code) {
  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Відновлення пароля</h2>
      <p>Ваш код для відновлення: <b style="font-size:18px">${code}</b></p>
      <p>Код дійсний 15 хвилин.</p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@your-domain.com',
    to,
    subject: 'Код відновлення пароля',
    html,
  });
};