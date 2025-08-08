const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  logger: true,
  debug: true,
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  },
  tls: { ciphers: "SSLv3" }
});

transporter.verify()
  .then(() => console.log("✅ SMTP verify: OK"))
  .catch(err => {
    console.warn("⚠️ SMTP verify failed:", err?.message || err);
  });

async function sendRegistrationEmail(to, firstName = "", lastName = "") {
  const fullName = `${firstName} ${lastName}`.trim();

  try {
    await transporter.sendMail({
      from: `Інститут Професійної Супервізії <${process.env.BREVO_USER}>`,
      replyTo: "profsupervision@gmail.com",
      envelope: { from: process.env.BREVO_USER, to },
      to,
      subject: "Підтвердження отримання заявки на реєстрацію",
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
          <p>Шановна/ий <strong>${fullName}</strong>,</p>
          <p>
            Дякуємо за вашу заявку на реєстрацію до особистого кабінету на нашому сайті 
            <a href="https://mamko-prof-supervision.com/" target="_blank">Інституту Професійної Супервізії</a>.
          </p>
          <p>
            Наразі ваша заявка перебуває на розгляді. Найближчим часом вона буде підтверджена, 
            та Ви отримаєте лист з усіма необхідними даними для входу та користування кабінетом.
          </p>
          <p>
            Якщо у вас виникнуть запитання, ви можете звертатися на нашу електронну пошту:<br>
            <a href="mailto:profsupervision@gmail.com">profsupervision@gmail.com</a>
          </p>
          <p>З повагою,<br><strong>Команда IPS</strong></p>
          <p>
            <img src="/" alt="IPS Logo" style="height: 50px;" /><br>
            <a href="https://mamko-prof-supervision.com/">https://mamko-prof-supervision.com/</a><br>
            <a href="https://www.facebook.com/Profsupervision/">Facebook</a>
          </p>
        </div>
      `
    
    });
    console.log("📧 sendRegistrationEmail invoked:", { to, fullName });
    return { ok: true };
  } catch (error) {
    console.error("Failed to send registration email:", error);
    return { ok: false, error: error?.message || String(error) };
  }
}

module.exports = sendRegistrationEmail;
