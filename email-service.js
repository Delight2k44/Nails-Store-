/* ==========================================
   NDI'S NAIL BAR - RESEND EMAIL SERVICE
   Dispatches luxury HTML email notifications to clients and admin
   ========================================== */

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Default Configuration Constants
const DEFAULT_CONFIG = {
    apiKey: "", // Can be set via Admin Dashboard CMS
    fromEmail: "Ndi's Nail Bar <onboarding@resend.dev>",
    adminEmail: "ndivhuwovele5@gmail.com",
    salonName: "Ndi's Nail Bar",
    salonPhone: "071 599 6931",
    salonAddress: "08 Feaure Bloemvailly, Bloemvaily, Willows, 9301",
    websiteUrl: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)
};

/**
 * Retrieves the current Resend API configuration from Firestore settings/email
 * or falls back to defaults.
 */
export async function getResendConfig() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "email"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                apiKey: data.apiKey || DEFAULT_CONFIG.apiKey,
                fromEmail: data.fromEmail || DEFAULT_CONFIG.fromEmail,
                adminEmail: data.adminEmail || DEFAULT_CONFIG.adminEmail,
                salonName: DEFAULT_CONFIG.salonName,
                salonPhone: DEFAULT_CONFIG.salonPhone,
                salonAddress: DEFAULT_CONFIG.salonAddress,
                websiteUrl: DEFAULT_CONFIG.websiteUrl
            };
        }
    } catch (e) {
        console.warn("Could not fetch email settings from Firestore, using defaults:", e);
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Saves or updates the Resend API settings in Firestore (called from admin panel)
 */
export async function saveResendConfig(config) {
    const docRef = doc(db, "settings", "email");
    await setDoc(docRef, {
        apiKey: config.apiKey ? config.apiKey.trim() : "",
        fromEmail: config.fromEmail ? config.fromEmail.trim() : DEFAULT_CONFIG.fromEmail,
        adminEmail: config.adminEmail ? config.adminEmail.trim() : DEFAULT_CONFIG.adminEmail,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

/**
 * Dispatches an email via the Resend API (https://api.resend.com/emails)
 */
async function sendRawResendEmail({ apiKey, from, to, subject, html }) {
    if (!apiKey || apiKey === "re_test_123456789" || apiKey.length < 8) {
        console.info("[Resend Email Service] Note: Resend API key not yet entered in Admin Settings. Email simulated successfully for:", { to, subject });
        return { success: true, simulated: true, message: "Email logged. Configure your Resend API Key in Admin > Settings > Email Notifications." };
    }

    const recipients = Array.isArray(to) ? to : [to];
    const validRecipients = recipients.filter(email => email && email.includes('@'));

    if (validRecipients.length === 0) {
        return { success: false, message: "No valid recipient email address." };
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": Bearer 
            },
            body: JSON.stringify({
                from: from || DEFAULT_CONFIG.fromEmail,
                to: validRecipients,
                subject: subject,
                html: html
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("[Resend API Error]", data);
            return { success: false, error: data };
        }

        return { success: true, id: data.id };
    } catch (err) {
        console.error("[Resend Network Exception]", err);
        return { success: false, error: err.message };
    }
}

/* ==========================================
   EMAIL TEMPLATES & DISPATCHERS
   ========================================== */

/**
 * 1. Dispatches confirmation email to CLIENT and alert email to ADMIN when a booking is created
 */
export async function sendBookingCreatedEmails(booking) {
    const config = await getResendConfig();
    const trackerUrl = ${config.websiteUrl}index.html#booking-section;
    const adminPanelUrl = ${config.websiteUrl}admin.html;

    const addonsText = booking.addons && booking.addons.length > 0 
        ? (Array.isArray(booking.addons) ? booking.addons.join(", ") : booking.addons)
        : "None selected";

    const formattedPrice = booking.totalPrice ? R : "R0.00";

    // --- Template for Client ---
    const clientHtml = 
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #ebdcd5; }
            .header { background: linear-gradient(135deg, #1e1613, #2d2421); color: #ffffff; text-align: center; padding: 30px 20px; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; color: #f4d6cb; }
            .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.8; }
            .badge { display: inline-block; background: rgba(200, 143, 123, 0.2); color: #c88f7b; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 10px; border: 1px solid rgba(200, 143, 123, 0.4); }
            .body { padding: 30px 25px; }
            .greeting { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #1e1613; }
            .intro { font-size: 14px; line-height: 1.6; color: #6b5c57; margin-bottom: 25px; }
            .ticket-box { background: #fbf9f6; border: 1px solid #ebdcd5; border-radius: 10px; padding: 20px; margin-bottom: 25px; }
            .ticket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ebdcd5; font-size: 14px; }
            .ticket-row:last-child { border-bottom: none; }
            .ticket-label { color: #8c7873; font-weight: 500; }
            .ticket-value { color: #1e1613; font-weight: 600; text-align: right; }
            .total-row { font-size: 16px; color: #b76e79; font-weight: 700; }
            .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #c88f7b, #b76e79); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 25px auto 10px; }
            .footer { background: #f7f3ef; padding: 20px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5; }
            .footer p { margin: 4px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>NDI'S NAIL BAR</h1>
                <p>LUXURY NAIL LOUNGE & BESPOKE ART</p>
                <span class="badge">BOOKING REQUEST RECEIVED</span>
            </div>
            <div class="body">
                <div class="greeting">Hi , ✨</div>
                <p class="intro">Thank you for booking with Ndi's Nail Bar! We have safely received your appointment request. Your booking is currently <strong>Pending Confirmation</strong> while our studio prepares your slot.</p>
                
                <div class="ticket-box">
                    <div class="ticket-row">
                        <span class="ticket-label">Booking Reference:</span>
                        <span class="ticket-value" style="font-family: monospace; color: #b76e79;"></span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">Primary Service:</span>
                        <span class="ticket-value"></span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">Add-ons:</span>
                        <span class="ticket-value"></span>
                    </div>
                    <div class="ticket-row">
                        <span class="ticket-label">Date & Time:</span>
                        <span class="ticket-value"> @ </span>
                    </div>
                    <div class="ticket-row total-row">
                        <span class="ticket-label">Estimated Total:</span>
                        <span class="ticket-value"></span>
                    </div>
                </div>

                <p style="font-size: 13px; color: #6b5c57; line-height: 1.5;">
                    📍 <strong>Studio Location:</strong> <br>
                    📞 <strong>Studio Contact:</strong> 
                </p>

                <a href="" class="cta-btn">View & Track Appointment Status</a>
            </div>
            <div class="footer">
                <p><strong>Ndi's Nail Bar</strong> &bull; </p>
                <p>WhatsApp & Phone: </p>
            </div>
        </div>
    </body>
    </html>
    ;

    // --- Template for Admin Alert ---
    const adminHtml = 
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; color: #1e1613; margin: 0; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #dcdfe5; }
            .header { background: #1e1613; color: #ffffff; text-align: center; padding: 25px 20px; border-bottom: 3px solid #b76e79; }
            .header h1 { margin: 0; font-size: 20px; color: #f4d6cb; }
            .body { padding: 25px; }
            .alert-banner { background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 13px; margin-bottom: 20px; text-align: center; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            .info-table td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
            .info-table td:first-child { font-weight: 600; color: #6b5c57; width: 35%; }
            .cta-btn { display: block; text-align: center; background: #1e1613; color: #f4d6cb !important; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 NEW APPOINTMENT BOOKING</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #dcdcd5;">Ndi's Nail Bar Admin Notification</p>
            </div>
            <div class="body">
                <div class="alert-banner">
                    ✨ A new booking request has been submitted on the website!
                </div>

                <table class="info-table">
                    <tr><td>Booking Reference:</td><td style="font-family: monospace; font-weight: 700; color: #b76e79;"></td></tr>
                    <tr><td>Client Name:</td><td><strong></strong></td></tr>
                    <tr><td>Client Phone:</td><td><a href="tel:"></a></td></tr>
                    <tr><td>Client Email:</td><td><a href="mailto:"></a></td></tr>
                    <tr><td>Service:</td><td></td></tr>
                    <tr><td>Add-ons:</td><td></td></tr>
                    <tr><td>Date & Time:</td><td><strong> @ </strong></td></tr>
                    <tr><td>Total Amount:</td><td><strong></strong></td></tr>
                    <tr><td>Special Notes:</td><td></td></tr>
                </table>

                <a href="" class="cta-btn">Open Admin Dashboard to Review</a>
            </div>
        </div>
    </body>
    </html>
    ;

    // 1. Send to Client
    let clientResult = { success: false };
    if (booking.clientEmail) {
        clientResult = await sendRawResendEmail({
            apiKey: config.apiKey,
            from: config.fromEmail,
            to: booking.clientEmail,
            subject: ✨ Booking Request Received: Ndi's Nail Bar (#),
            html: clientHtml
        });
    }

    // 2. Send to Admin
    const adminResult = await sendRawResendEmail({
        apiKey: config.apiKey,
        from: config.fromEmail,
        to: config.adminEmail,
        subject: 🔔 New Booking Alert:  -  (#),
        html: adminHtml
    });

    return { clientResult, adminResult };
}

/**
 * 2. Dispatches status update email (Confirmed or Cancelled) to CLIENT and copy to ADMIN
 */
export async function sendBookingStatusEmails(booking, newStatus, customNote = '') {
    const config = await getResendConfig();
    const isApproved = newStatus === 'confirmed';
    const trackerUrl = ${config.websiteUrl}index.html#booking-section;

    const statusTitle = isApproved ? "APPOINTMENT CONFIRMED! 🎉" : "BOOKING UPDATE ℹ️";
    const subjectPrefix = isApproved ? "🎉 Appointment Confirmed!" : "Update regarding your booking";
    const statusColor = isApproved ? "#27ae60" : "#c0392b";
    const statusBg = isApproved ? "#e8f5e9" : "#fbe9e7";

    const noteSection = customNote ? 
        <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #795548;">
            <strong>Studio Note:</strong><br>
            
        </div>
     : '';

    const formattedPrice = booking.totalPrice ? R : "R0.00";

    const clientHtml = 
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fbf9f6; color: #2d2421; margin: 0; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #ebdcd5; }
            .header { background: linear-gradient(135deg, #1e1613, #2d2421); color: #ffffff; text-align: center; padding: 30px 20px; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; color: #f4d6cb; }
            .status-banner { background: ; color: ; border: 1px solid 40; padding: 14px; text-align: center; font-weight: 700; font-size: 15px; border-radius: 8px; margin-bottom: 20px; }
            .body { padding: 30px 25px; }
            .ticket-box { background: #fbf9f6; border: 1px solid #ebdcd5; border-radius: 10px; padding: 20px; margin-bottom: 25px; }
            .ticket-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ebdcd5; font-size: 14px; }
            .ticket-row:last-child { border-bottom: none; }
            .ticket-label { color: #8c7873; font-weight: 500; }
            .ticket-value { color: #1e1613; font-weight: 600; text-align: right; }
            .cta-btn { display: block; text-align: center; background: linear-gradient(135deg, #c88f7b, #b76e79); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 25px auto 10px; }
            .footer { background: #f7f3ef; padding: 20px; text-align: center; font-size: 12px; color: #8c7873; border-top: 1px solid #ebdcd5; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>NDI'S NAIL BAR</h1>
                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.8;">LUXURY NAIL LOUNGE</p>
            </div>
            <div class="body">
                <div class="status-banner"></div>

                <p style="font-size: 15px; line-height: 1.6; color: #2d2421;">
                    Hi <strong></strong>,<br>
                    
                </p>

                

                <div class="ticket-box">
                    <div class="ticket-row"><span class="ticket-label">Booking Reference:</span><span class="ticket-value" style="font-family: monospace; color: #b76e79;"></span></div>
                    <div class="ticket-row"><span class="ticket-label">Service:</span><span class="ticket-value"></span></div>
                    <div class="ticket-row"><span class="ticket-label">Date & Time:</span><span class="ticket-value"> @ </span></div>
                    <div class="ticket-row"><span class="ticket-label">Total:</span><span class="ticket-value"></span></div>
                    <div class="ticket-row"><span class="ticket-label">Status:</span><span class="ticket-value" style="color: ; text-transform: uppercase;"></span></div>
                </div>

                <p style="font-size: 13px; color: #6b5c57; line-height: 1.5;">
                    📍 <strong>Location:</strong> <br>
                    📞 <strong>Phone / WhatsApp:</strong> 
                </p>

                <a href="" class="cta-btn">View Live Booking Slip & QR Code</a>
            </div>
            <div class="footer">
                <p>&copy; 2026 Ndi's Nail Bar &bull; </p>
                <p>Phone: </p>
            </div>
        </div>
    </body>
    </html>
    ;

    // 1. Send to Client
    let clientResult = { success: false };
    if (booking.clientEmail) {
        clientResult = await sendRawResendEmail({
            apiKey: config.apiKey,
            from: config.fromEmail,
            to: booking.clientEmail,
            subject: ${subjectPrefix} - Ndi's Nail Bar (#),
            html: clientHtml
        });
    }

    // 2. Send Copy to Admin
    const adminResult = await sendRawResendEmail({
        apiKey: config.apiKey,
        from: config.fromEmail,
        to: config.adminEmail,
        subject: [Admin Log] Booking :  (#),
        html: clientHtml
    });

    return { clientResult, adminResult };
}
