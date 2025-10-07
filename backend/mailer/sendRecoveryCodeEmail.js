// backend/mailer/sendRecoveryCodeEmail.js
const nodemailer = require('nodemailer');

module.exports = async function sendRecoveryCodeEmail(to, code) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[Mailer] ❌ SMTP environment variables are missing.');
      throw new Error('SMTP configuration missing');
    }

    const isSecure = String(process.env.SMTP_PORT) === '465';
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Відновлення паролю',
      text: `Ваш код: ${code} (дійсний 15 хвилин)`,
      html: `
        <div style="font-family: Poppins, sans-serif; font-size: 16px; color: #333;">
          <p>Ваш код для відновлення паролю:</p>
          <h2 style="color:#275D2B; letter-spacing: 2px;">${code}</h2>
          <p>Код дійсний <b>15 хвилин</b>.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] ✅ Recovery code sent to ${to}`);
  } catch (error) {
    console.error('[Mailer] ❌ Failed to send recovery email:', error.message);
    throw error;
  }
};