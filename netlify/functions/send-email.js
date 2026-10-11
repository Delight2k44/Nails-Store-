// Netlify Functions: netlify/functions/send-email.js
// Powered by Brevo (Sendinblue) Transactional SMTP API

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

function buildClientBookingReceivedHtml(booking, salon) {
    const addons = Array.isArray(booking.addons) && booking.addons.length > 0 ? booking.addons.join(", ") : (booking.addons || "None");
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-PENDING";

    return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #fbf9f6; color: #2d2421; padding: 20px;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ebdcd5; padding: 25px;">
        <h1 style="color: #1e1613; margin-top: 0;">${salon.name}</h1>
        <p style="color: #b76e79; font-weight: bold;">Booking Request Received ⏳</p>
        <p>Hi ${booking.clientName || 'Valued Guest'}, we have received your booking request for <strong>${booking.service}</strong> on <strong>${booking.date} @ ${booking.time}</strong>.</p>
        <p>Reference: <strong>${bookingId}</strong> | Total: <strong>${price}</strong></p>
        <p>Our studio is reviewing your slot and you will receive a confirmation shortly.</p>
    </div>
</body>
</html>`;
}

function buildAdminAlertHtml(booking, salon) {
    const addons = Array.isArray(booking.addons) && booking.addons.length > 0 ? booking.addons.join(", ") : (booking.addons || "None");
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-NEW";

    return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f4f6f9; color: #1e1613; padding: 20px;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; padding: 25px;">
        <h2>🔔 New Booking Alert: ${booking.clientName}</h2>
        <p>Service: <strong>${booking.service}</strong> | Add-ons: ${addons}</p>
        <p>Date & Time: <strong>${booking.date} @ ${booking.time}</strong></p>
        <p>Total: <strong>${price}</strong> | Ref: <strong>${bookingId}</strong></p>
        <p>Phone: <a href="tel:${booking.clientPhone}">${booking.clientPhone}</a> | Email: ${booking.clientEmail}</p>
        <p><a href="https://nails-store.vercel.app/admin" style="background:#b76e79;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open Admin Dashboard</a></p>
    </div>
</body>
</html>`;
}

function buildStatusUpdateHtml(booking, newStatus, customNote, salon) {
    const isApproved = newStatus === 'confirmed';
    const price = formatPrice(booking.totalPrice);
    const bookingId = booking.id || "NB-APPOINTMENT";

    return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #fbf9f6; color: #2d2421; padding: 20px;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 25px;">
        <h2>${isApproved ? '🎉 Appointment Confirmed!' : 'ℹ️ Booking Update'}</h2>
        <p>Hi ${booking.clientName},</p>
        <p>${isApproved ? 'Your appointment has been confirmed! We look forward to seeing you.' : 'Your appointment has been updated or cancelled.'}</p>
        ${customNote ? `<p><strong>Note:</strong> ${customNote}</p>` : ''}
        <p>Service: <strong>${booking.service}</strong> | Date & Time: <strong>${booking.date} @ ${booking.time}</strong></p>
        <p>Total: <strong>${price}</strong> | Reference: <strong>${bookingId}</strong></p>
        <p>📍 ${salon.address} | 📞 ${salon.phone}</p>
    </div>
</body>
</html>`;
}

async function sendBrevoMail(apiKey, sender, recipients, subject, htmlContent) {
    const validRecipients = recipients.filter(r => r.email && r.email.includes('@'));
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            sender,
            to: validRecipients,
            replyTo: sender,
            subject,
            htmlContent
        })
    });
    return await response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const body = JSON.parse(event.body || '{}');
        const { type, booking = {}, newStatus, customNote, testRecipient, apiKeyOverride } = body;

        const apiKey = apiKeyOverride || DEFAULT_SALON.apiKey;
        const sender = { name: DEFAULT_SALON.senderName, email: DEFAULT_SALON.senderEmail };
        const adminRecipients = DEFAULT_SALON.adminEmails.map(email => ({ email, name: "Admin" }));

        if (type === 'test') {
            const target = testRecipient || DEFAULT_SALON.adminEmails[0];
            const res = await sendBrevoMail(apiKey, sender, [{ email: target, name: "Test" }], "✨ Brevo Test Email", buildClientBookingReceivedHtml({ id: "TEST", clientName: "Test", service: "Manicure" }, DEFAULT_SALON));
            return { statusCode: 200, body: JSON.stringify({ success: true, res }) };
        }

        if (type === 'booking_created') {
            const results = {};
            if (booking.clientEmail) {
                results.client = await sendBrevoMail(apiKey, sender, [{ email: booking.clientEmail, name: booking.clientName || 'Client' }], `✨ Booking Request Received: ${DEFAULT_SALON.name} (#${booking.id || ''})`, buildClientBookingReceivedHtml(booking, DEFAULT_SALON));
            }
            results.admin = await sendBrevoMail(apiKey, sender, adminRecipients, `🔔 New Booking Alert: ${booking.clientName} - ${booking.service}`, buildAdminAlertHtml(booking, DEFAULT_SALON));
            return { statusCode: 200, body: JSON.stringify({ success: true, results }) };
        }

        if (type === 'booking_status') {
            const results = {};
            const isApproved = newStatus === 'confirmed';
            const subject = isApproved ? "🎉 Your Appointment is Confirmed!" : "Update regarding your booking";
            if (booking.clientEmail) {
                results.client = await sendBrevoMail(apiKey, sender, [{ email: booking.clientEmail, name: booking.clientName || 'Client' }], `${subject} - ${DEFAULT_SALON.name} (#${booking.id || ''})`, buildStatusUpdateHtml(booking, newStatus, customNote, DEFAULT_SALON));
            }
            results.admin = await sendBrevoMail(apiKey, sender, adminRecipients, `[Admin Log] Booking ${newStatus}: ${booking.clientName}`, buildStatusUpdateHtml(booking, newStatus, customNote, DEFAULT_SALON));
            return { statusCode: 200, body: JSON.stringify({ success: true, results }) };
        }

        return { statusCode: 400, body: JSON.stringify({ success: false, message: "Invalid type" }) };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: e.message }) };
    }
};
