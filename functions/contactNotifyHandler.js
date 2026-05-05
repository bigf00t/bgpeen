const nodemailer = require('nodemailer');

const NOTIFY_TO = 'jeremydsnell@gmail.com';
const NOTIFY_FROM = 'jeremydsnell@gmail.com';

const handler = async (event) => {
  const data = event.data.data();
  if (!data) return;

  const { email, message, date } = data;
  const replyTo = email?.trim() || null;
  const submitted = date?.toDate?.()?.toISOString() ?? new Date().toISOString();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: NOTIFY_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"goodat.games contact" <${NOTIFY_FROM}>`,
    to: NOTIFY_TO,
    ...(replyTo ? { replyTo } : {}),
    subject: `New contact message${replyTo ? ` from ${replyTo}` : ''}`,
    text: [
      `From: ${replyTo || '(no email)'}`,
      `Date: ${submitted}`,
      '',
      message,
    ].join('\n'),
  });
};

module.exports = { handler };
