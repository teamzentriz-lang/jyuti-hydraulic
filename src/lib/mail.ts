import nodemailer from "nodemailer";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEnquiryEmail(input: {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}) {
  if (!mailConfigured() || !input.to) return { sent: false as const };
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
  });
  return { sent: true as const };
}
