import axios from 'axios';

// ZeptoMail (Zoho's transactional email API). Replaces the earlier Gmail SMTP
// setup — a personal Gmail account hits sending caps and anti-abuse throttling
// once real traffic shows up, which was silently breaking OTP delivery.
// Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
const ZEPTOMAIL_API_URL = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email';
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN;

// EMAIL_FROM can be "Name <address@domain>" or a bare address.
const parseFromAddress = (): { address: string; name: string } => {
  const raw = process.env.EMAIL_FROM || 'Clinical Fact <noreply@clinicalfact.com>';
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim() || 'Clinical Fact', address: match[2].trim() };
  }
  return { name: 'Clinical Fact', address: raw.trim() };
};

// Fixed OTP for the designated Apple App Review account (see App Review Information notes)
const APP_REVIEW_EMAIL = (process.env.APP_REVIEW_EMAIL || 'appreview@clinicalfact.app').trim().toLowerCase();
const APP_REVIEW_OTP_CODE = process.env.APP_REVIEW_OTP_CODE || '000000';

export const isAppReviewEmail = (email: string): boolean =>
  email.trim().toLowerCase() === APP_REVIEW_EMAIL;

// Generate 6-digit OTP
export const generateOTP = (email?: string): string => {
  if (email && isAppReviewEmail(email)) {
    return APP_REVIEW_OTP_CODE;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: 'signup' | 'login' | 'reset_password'
): Promise<boolean> => {
  if (!ZEPTOMAIL_TOKEN) {
    console.error('Cannot send OTP email: ZEPTOMAIL_TOKEN is not set');
    return false;
  }

  const subjects = {
    signup: 'Verify your email - Clinical Fact',
    login: 'Your login code - Clinical Fact',
    reset_password: 'Reset your password - Clinical Fact',
  };

  const messages = {
    signup: `Welcome to Clinical Fact! Your verification code is: <strong>${otp}</strong>`,
    login: `Your login verification code is: <strong>${otp}</strong>`,
    reset_password: `Your password reset code is: <strong>${otp}</strong>`,
  };

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subjects[type]}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px;">Clinical Fact</h1>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ${messages[type]}
          </p>

          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">${otp}</span>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            This code will expire in <strong>10 minutes</strong>.
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request this code, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} Clinical Fact. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await axios.post(
      ZEPTOMAIL_API_URL,
      {
        from: parseFromAddress(),
        to: [{ email_address: { address: email } }],
        subject: subjects[type],
        htmlbody: htmlTemplate,
      },
      {
        headers: {
          Authorization: `Zoho-enczapikey ${ZEPTOMAIL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending OTP email:', error.response?.data || error.message);
    return false;
  }
};

// Confirms the ZeptoMail API is configured. There's no cheap "ping" endpoint on
// the ZeptoMail API, so this just checks the token is present rather than
// verifying a live connection the way the old SMTP transporter did.
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!ZEPTOMAIL_TOKEN) {
    console.error('Email service not configured: ZEPTOMAIL_TOKEN is missing');
    return false;
  }
  console.log('Email service configured (ZeptoMail)');
  return true;
};
