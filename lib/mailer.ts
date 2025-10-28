import nodemailer from "nodemailer";

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: MailOptions) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.error("Konfigurasi SMTP tidak lengkap. Email tidak akan dikirim.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: EMAIL_FROM || '"Zee Index" <no-reply@example.com>',
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject,
      html: html,
    });
    console.log(`Email berhasil dikirim ke: ${to}`);
  } catch (error) {
    console.error("Gagal mengirim email:", error);
  }
}
