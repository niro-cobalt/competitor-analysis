import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Competitor Analysis <onboarding@resend.dev>';
const EMAIL_TO = process.env.EMAIL_TO;

if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Email sending will be skipped.");
}

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string) {
    if (!RESEND_API_KEY) {
        console.warn("Missing email configuration (RESEND_API_KEY). Skipping email.");
        return { success: false, error: 'Missing configuration' };
    }

    try {
        const data = await resend.emails.send({
            from: EMAIL_FROM,
            to: to,
            subject: subject,
            html: html,
        });

        if (data.error) {
             console.error("Resend API Error:", data.error);
             return { success: false, error: data.error };
        }

        console.log("Email sent successfully:", data.data?.id);
        return { success: true, id: data.data?.id };

    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
}
