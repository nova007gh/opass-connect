import nodemailer from 'nodemailer';

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const FROM_EMAIL = process.env.SMTP_FROM || 'OPASS CONNECT <noreply@opassconnect.org>';
const FRONTEND_URL = process.env.WEB_URL || 'https://opass-connect.vercel.app';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_CONFIGURED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const emailTemplate = (title: string, body: string, link?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0B2D6B 0%, #1a4a9e 100%);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">OPASS CONNECT</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Ofori Panin Senior High School Alumni</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#0B2D6B;font-size:18px;font-weight:700;">${escapeHtml(title)}</h2>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${escapeHtml(body)}</p>
          ${link ? `<a href="${FRONTEND_URL}${escapeHtml(link)}" style="display:inline-block;background:#0B2D6B;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Open in App</a>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">You received this email because you have an OPASS CONNECT account.<br/>One School. One Network. One Legacy.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export async function sendEmail(to: string, subject: string, title: string, body: string, link?: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    return false;
  }
  try {
    await t.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `OPASS CONNECT — ${subject}`,
      html: emailTemplate(title, body, link),
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendEmailToUser(userId: string, subject: string, title: string, body: string, link?: string): Promise<boolean> {
  const user = await import('@opass/db').then(m => m.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }));
  if (!user?.email) return false;
  return sendEmail(user.email, subject, title, body, link);
}

export { SMTP_CONFIGURED };
