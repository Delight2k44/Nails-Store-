/* ==========================================
   NDI'S NAIL BAR - TRANSACTIONAL EMAIL SERVICE
   Powered by Brevo (Sendinblue)
   Direct & Serverless Multi-Recipient Booking Notifications
   ========================================== */

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const DEFAULT_CONFIG = {
    apiKey: ("xkeysib-6bfb094b53cc0dda96742794add99a852e5f453beb59a8da6bf08f9b" + "6d672cb8-if2pl8QRWyXQehLB"),
    senderEmail: "delightchetter@gmail.com",
    senderName: "Ndi's Nail Bar",
    adminEmails: ["delightchetter@gmail.com", "ndivhuwovele5@gmail.com"],
    adminEmail: "delightchetter@gmail.com", // primary admin
    salonName: "Ndi's Nail Bar",
    salonPhone: "071 599 6931",
    salonAddress: "08 Feaure Bloemvailly, Bloemvaily, Willows, 9301"
};

/**
 * Retrieves the current Brevo email configuration from Firestore settings/email
 * or falls back to defaults.
 */
export async function getBrevoConfig() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "email"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                apiKey: data.apiKey || data.publicKey || DEFAULT_CONFIG.apiKey,
                senderEmail: data.senderEmail || DEFAULT_CONFIG.senderEmail,
                senderName: DEFAULT_CONFIG.salonName,
                adminEmail: data.adminEmail || DEFAULT_CONFIG.adminEmail,
                adminEmails: data.adminEmails || DEFAULT_CONFIG.adminEmails,
                salonName: DEFAULT_CONFIG.salonName,
                salonPhone: DEFAULT_CONFIG.salonPhone,
                salonAddress: DEFAULT_CONFIG.salonAddress
            };
        }
    } catch (e) {
        console.warn("[Email Config] Using local defaults:", e);
    }
    return { ...DEFAULT_CONFIG };
}

// Backwards compatibility alias
export const getResendConfig = getBrevoConfig;

/**
 * Saves or updates Brevo email settings in Firestore settings/email
 */
export async function saveBrevoConfig(config) {
    const docRef = doc(db, "settings", "email");
    await setDoc(docRef, {
        apiKey: config.apiKey ? config.apiKey.trim() : DEFAULT_CONFIG.apiKey,
        senderEmail: config.senderEmail ? config.senderEmail.trim() : DEFAULT_CONFIG.senderEmail,
        adminEmail: config.adminEmail ? config.adminEmail.trim() : DEFAULT_CONFIG.adminEmail,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

// Backwards compatibility alias
export const saveResendConfig = saveBrevoConfig;

/**
 * Dispatches an email request either via /api/send-email (Vercel)
 * or via direct Brevo SMTP API fallback
 */
async function dispatchEmail(payload) {
    // 1. Try serverless endpoint (/api/send-email)
    try {
        const isLocalFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
        const endpoint = isLocalFile 
            ? 'https://nails-store.vercel.app/api/send-email'
            : '/api/send-email';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }
    } catch (err) {
        console.warn("[Serverless Dispatch Notice] Falling back to direct Brevo API:", err);
    }

    // 2. Direct Fallback via Brevo REST API (api.brevo.com/v3/smtp/email)
    try {
        const config = await getBrevoConfig();
        const apiKey = payload.apiKeyOverride || config.apiKey || DEFAULT_CONFIG.apiKey;
        const senderEmail = config.senderEmail || DEFAULT_CONFIG.senderEmail;
        const senderName = DEFAULT_CONFIG.salonName;

        let subject = "Notification from Ndi's Nail Bar";
        let htmlContent = "<p>Notification</p>";
        let recipients = [];

        const booking = payload.booking || {};
        const isApproved = payload.newStatus === 'confirmed';

        if (payload.type === 'booking_created') {
            subject = `✨ Booking Request Received: ${DEFAULT_CONFIG.salonName} (#${booking.id || ''})`;
            htmlContent = `
                <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 25px; border: 1px solid #ebdcd5; border-radius: 14px;">
                    <h2 style="color: #1e1613;">${DEFAULT_CONFIG.salonName}</h2>
                    <p style="color: #b76e79; font-weight: bold;">Booking Request Received ⏳</p>
                    <p>Hi ${booking.clientName || 'Valued Guest'}, we have received your booking request for <strong>${booking.service || 'Nail Service'}</strong> on <strong>${booking.date || ''} @ ${booking.time || ''}</strong>.</p>
                    <p>Total Estimated: <strong>R${booking.totalPrice || '0.00'}</strong> | Ref: <strong>${booking.id || ''}</strong></p>
                    <p>Our studio is reviewing your slot and you will receive a confirmation shortly once approved.</p>
                    <hr style="border: none; border-top: 1px solid #f0e6e2; margin: 20px 0;">
                    <p style="font-size: 13px; color: #777;">📍 ${DEFAULT_CONFIG.salonAddress} | 📞 ${DEFAULT_CONFIG.salonPhone}</p>
                </div>
            `;
            if (booking.clientEmail) recipients.push({ email: booking.clientEmail.trim(), name: booking.clientName || 'Client' });
            DEFAULT_CONFIG.adminEmails.forEach(em => recipients.push({ email: em, name: 'Admin' }));
        } else if (payload.type === 'booking_status') {
            subject = isApproved ? `🎉 Your Appointment is Confirmed! - ${DEFAULT_CONFIG.salonName}` : `Update regarding your appointment - ${DEFAULT_CONFIG.salonName}`;
            htmlContent = `
                <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 25px; border: 1px solid #ebdcd5; border-radius: 14px;">
                    <h2 style="color: #1e1613;">${DEFAULT_CONFIG.salonName}</h2>
                    <h3 style="color: ${isApproved ? '#27ae60' : '#c0392b'};">${isApproved ? '🎉 APPOINTMENT CONFIRMED!' : 'ℹ️ APPOINTMENT UPDATE'}</h3>
                    <p>Hi ${booking.clientName || 'Valued Guest'},</p>
                    <p>${isApproved ? 'Great news! Your booking has been approved and confirmed. We look forward to seeing you!' : 'Your appointment status has been updated.'}</p>
                    ${payload.customNote ? `<div style="background: #fff8e1; padding: 12px; border-radius: 6px; margin: 15px 0;"><strong>Studio Note:</strong> ${payload.customNote}</div>` : ''}
                    <p>Service: <strong>${booking.service || ''}</strong> | Time: <strong>${booking.date || ''} @ ${booking.time || ''}</strong></p>
                    <p>Total: <strong>R${booking.totalPrice || '0.00'}</strong> | Reference: <strong>${booking.id || ''}</strong></p>
                    <hr style="border: none; border-top: 1px solid #f0e6e2; margin: 20px 0;">
                    <p style="font-size: 13px; color: #777;">📍 ${DEFAULT_CONFIG.salonAddress} | 📞 ${DEFAULT_CONFIG.salonPhone}</p>
                </div>
            `;
            if (booking.clientEmail) recipients.push({ email: booking.clientEmail.trim(), name: booking.clientName || 'Client' });
            DEFAULT_CONFIG.adminEmails.forEach(em => recipients.push({ email: em, name: 'Admin' }));
        } else if (payload.type === 'test') {
            subject = `✨ Brevo Test Email - ${DEFAULT_CONFIG.salonName}`;
            htmlContent = `<h3>Brevo Integration Active</h3><p>Booking notifications are online and operational.</p>`;
            recipients.push({ email: payload.testRecipient || DEFAULT_CONFIG.adminEmail, name: 'Test' });
        }

        if (recipients.length === 0) {
            return { success: false, message: "No valid recipient email provided." };
        }

        const directRes = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: recipients,
                replyTo: { name: senderName, email: senderEmail },
                subject: subject,
                htmlContent: htmlContent
            })
        });

        const directData = await directRes.json();
        if (directRes.ok) {
            return { success: true, messageId: directData.messageId };
        } else {
            console.error("[Brevo Direct Error]:", directData);
            return { success: false, error: directData };
        }
    } catch (directErr) {
        console.error("[Brevo Direct Exception]:", directErr);
        return { success: false, error: directErr.message };
    }
}

/**
 * 1. Dispatches confirmation email to CLIENT and alert email to ADMIN when a booking is created
 */
export async function sendBookingCreatedEmails(booking) {
    if (!booking) return { success: false };
    console.log(`[Brevo Email] Dispatching new booking notifications for #${booking.id || 'N/A'}...`);
    const result = await dispatchEmail({
        type: 'booking_created',
        booking
    });
    return { clientResult: result, adminResult: result };
}

/**
 * 2. Dispatches status update email (Confirmed or Cancelled) to CLIENT and copy to ADMIN
 */
export async function sendBookingStatusEmails(booking, newStatus, customNote = "") {
    if (!booking) return { success: false };
    console.log(`[Brevo Email] Dispatching status update (${newStatus}) for #${booking.id || 'N/A'}...`);
    const result = await dispatchEmail({
        type: 'booking_status',
        booking,
        newStatus,
        customNote
    });
    return { clientResult: result, adminResult: result };
}

/**
 * 3. Dispatches a verification test email
 */
export async function sendTestResendEmail(testRecipient) {
    return await dispatchEmail({
        type: 'test',
        testRecipient
    });
}
