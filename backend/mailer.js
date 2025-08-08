const nodemailer = require("nodemailer");
const https = require("https");

const HOST = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const USER = process.env.BREVO_USER || process.env.EMAIL_FROM;
const PASS = process.env.BREVO_PASS || process.env.EMAIL_PASS;
const API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY; // Brevo API fallback

const FROM_NAME = "Інститут Професійної Супервізії";
const REPLY_TO = "profsupervision@gmail.com";

const SMTP_PORTS = [
  { port: 587, secure: false, label: "587 STARTTLS" },
  { port: 2525, secure: false, label: "2525 STARTTLS" },
  { port: 465, secure: true,  label: "465 SSL" },
];

function makeTransport({ port, secure }) {
  return nodemailer.createTransport({
    host: HOST,
    port,
    secure,
    auth: { user: USER, pass: PASS },
    logger: true,
    debug: true,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false },
  });
}

async function trySmtp(mail) {
  let lastErr;
  for (const opt of SMTP_PORTS) {
    try {
      const t = makeTransport(opt);
      await t.verify();
      const info = await t.sendMail(mail);
      console.log(`✅ SMTP OK via ${opt.label}`, { messageId: info.messageId, response: info.response });
      return { ok: true, transport: `smtp:${opt.label}`, messageId: info.messageId };
    } catch (e) {
      lastErr = e;
      console.warn(`⚠️ SMTP failed on ${opt.label}:`, e?.code || e?.message || e);
    }
  }
  return { ok: false, error: lastErr?.message || String(lastErr) };
}

function tryBrevoApi({ to, subject, html, fromEmail, fromName }) {
  return new Promise((resolve) => {
    if (!API_KEY) return resolve({ ok: false, error: "BREVO_API_KEY missing" });

    const payload = JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      replyTo: { email: REPLY_TO },
    });

    const req = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        method: "POST",
        headers: {
          "api-key": API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 8000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            console.log("✅ Brevo API OK:", body);
            resolve({ ok: true, transport: "brevo-api" });
          } else {
            console.warn("⚠️ Brevo API failed:", res.statusCode, body);
            resolve({ ok: false, error: `API ${res.statusCode}: ${body}` });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.warn("⚠️ Brevo API error:", err?.message || err);
      resolve({ ok: false, error: err?.message || String(err) });
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));

    req.write(payload);
    req.end();
  });
}

module.exports = async function sendRegistrationEmail(to, firstName = "", lastName = "") {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();
  const fromEmail = USER;
  const fromName  = FROM_NAME;
  const subject   = "Підтвердження отримання заявки на реєстрацію";
  const html      = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
      <p>Шановна/ий <strong>${fullName || "користувачу"}</strong>,</p>
      <p>
        Дякуємо за вашу заявку на реєстрацію до особистого кабінету на нашому сайті 
        <a href="https://mamko-prof-supervision.com/" target="_blank">Інституту Професійної Супервізії</a>.
      </p>
      <p>
        Наразі ваша заявка перебуває на розгляді. Найближчим часом вона буде підтверджена, 
        та Ви отримаєте лист з усіма необхідними даними для входу та користування кабінетом.
      </p>
      <p>
        Якщо у вас виникнуть запитання, ви можете звертатися на електронну пошту:<br>
        <a href="mailto:${REPLY_TO}">${REPLY_TO}</a>
      </p>
      <p>З повагою,<br><strong>Команда IPS</strong></p>
    </div>`;

  const mail = {
    from: `${fromName} <${fromEmail}>`,
    to,
    replyTo: REPLY_TO,
    envelope: { from: fromEmail, to },
    subject,
    html,
  };

  // 1) Try SMTP with 3 ports
  const smtpRes = await trySmtp(mail);
  if (smtpRes.ok) return smtpRes;

  // 2) Fallback to HTTP API (port 443)
  const apiRes = await tryBrevoApi({ to, subject, html, fromEmail, fromName });
  if (apiRes.ok) return apiRes;

  console.error("❌ Email failed via all methods", { smtpError: smtpRes.error, apiError: apiRes.error });
  return { ok: false, error: smtpRes.error || apiRes.error || "Unknown error" };
};
