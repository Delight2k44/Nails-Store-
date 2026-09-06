// Vercel Serverless Function: api/send-email.js
// Handles Resend email dispatch securely on the backend

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
    <title>Booking Confirmation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #ebdcd5; }
        .header { background: linear-gradient(135deg, #1e1613 0%, #2d2421 100%); color: #ffffff; text-align: center; padding: 35px 20px; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 3px; color: #f4d6cb; font-weight: 700; }
        .header p { margin: 6px 0 0; font-size: 12px; letter-spacing: 1.5px; opacity: 0.85; color: #dcd0ca; }
        .badge { display: inline-block; background: rgba(200, 143, 123, 0.25); color: #f4d6cb; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 14px; border: 1px solid rgba(200, 143, 123, 0.4); text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 32px 28px; }
        .greeting { font-size: 19px; font-weight: 700; margin-bottom: 12px; color: #1e1613; }
        .intro { font-size: 14px; line-height: 1.65; color: #6b5c57; margin-bottom: 24px; }
        .ticket-box { background: #faf6f3; border: 1px solid #ebdcd5; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .ticket-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px dashed #e2d1c9; font-size: 14px; }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-label { color: #8c7873; font-weight: 500; }
        .ticket-value { color: #1e1613; font-weight: 600; text-align: right; }
        .total-row { font-size: 16px; color: #b76e79; font-weight: 700; padding-top: 12px; }
        .info-card { background: #ffffff; border: 1px solid #ebdcd5; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; color: #6b5c57; margin-bottom: 24px; }
        .social-bar { text-align: center; padding: 15px 0 5px; }
        .social-link { display: inline-block; margin: 0 8px; color: #b76e79; font-weight: 600; text-decoration: none; font-size: 13px; }
        .footer { background: #f7f3ef; padding: 22px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5; }
        .footer p { margin: 4px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${salon.name.toUpperCase()}</h1>
            <p>LUXURY NAIL LOUNGE & BESPOKE ART</p>
            <span class="badge">Booking Request Received</span>
        </div>
        <div class="body">
            <div class="greeting">Hi ${booking.clientName || 'Valued Guest'}, ✨</div>
            <p class="intro">Thank you for scheduling with <strong>${salon.name}</strong>. We have safely received your appointment request. Your booking is currently <strong>Pending Confirmation</strong> while our studio prepares your slot.</p>
            
            <div class="ticket-box">
                <div class="ticket-row">
                    <span class="ticket-label">Booking Reference:</span>
                    <span class="ticket-value" style="font-family: monospace; color: #b76e79; font-size: 15px;">${bookingId}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">Primary Service:</span>
                    <span class="ticket-value">${booking.service || 'Nail Service'}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">Selected Add-ons:</span>
                    <span class="ticket-value">${addons}</span>
                </div>
                <div class="ticket-row">
                    <span class="ticket-label">Date & Time:</span>
                    <span class="ticket-value">${booking.date || 'To be confirmed'} @ ${booking.time || '--'}</span>
                </div>
                <div class="ticket-row total-row">
                    <span class="ticket-label">Estimated Total:</span>
                    <span class="ticket-value">${price}</span>
                </div>
            </div>

            <div class="info-card">
                📍 <strong>Studio Location:</strong> ${salon.address}<br>
                📞 <strong>Studio Phone / WhatsApp:</strong> ${salon.phone}<br>
                💬 <strong>Need to change something?</strong> Reply to this email or reach us on WhatsApp.
            </div>

            <div class="social-bar">
                <a href="${salon.instagram}" class="social-link" target="_blank">Instagram</a> &bull;
                <a href="${salon.facebook}" class="social-link" target="_blank">Facebook</a> &bull;
                <a href="${salon.tiktok}" class="social-link" target="_blank">TikTok</a>
            </div>
        </div>
        <div class="footer">
            <p><strong>${salon.name}</strong> &bull; ${salon.address}</p>
            <p>Phone & WhatsApp: ${salon.phone}</p>
        </div>
    </div>
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
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f9; color: #1e1613; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.08); border: 1px solid #dcdfe5; }
        .header { background: #1e1613; color: #ffffff; text-align: center; padding: 25px 20px; border-bottom: 3px solid #b76e79; }
        .header h1 { margin: 0; font-size: 20px; color: #f4d6cb; letter-spacing: 1px; }
        .body { padding: 26px; }
        .alert-badge { background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 20px; text-align: center; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 14px; }
        .info-table td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
        .info-table td:first-child { font-weight: 600; color: #6b5c57; width: 36%; }
        .footer { background: #f7f3ef; padding: 16px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 NEW APPOINTMENT BOOKING</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #dcdcd5;">${salon.name} Studio Notification</p>
        </div>
        <div class="body">
            <div class="alert-badge">
                ✨ A new appointment booking request was submitted!
            </div>
            <table class="info-table">
                <tr><td>Booking Reference:</td><td style="font-family: monospace; font-weight: 700; color: #b76e79;">${bookingId}</td></tr>
                <tr><td>Client Name:</td><td><strong>${booking.clientName || 'Unknown'}</strong></td></tr>
                <tr><td>Client Phone:</td><td><a href="tel:${booking.clientPhone || ''}">${booking.clientPhone || '--'}</a></td></tr>
                <tr><td>Client Email:</td><td><a href="mailto:${booking.clientEmail || ''}">${booking.clientEmail || '--'}</a></td></tr>
                <tr><td>Service:</td><td><strong>${booking.service || '--'}</strong></td></tr>
                <tr><td>Add-ons:</td><td>${addons}</td></tr>
                <tr><td>Date & Time:</td><td><strong>${booking.date || '--'} @ ${booking.time || '--'}</strong></td></tr>
                <tr><td>Total Estimated:</td><td style="color: #b76e79; font-weight: 700;">${price}</td></tr>
                <tr><td>Notes / Requests:</td><td>${booking.notes || 'None'}</td></tr>
            </table>
        </div>
        <div class="footer">
            <p>${salon.name} Admin Panel Alert</p>
        </div>
    </div>
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
        <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #795548;">
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
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #ebdcd5; }
        .header { background: linear-gradient(135deg, #1e1613 0%, #2d2421 100%); color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; color: #f4d6cb; }
        .body { padding: 30px 26px; }
        .status-pill { background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40; padding: 14px; text-align: center; font-weight: 700; font-size: 15px; border-radius: 8px; margin-bottom: 22px; text-transform: uppercase; letter-spacing: 1px; }
        .ticket-box { background: #faf6f3; border: 1px solid #ebdcd5; border-radius: 12px; padding: 18px; margin-bottom: 22px; }
        .ticket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2d1c9; font-size: 14px; }
        .ticket-row:last-child { border-bottom: none; }
        .ticket-label { color: #8c7873; }
        .ticket-value { color: #1e1613; font-weight: 600; text-align: right; }
        .footer { background: #f7f3ef; padding: 20px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${salon.name.toUpperCase()}</h1>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85; color: #dcd0ca;">LUXURY NAIL LOUNGE</p>
        </div>
        <div class="body">
            <div class="status-pill">${statusLabel}</div>
            <p style="font-size: 15px; line-height: 1.6; color: #2d2421; margin-bottom: 18px;">
                Hi <strong>${booking.clientName || 'Guest'}</strong>,<br>
                ${isApproved ? 'Great news! Your booking has been approved and confirmed. We look forward to welcoming you to our salon.' : 'We are writing to inform you of a status update regarding your nail appointment request.'}
            </p>

            ${noteBlock}

            <div class="ticket-box">
                <div class="ticket-row"><span class="ticket-label">Booking Reference:</span><span class="ticket-value" style="font-family: monospace; color: #b76e79;">${bookingId}</span></div>
                <div class="ticket-row"><span class="ticket-label">Service:</span><span class="ticket-value">${booking.service || 'Nail Service'}</span></div>
                <div class="ticket-row"><span class="ticket-label">Date & Time:</span><span class="ticket-value">${booking.date || '--'} @ ${booking.time || '--'}</span></div>
                <div class="ticket-row"><span class="ticket-label">Total Amount:</span><span class="ticket-value">${price}</span></div>
                <div class="ticket-row"><span class="ticket-label">Current Status:</span><span class="ticket-value" style="color: ${statusColor}; text-transform: uppercase;">${newStatus}</span></div>
            </div>

            <p style="font-size: 13px; color: #6b5c57; line-height: 1.6;">
                📍 <strong>Location:</strong> ${salon.address}<br>
                📞 <strong>Phone / WhatsApp:</strong> ${salon.phone}
            </p>
        </div>
        <div class="footer">
            <p>&copy; 2026 ${salon.name} &bull; ${salon.address}</p>
            <p>Phone: ${salon.phone}</p>
        </div>
    </div>
</body>
</html>`;
}

async function sendResendMail(apiKey, from, to, subject, html) {
    const recipients = Array.isArray(to) ? to : [to];
    const validRecipients = recipients.filter(email => email && email.includes('@'));

    if (validRecipients.length === 0) {
        return { success: false, message: "No valid recipient email provided." };
    }

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
    if (!response.ok) {
        return { success: false, error: data };
    }
    return { success: true, id: data.id };
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
        const { type, booking = {}, newStatus, customNote, testRecipient, apiKeyOverride } = body || {};

        // 1. Resolve API key from server environment or passed override
        const apiKey = process.env.RESEND_API_KEY || apiKeyOverride;
        const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_SALON.fromEmail;
        const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_SALON.adminEmail;

        if (!apiKey || apiKey.length < 8) {
            return res.status(200).json({
                success: true,
                simulated: true,
                message: "No RESEND_API_KEY configured in Environment Variables. Email simulated successfully.",
                details: { type, recipient: booking.clientEmail || adminEmail }
            });
        }

        const salon = { ...DEFAULT_SALON, fromEmail, adminEmail };

        // 2. Handle Dispatch Types
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
            return res.status(200).json(result);
        }

        if (type === 'booking_created') {
            const results = {};
            // Send client confirmation
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
            // Send admin notification
            const adminHtml = buildAdminAlertHtml(booking, salon);
            results.admin = await sendResendMail(
                apiKey,
                fromEmail,
                adminEmail,
                `🔔 New Booking Alert: ${booking.clientName || 'Client'} - ${booking.service || 'Nails'} (#${booking.id || ''})`,
                adminHtml
            );

            return res.status(200).json({ success: true, results });
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

            // Send admin copy
            const adminHtml = buildStatusUpdateHtml(booking, newStatus, customNote, salon);
            results.admin = await sendResendMail(
                apiKey,
                fromEmail,
                adminEmail,
                `[Admin Log] Booking ${newStatus}: ${booking.clientName || ''} (#${booking.id || ''})`,
                adminHtml
            );

            return res.status(200).json({ success: true, results });
        }

        return res.status(400).json({ success: false, message: `Unknown email dispatch type: ${type}` });

    } catch (err) {
        console.error("Serverless email error:", err);
        return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
}
