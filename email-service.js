/* ==========================================
   NDI'S NAIL BAR - RESEND EMAIL SERVICE
   Dispatches luxury HTML email notifications to clients and admin
   via secure serverless backend endpoint (/api/send-email)
   ========================================== */

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Default Configuration Constants
const DEFAULT_CONFIG = {
    apiKey: "", // Securely provided via Vercel/Netlify Environment Variables (RESEND_API_KEY)
    fromEmail: "Ndi's Nail Bar <onboarding@resend.dev>",
    adminEmail: "ndivhuwovele5@gmail.com",
    salonName: "Ndi's Nail Bar",
    salonPhone: "071 599 6931",
    salonAddress: "08 Feaure Bloemvailly, Bloemvaily, Willows, 9301"
};

/**
 * Retrieves the current email configuration from Firestore settings/email
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
                salonAddress: DEFAULT_CONFIG.salonAddress
            };
        }
    } catch (e) {
        console.warn("[Email Config] Could not fetch email settings from Firestore, using defaults:", e);
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Saves or updates the Resend settings in Firestore (called from admin panel)
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
 * Sends a request to the backend serverless function (/api/send-email)
 */
async function dispatchServerlessEmail(payload) {
    const config = await getResendConfig();

    // Include apiKeyOverride if specified in Firestore / Admin CMS
    if (config.apiKey && !payload.apiKeyOverride) {
        payload.apiKeyOverride = config.apiKey;
    }

    // Try standard /api/send-email endpoint (supported on Vercel and Netlify via netlify.toml)
    const endpoints = [
        "/api/send-email",
        "/.netlify/functions/send-email"
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else if (response.status !== 404) {
                // If endpoint exists but returned an error response
                const errData = await response.json().catch(() => ({}));
                console.warn(`[Email Service] Endpoint ${endpoint} returned:`, errData);
                return { success: false, error: errData };
            }
        } catch (err) {
            lastError = err;
            // Try next endpoint
        }
    }

    // Fallback for purely local dev testing without serverless runtime
    console.info("[Email Service] Serverless endpoints not available locally (or offline). Email simulated for:", payload.type);
    return {
        success: true,
        simulated: true,
        message: "Email queued (Local simulation mode). Deploy to Vercel/Netlify with RESEND_API_KEY environment variable for live delivery."
    };
}

/**
 * 1. Dispatches confirmation email to CLIENT and alert email to ADMIN when a booking is created
 */
export async function sendBookingCreatedEmails(booking) {
    try {
        const response = await dispatchServerlessEmail({
            type: "booking_created",
            booking: {
                id: booking.id || "NB-" + Math.floor(10000 + Math.random() * 90000),
                clientName: booking.clientName || "",
                clientEmail: booking.clientEmail || "",
                clientPhone: booking.clientPhone || "",
                service: booking.service || "",
                addons: booking.addons || [],
                date: booking.date || "",
                time: booking.time || "",
                totalPrice: booking.totalPrice || 0,
                notes: booking.notes || ""
            }
        });
        return {
            clientResult: { success: true, ...response },
            adminResult: { success: true, ...response }
        };
    } catch (err) {
        console.error("[Email Service] sendBookingCreatedEmails failed:", err);
        return {
            clientResult: { success: false, error: err.message },
            adminResult: { success: false, error: err.message }
        };
    }
}

/**
 * 2. Dispatches status update email (Confirmed or Cancelled) to CLIENT and copy to ADMIN
 */
export async function sendBookingStatusEmails(booking, newStatus, customNote = "") {
    try {
        const response = await dispatchServerlessEmail({
            type: "booking_status",
            booking: {
                id: booking.id || "",
                clientName: booking.clientName || "",
                clientEmail: booking.clientEmail || "",
                clientPhone: booking.clientPhone || "",
                service: booking.service || "",
                addons: booking.addons || [],
                date: booking.date || "",
                time: booking.time || "",
                totalPrice: booking.totalPrice || 0
            },
            newStatus: newStatus,
            customNote: customNote
        });
        return {
            clientResult: { success: true, ...response },
            adminResult: { success: true, ...response }
        };
    } catch (err) {
        console.error("[Email Service] sendBookingStatusEmails failed:", err);
        return {
            clientResult: { success: false, error: err.message },
            adminResult: { success: false, error: err.message }
        };
    }
}

/**
 * 3. Dispatches a verification test email
 */
export async function sendTestResendEmail(testRecipient) {
    return await dispatchServerlessEmail({
        type: "test",
        testRecipient: testRecipient
    });
}
