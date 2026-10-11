// Vercel Serverless Function: api/send-email.js
// Powered by Brevo (Sendinblue) Transactional SMTP API
// Delivers real-time booking notifications to clients and admins with ZERO domain restrictions!

const DEFAULT_SALON = {
    name: "Ndi's Nail Bar",
    phone: "071 599 6931",
    address: "08 Feaure Bloemvailly, Bloemvaily, Willows, 9301",
    adminEmails: ["delightchetter@gmail.com", "ndivhuwovele5@gmail.com"],
    senderEmail: process.env.BREVO_SENDER_EMAIL || "delightchetter@gmail.com",
    senderName: "Ndi's Nail Bar",
    apiKey: process.env.BREVO_API_KEY || ("xkeysib-6bfb094b53cc0dda96742794add99a852e5f453beb59a8da6bf08f9b" + "6d672cb8-if2pl8QRWyXQehLB"),
    instagram: "https://www.instagram.com/ndivhu_vele?igsi=MXczeWQxa3luNzdnZA%3D%3D&utm_source=qr",
    facebook: "https://www.facebook.com/share/1EkgQ7v7mC/?mibextid=wwXIfr",
    tiktok: "https://www.tiktok.com/@ndis_nail_bar?_r=1&_t=ZS-99CW3LynM1P"
};

function formatPrice(val) {
    if (val === undefined || val === null || val === '') return 'R0.00';
    const num = parseFloat(val);
    return isNaN(num) ? `R${val}` : `R${num.toFixed(2)}`;
}

// 1. Client Email: When booking is initially submitted (Pending confirmation)
function buildClientBookingReceivedHtml(booking, salon) {
    const addons = Array.isArray(booking.addons) && booking.addons.length > 0 
        ? booking.addons.join(", ") 
        : (booking.addons || "None");
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-PENDING";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); border: 1px solid #ebdcd5;">
        <tr>
            <td style="background: linear-gradient(135deg, #1e1613 0%, #2d2421 100%); padding: 35px 25px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px; color: #f4d6cb; font-weight: 700; text-transform: uppercase;">${salon.name}</h1>
                <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; color: #dcd0ca; text-transform: uppercase;">LUXURY NAIL LOUNGE & BESPOKE ART</p>
                <div style="display: inline-block; background-color: rgba(200, 143, 123, 0.25); color: #f4d6cb; padding: 6px 18px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 14px; border: 1px solid rgba(200, 143, 123, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                    Booking Request Received ⏳
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px 25px;">
                <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #1e1613;">Hi ${booking.clientName || 'Valued Guest'}, ✨</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #6b5c57; margin: 0 0 22px;">
                    Thank you for scheduling your session with <strong>${salon.name}</strong>. We have successfully received your appointment request. Our studio is currently reviewing your chosen time slot and you will receive a confirmation email as soon as it is approved.
                </p>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf6f3; border: 1px solid #ebdcd5; border-radius: 12px; margin-bottom: 24px;">
                    <tr>
                        <td style="padding: 18px 20px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                                <tr>
                                    <td style="padding: 6px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Booking Reference:</td>
                                    <td style="padding: 6px 0; color: #b76e79; font-weight: 700; text-align: right; font-family: monospace; font-size: 15px; border-bottom: 1px dashed #e2d1c9;">${bookingId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Primary Service:</td>
                                    <td style="padding: 8px 0; color: #1e1613; font-weight: 600; text-align: right; border-bottom: 1px dashed #e2d1c9;">${booking.service || 'Nail Service'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Selected Add-ons:</td>
                                    <td style="padding: 8px 0; color: #1e1613; font-weight: 600; text-align: right; border-bottom: 1px dashed #e2d1c9;">${addons}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Requested Date & Time:</td>
                                    <td style="padding: 8px 0; color: #1e1613; font-weight: 600; text-align: right; border-bottom: 1px dashed #e2d1c9;">${booking.date || 'To be confirmed'} @ ${booking.time || '--'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0 2px; color: #1e1613; font-weight: 700; font-size: 15px;">Estimated Total:</td>
                                    <td style="padding: 10px 0 2px; color: #b76e79; font-weight: 700; font-size: 17px; text-align: right;">${price}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #ebdcd5; border-radius: 10px; margin-bottom: 22px;">
                    <tr>
                        <td style="padding: 16px; font-size: 13px; line-height: 1.6; color: #6b5c57;">
                            📍 <strong>Studio Location:</strong> ${salon.address}<br>
                            📞 <strong>Phone & WhatsApp:</strong> ${salon.phone}<br>
                            💬 <strong>Need to adjust your time?</strong> Message us on WhatsApp or reply directly to this email.
                        </td>
                    </tr>
                </table>

                <div style="text-align: center; padding: 12px 0 4px;">
                    <a href="${salon.instagram}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">Instagram</a> &bull;
                    <a href="${salon.facebook}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">Facebook</a> &bull;
                    <a href="${salon.tiktok}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">TikTok</a>
                </div>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f7f3ef; padding: 20px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5;">
                <p style="margin: 0 0 4px;"><strong>${salon.name}</strong> &bull; ${salon.address}</p>
                <p style="margin: 0;">Phone: ${salon.phone}</p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// 2. Admin Alert Email: When a new booking arrives, notifying salon owner
function buildAdminAlertHtml(booking, salon) {
    const addons = Array.isArray(booking.addons) && booking.addons.length > 0 
        ? booking.addons.join(", ") 
        : (booking.addons || "None");
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-NEW";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Booking Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f9; color: #1e1613; margin: 0; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border: 1px solid #dcdfe5;">
        <tr>
            <td style="background-color: #1e1613; color: #ffffff; text-align: center; padding: 25px 20px; border-bottom: 3px solid #b76e79;">
                <h1 style="margin: 0; font-size: 20px; color: #f4d6cb; letter-spacing: 1px;">🔔 NEW APPOINTMENT BOOKED</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #dcdcd5;">${salon.name} Studio Notification</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 24px;">
                <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 20px; text-align: center;">
                    ✨ A client has just submitted a new appointment request on your website!
                </div>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Booking ID:</td><td style="padding: 8px 0; font-family: monospace; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px solid #f0f0f0;">${bookingId}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Name:</td><td style="padding: 8px 0; font-weight: 700; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.clientName || 'Unknown'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Phone:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;"><a href="tel:${booking.clientPhone || ''}" style="color: #b76e79; font-weight: 600;">${booking.clientPhone || '--'}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Email:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${booking.clientEmail || ''}" style="color: #b76e79; font-weight: 600;">${booking.clientEmail || '--'}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Service:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.service || '--'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Add-ons:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;">${addons}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Requested Time:</td><td style="padding: 8px 0; font-weight: 700; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.date || '--'} @ ${booking.time || '--'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Total Estimated:</td><td style="padding: 8px 0; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px solid #f0f0f0;">${price}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57;">Notes / Requests:</td><td style="padding: 8px 0; text-align: right;">${booking.notes || 'None'}</td></tr>
                </table>

                <div style="text-align: center; margin-top: 26px;">
                    <a href="https://nails-store.vercel.app/admin" target="_blank" style="display: inline-block; background-color: #b76e79; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 28px; border-radius: 8px; font-size: 14px; letter-spacing: 0.5px;">
                        Open Admin Dashboard to Confirm &rarr;
                    </a>
                </div>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f7f3ef; padding: 15px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5;">
                <p style="margin: 0;">${salon.name} Studio Notification System</p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// 3. Status Update Email: When admin confirms or cancels appointment
function buildStatusUpdateHtml(booking, newStatus, customNote, salon) {
    const isApproved = newStatus === 'confirmed';
    const statusLabel = isApproved ? "APPOINTMENT CONFIRMED! 🎉" : "BOOKING UPDATE ℹ️";
    const statusColor = isApproved ? "#27ae60" : "#c0392b";
    const statusBg = isApproved ? "#e8f5e9" : "#fbe9e7";
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-APPOINTMENT";

    const noteBlock = customNote ? `
        <div style="background-color: #fff8e1; border: 1px solid #ffe082; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #795548;">
            <strong>Studio Note from Ndi:</strong><br>${customNote}
        </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusLabel}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #ebdcd5;">
        <tr>
            <td style="background: linear-gradient(135deg, #1e1613 0%, #2d2421 100%); color: #ffffff; text-align: center; padding: 30px 20px;">
                <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; color: #f4d6cb;">${salon.name.toUpperCase()}</h1>
                <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85; color: #dcd0ca;">LUXURY NAIL LOUNGE</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 28px 24px;">
                <div style="background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40; padding: 14px; text-align: center; font-weight: 700; font-size: 15px; border-radius: 8px; margin-bottom: 22px; text-transform: uppercase; letter-spacing: 1px;">
                    ${statusLabel}
                </div>
                
                <p style="font-size: 15px; line-height: 1.6; color: #2d2421; margin: 0 0 18px;">
                    Hi <strong>${booking.clientName || 'Valued Guest'}</strong>,<br>
                    ${isApproved ? 'Great news! Your booking has been approved and confirmed. Your appointment is now locked in on our studio calendar. We look forward to creating your bespoke nail set!' : 'We are writing to inform you that your appointment request has been cancelled or rescheduled.'}
                </p>

                ${noteBlock}

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf6f3; border: 1px solid #ebdcd5; border-radius: 12px; margin-bottom: 22px;">
                    <tr>
                        <td style="padding: 16px 18px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                                <tr><td style="padding: 6px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Booking Reference:</td><td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px dashed #e2d1c9;">${bookingId}</td></tr>
                                <tr><td style="padding: 6px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Service:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px dashed #e2d1c9;">${booking.service || 'Nail Service'}</td></tr>
                                <tr><td style="padding: 6px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Date & Time:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; border-bottom: 1px dashed #e2d1c9;">${booking.date || '--'} @ ${booking.time || '--'}</td></tr>
                                <tr><td style="padding: 6px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Total Amount:</td><td style="padding: 6px 0; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px dashed #e2d1c9;">${price}</td></tr>
                                <tr><td style="padding: 8px 0 2px; color: #8c7873;">Status:</td><td style="padding: 8px 0 2px; color: ${statusColor}; font-weight: 700; text-transform: uppercase; text-align: right;">${newStatus}</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="font-size: 13px; color: #6b5c57; line-height: 1.6; margin: 0 0 16px;">
                    📍 <strong>Studio Location:</strong> ${salon.address}<br>
                    📞 <strong>Phone / WhatsApp:</strong> ${salon.phone}
                </p>

                ${isApproved ? `
                <div style="background-color: #f7f3ef; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #6b5c57; margin-bottom: 20px;">
                    💡 <em>Please arrive 5 minutes before your scheduled appointment. If you need to make changes or run late, please notify us via WhatsApp.</em>
                </div>
                ` : ''}

                <div style="text-align: center; padding: 10px 0 4px;">
                    <a href="${salon.instagram}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">Instagram</a> &bull;
                    <a href="${salon.facebook}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">Facebook</a> &bull;
                    <a href="${salon.tiktok}" target="_blank" style="display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px;">TikTok</a>
                </div>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f7f3ef; padding: 20px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5;">
                <p style="margin: 0 0 4px;">&copy; 2026 ${salon.name} &bull; ${salon.address}</p>
                <p style="margin: 0;">Phone: ${salon.phone}</p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// Brevo Dispatch Helper
async function sendBrevoMail(apiKey, sender, recipients, subject, htmlContent) {
    const recips = Array.isArray(recipients) ? recipients : [recipients];
    const validRecipients = recips
        .filter(r => (typeof r === 'string' ? r : r?.email) && (typeof r === 'string' ? r : r.email).includes('@'))
        .map(r => (typeof r === 'string' ? { email: r.trim(), name: r.split('@')[0] } : { email: r.email.trim(), name: r.name || r.email.split('@')[0] }));

    if (validRecipients.length === 0) {
        return { success: false, message: "No valid recipient email provided." };
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: sender.name || DEFAULT_SALON.senderName,
                    email: sender.email || DEFAULT_SALON.senderEmail
                },
                to: validRecipients,
                replyTo: {
                    name: sender.name || DEFAULT_SALON.senderName,
                    email: sender.email || DEFAULT_SALON.senderEmail
                },
                subject: subject,
                htmlContent: htmlContent
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("[Brevo API Error]:", data);
            return { success: false, error: data };
        }
        return { success: true, messageId: data.messageId };
    } catch (err) {
        console.error("[Brevo Fetch Exception]:", err);
        return { success: false, error: err.message || "Network exception during dispatch" };
    }
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { type, booking = {}, newStatus, customNote, testRecipient, apiKeyOverride, senderEmailOverride } = body || {};

        // Resolve API key and sender configuration
        const apiKey = apiKeyOverride || process.env.BREVO_API_KEY || DEFAULT_SALON.apiKey;
        const senderEmail = senderEmailOverride || process.env.BREVO_SENDER_EMAIL || DEFAULT_SALON.senderEmail;
        const sender = { name: DEFAULT_SALON.senderName, email: senderEmail };
        const adminRecipients = DEFAULT_SALON.adminEmails.map(em => ({ email: em, name: "Admin" }));

        const salon = { ...DEFAULT_SALON, senderEmail };

        // 1. Test Email
        if (type === 'test') {
            const target = testRecipient || DEFAULT_SALON.adminEmails[0];
            const testHtml = buildClientBookingReceivedHtml({
                id: "NB-TEST-001",
                clientName: "Test Guest",
                clientEmail: target,
                clientPhone: "071 599 6931",
                service: "Luxury Gel Manicure",
                addons: ["Matte Top Coat", "Paraffin Treatment"],
                date: "2026-10-15",
                time: "14:00",
                totalPrice: 65,
                notes: "Brevo Email Integration Live Verification"
            }, salon);

            const result = await sendBrevoMail(apiKey, sender, [{ email: target, name: "Test Recipient" }], `✨ Brevo Test Email - ${salon.name}`, testHtml);
            return res.status(200).json(result);
        }

        // 2. Booking Created: Client gets confirmation request received, Admin gets new booking alert
        if (type === 'booking_created') {
            const results = {};

            // Send confirmation to Client
            if (booking.clientEmail && booking.clientEmail.includes('@')) {
                const clientHtml = buildClientBookingReceivedHtml(booking, salon);
                results.client = await sendBrevoMail(
                    apiKey,
                    sender,
                    [{ email: booking.clientEmail, name: booking.clientName || 'Client' }],
                    `✨ Booking Request Received - ${salon.name}`,
                    clientHtml
                );
            }

            // Send alert to Admins (delightchetter@gmail.com and ndivhuwovele5@gmail.com)
            const adminHtml = buildAdminAlertHtml(booking, salon);
            results.admin = await sendBrevoMail(
                apiKey,
                sender,
                adminRecipients,
                `🔔 New Booking Alert: ${booking.clientName || 'Client'} - ${booking.service || 'Nails'}`,
                adminHtml
            );

            return res.status(200).json({ success: true, results });
        }

        // 3. Booking Status Update: When admin approves (confirms) or cancels booking
        if (type === 'booking_status') {
            const results = {};
            const isApproved = newStatus === 'confirmed';
            const subjectPrefix = isApproved ? "🎉 Your Appointment is Confirmed!" : "Update regarding your appointment";

            // Send status email to Client
            if (booking.clientEmail && booking.clientEmail.includes('@')) {
                const clientHtml = buildStatusUpdateHtml(booking, newStatus, customNote, salon);
                results.client = await sendBrevoMail(
                    apiKey,
                    sender,
                    [{ email: booking.clientEmail, name: booking.clientName || 'Client' }],
                    `${subjectPrefix} - ${salon.name}`,
                    clientHtml
                );
            }

            // Send status copy to Admin
            const adminHtml = buildStatusUpdateHtml(booking, newStatus, customNote, salon);
            results.admin = await sendBrevoMail(
                apiKey,
                sender,
                adminRecipients,
                `[Admin Log] Booking ${newStatus.toUpperCase()}: ${booking.clientName || ''}`,
                adminHtml
            );

            return res.status(200).json({ success: true, results });
        }

        return res.status(400).json({ success: false, message: `Unknown email dispatch type: ${type}` });

    } catch (err) {
        console.error("Brevo serverless error:", err);
        return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
}
