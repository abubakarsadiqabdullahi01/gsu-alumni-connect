import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL ??
  process.env.EMAIL_FROM ??
  "GSU Alumni Connect <onboarding@resend.dev>";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not configured. Email to ${to} was not sent. Subject: ${subject}`
    );
    return;
  }

  await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
    text,
  });
}
