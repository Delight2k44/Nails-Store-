// Netlify Serverless Function: netlify/functions/send-email.js
// Handles Resend email dispatch securely on the backend for Netlify deployments with Sandbox Fallback

const DEFAULT_SALON = {
    name: "Ndi's Nail Bar",
    phone: "071 599 6931",
    address: "08 Feaure Bloemvailly, Bloemvaily, Willows, 9301",
    adminEmail: process.env.ADMIN_EMAIL || "ndivhuwovele5@gmail.com",
    fromEmail: process.env.RESEND_FROM_EMAIL || "Ndi's Nail Bar <onboarding@resend.dev>",
    instagram: "https://www.instagram.com/ndivhu_vele?igsi=MXczeWQxa3luNzdnZA%3D%3D&utm_source=qr",
    facebook: "https://www.facebook.com/share/1EkgQ7v7mC/?mibextid=wwXIfr",
    tiktok: "https://www.tiktok.com/@ndis_nail_bar?_r=1&_t=ZS-99CW3LynM1P"
};

function formatPrice(val) {
    if (val === undefined || val === null || val === '') return 'R0.00';
    const num = parseFloat(val);
    return isNaN(num) ? `R${val}` : `R${num.toFixed(2)}`;
}

function buildClientBookingReceivedHtml(booking, salon, sandboxNote = '') {
    const addons = Array.isArray(booking.addons) && booking.addons.length > 0 
        ? booking.addons.join(", ") 
        : (booking.addons || "None");
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-PENDING";

    const sandboxBanner = sandboxNote ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; line-height: 1.5;">
            <strong>ℹ️ Resend Sandbox Test Mode:</strong><br>
            Intended Client: <strong>${booking.clientEmail || 'Client'}</strong><br>
            <em>To send directly to external client emails, verify your domain at <a href="https://resend.com/domains" target="_blank" style="color: #856404; font-weight: bold;">resend.com/domains</a>.</em>
        </div>
    ` : '';

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
                <div style="display: inline-block; background-color: rgba(200, 143, 123, 0.25); color: #f4d6cb; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 14px; border: 1px solid rgba(200, 143, 123, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                    Booking Request Received
                </div>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px 25px;">
                ${sandboxBanner}
                
                <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #1e1613;">Hi ${booking.clientName || 'Valued Guest'}, ✨</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #6b5c57; margin: 0 0 22px;">
                    Thank you for scheduling your session with <strong>${salon.name}</strong>. We have received your booking request. Our studio is reviewing your slot and you will receive a confirmation shortly.
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
                                    <td style="padding: 8px 0; color: #8c7873; border-bottom: 1px dashed #e2d1c9;">Date & Time:</td>
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
                            💬 <strong>Need to adjust your time?</strong> Message us on WhatsApp or reply to this email.
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
                <h1 style="margin: 0; font-size: 20px; color: #f4d6cb; letter-spacing: 1px;">🔔 NEW APPOINTMENT BOOKING</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #dcdcd5;">${salon.name} Studio Notification</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 24px;">
                <div style="background-color: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 20px; text-align: center;">
                    ✨ A new appointment booking request was submitted on the website!
                </div>
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Booking ID:</td><td style="padding: 8px 0; font-family: monospace; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px solid #f0f0f0;">${bookingId}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Name:</td><td style="padding: 8px 0; font-weight: 700; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.clientName || 'Unknown'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Phone:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;"><a href="tel:${booking.clientPhone || ''}" style="color: #b76e79; font-weight: 600;">${booking.clientPhone || '--'}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Client Email:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;"><a href="mailto:${booking.clientEmail || ''}" style="color: #b76e79; font-weight: 600;">${booking.clientEmail || '--'}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Service:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.service || '--'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Add-ons:</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #f0f0f0;">${addons}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Date & Time:</td><td style="padding: 8px 0; font-weight: 700; text-align: right; border-bottom: 1px solid #f0f0f0;">${booking.date || '--'} @ ${booking.time || '--'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57; border-bottom: 1px solid #f0f0f0;">Total Estimated:</td><td style="padding: 8px 0; font-weight: 700; color: #b76e79; text-align: right; border-bottom: 1px solid #f0f0f0;">${price}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 600; color: #6b5c57;">Notes / Requests:</td><td style="padding: 8px 0; text-align: right;">${booking.notes || 'None'}</td></tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f7f3ef; padding: 15px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5;">
                <p style="margin: 0;">${salon.name} Admin Panel Alert</p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildStatusUpdateHtml(booking, newStatus, customNote, salon) {
    const isApproved = newStatus === 'confirmed';
    const statusLabel = isApproved ? "APPOINTMENT CONFIRMED! 🎉" : "BOOKING UPDATE ℹ️";
    const statusColor = isApproved ? "#27ae60" : "#c0392b";
    const statusBg = isApproved ? "#e8f5e9" : "#fbe9e7";
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-APPOINTMENT";

    const noteBlock = customNote ? `
        <div style="background-color: #fff8e1; border: 1px solid #ffe082; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #795548;">
            <strong>Studio Note:</strong><br>${customNote}
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
                    Hi <strong>${booking.clientName || 'Guest'}</strong>,<br>
                    ${isApproved ? 'Great news! Your booking has been approved and confirmed. We look forward to welcoming you to our salon.' : 'We are writing to inform you of a status update regarding your nail appointment request.'}
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
                                <tr><td style="padding: 8px 0 2px; color: #8c7873;">Current Status:</td><td style="padding: 8px 0 2px; color: ${statusColor}; font-weight: 700; text-transform: uppercase; text-align: right;">${newStatus}</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="font-size: 13px; color: #6b5c57; line-height: 1.6; margin: 0;">
                    📍 <strong>Location:</strong> ${salon.address}<br>
                    📞 <strong>Phone / WhatsApp:</strong> ${salon.phone}
                </p>
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

// Resend Dispatcher with Sandbox Fallback Detection
async function sendResendMail(apiKey, from, to, subject, html) {
    const recipients = Array.isArray(to) ? to : [to];
    const validRecipients = recipients.filter(email => email && email.includes('@'));

    if (validRecipients.length === 0) {
        return { success: false, message: "No valid recipient email provided." };
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: from || DEFAULT_SALON.fromEmail,
                to: validRecipients,
                subject: subject,
                html: html
            })
        });

        const data = await response.json();

        // Check if failed due to Sandbox test restriction (403 validation_error on onboarding@resend.dev)
        if (!response.ok && data.statusCode === 403 && data.message && data.message.includes("only send testing emails to your own email address")) {
            const match = data.message.match(/\(([^)]+)\)/);
            const verifiedOwnerEmail = match ? match[1] : null;

            if (verifiedOwnerEmail && !validRecipients.includes(verifiedOwnerEmail)) {
                console.info(`[Resend Sandbox Fallback] Forwarding test email for ${validRecipients.join(', ')} to verified account owner: ${verifiedOwnerEmail}`);
                
                const fallbackRes = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        from: "onboarding@resend.dev",
                        to: [verifiedOwnerEmail],
                        subject: `[Sandbox Test] ${subject}`,
                        html: html
                    })
                });

                const fallbackData = await fallbackRes.json();
                if (fallbackRes.ok) {
                    return {
                        success: true,
                        id: fallbackData.id,
                        sandboxRedirect: true,
                        deliveredTo: verifiedOwnerEmail,
                        note: "Delivered to Resend account owner in Sandbox mode. Verify a custom domain at resend.com/domains to send directly to external client emails."
                    };
                }
            }
        }

        if (!response.ok) {
            return { success: false, error: data };
        }
        return { success: true, id: data.id };
    } catch (err) {
        return { success: false, error: err.message || "Network exception during dispatch" };
    }
}

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { type, booking = {}, newStatus, customNote, testRecipient, apiKeyOverride } = body;

        const apiKey = process.env.RESEND_API_KEY || apiKeyOverride;
        const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_SALON.fromEmail;
        const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_SALON.adminEmail;

        if (!apiKey || apiKey.length < 8) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    simulated: true,
                    message: "No RESEND_API_KEY configured in Environment Variables. Email simulated successfully.",
                    details: { type, recipient: booking.clientEmail || adminEmail }
                })
            };
        }

        const salon = { ...DEFAULT_SALON, fromEmail, adminEmail };

        if (type === 'test') {
            const target = testRecipient || adminEmail;
            const testHtml = buildClientBookingReceivedHtml({
                id: "NB-TEST-001",
                clientName: "Test Guest",
                clientEmail: target,
                clientPhone: "071 599 6931",
                service: "Luxury Gel Manicure",
                addons: ["Matte Top Coat", "Paraffin Treatment"],
                date: "2026-09-15",
                time: "14:00",
                totalPrice: 65,
                notes: "Resend Email Integration Verification"
            }, salon);

            const result = await sendResendMail(apiKey, fromEmail, target, `✨ Test Email - ${salon.name}`, testHtml);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }

        if (type === 'booking_created') {
            const results = {};
            if (booking.clientEmail) {
                const clientHtml = buildClientBookingReceivedHtml(booking, salon);
                results.client = await sendResendMail(
                    apiKey,
                    fromEmail,
                    booking.clientEmail,
                    `✨ Booking Request Received: ${salon.name} (#${booking.id || ''})`,
                    clientHtml
                );
            }
            const adminHtml = buildAdminAlertHtml(booking, salon);
            results.admin = await sendResendMail(
                apiKey,
                fromEmail,
                adminEmail,
                `🔔 New Booking Alert: ${booking.clientName || 'Client'} - ${booking.service || 'Nails'} (#${booking.id || ''})`,
                adminHtml
            );

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, results }) };
        }

        if (type === 'booking_status') {
            const results = {};
            const isApproved = newStatus === 'confirmed';
            const subjectPrefix = isApproved ? "🎉 Appointment Confirmed!" : "Update regarding your booking";

            if (booking.clientEmail) {
                const clientHtml = buildStatusUpdateHtml(booking, newStatus, customNote, salon);
                results.client = await sendResendMail(
                    apiKey,
                    fromEmail,
                    booking.clientEmail,
                    `${subjectPrefix} - ${salon.name} (#${booking.id || ''})`,
                    clientHtml
                );
            }

            const adminHtml = buildStatusUpdateHtml(booking, newStatus, customNote, salon);
            results.admin = await sendResendMail(
                apiKey,
                fromEmail,
                adminEmail,
                `[Admin Log] Booking ${newStatus}: ${booking.clientName || ''} (#${booking.id || ''})`,
                adminHtml
            );

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, results }) };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: `Unknown type: ${type}` }) };

    } catch (err) {
        console.error("Netlify email function error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message || "Server Error" }) };
    }
};
