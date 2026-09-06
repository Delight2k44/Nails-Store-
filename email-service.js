/* ==========================================
   NDI'S NAIL BAR - HYBRID EMAIL SERVICE
   Powered by EmailJS (Gmail Service) & Serverless Backend
   Delivers live booking notifications to clients and admin with ZERO domain required!
   ========================================== */

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Active Email Configuration
const DEFAULT_CONFIG = {
    serviceId: "service_ujlnag2",
    templateId: "template_4yq9x3s",
    publicKey: "UAz_8FREkTh2gkZxc",
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
                serviceId: data.serviceId || DEFAULT_CONFIG.serviceId,
                templateId: data.templateId || DEFAULT_CONFIG.templateId,
                publicKey: data.publicKey || DEFAULT_CONFIG.publicKey,
                adminEmail: data.adminEmail || DEFAULT_CONFIG.adminEmail,
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

/**
 * Saves or updates email settings in Firestore
 */
export async function saveResendConfig(config) {
    const docRef = doc(db, "settings", "email");
    await setDoc(docRef, {
        serviceId: config.serviceId ? config.serviceId.trim() : DEFAULT_CONFIG.serviceId,
        templateId: config.templateId ? config.templateId.trim() : DEFAULT_CONFIG.templateId,
        publicKey: config.publicKey ? config.publicKey.trim() : DEFAULT_CONFIG.publicKey,
        adminEmail: config.adminEmail ? config.adminEmail.trim() : DEFAULT_CONFIG.adminEmail,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

/**
 * Dispatches an email via EmailJS (Connected to Gmail API)
 */
async function sendViaEmailJS(params) {
    const config = await getResendConfig();
    const serviceId = config.serviceId || DEFAULT_CONFIG.serviceId;
    const templateId = config.templateId || DEFAULT_CONFIG.templateId;
    const publicKey = config.publicKey || DEFAULT_CONFIG.publicKey;

    if (!params.to_email || !params.to_email.includes('@')) {
        return { success: false, message: "No valid recipient email provided." };
    }

    try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: {
                    to_email: params.to_email,
                    client_name: params.client_name || "Valued Client",
                    booking_id: params.booking_id || "NB-APPOINTMENT",
                    service: params.service || "Nail Service",
                    addons: params.addons || "None",
                    date: params.date || "--",
                    time: params.time || "--",
                    total_price: params.total_price || "R0.00",
                    status: params.status || "Pending Confirmation",
                    notes: params.notes || "None",
                    studio_note: params.studio_note || "",
                    salon_phone: DEFAULT_CONFIG.salonPhone,
                    salon_address: DEFAULT_CONFIG.salonAddress
                }
            })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errText = await response.text();
            console.warn("[EmailJS Response]:", errText);
            return { success: false, error: errText };
        }
    } catch (err) {
        console.error("[EmailJS Dispatch Error]:", err);
        return { success: false, error: err.message };
    }
}

/**
 * 1. Dispatches confirmation email to CLIENT and alert email to ADMIN when a booking is created
 */
export async function sendBookingCreatedEmails(booking) {
    const config = await getResendConfig();
    const addonsStr = Array.isArray(booking.addons) && booking.addons.length > 0 
        ? booking.addons.join(", ") 
        : (booking.addons || "None");
    
    const formattedPrice = booking.totalPrice 
        ? (typeof booking.totalPrice === 'number' ? `R${booking.totalPrice.toFixed(2)}` : `R${booking.totalPrice}`)
        : "R0.00";

    const baseParams = {
        client_name: booking.clientName || "Valued Guest",
        booking_id: booking.id || "NB-" + Math.floor(10000 + Math.random() * 90000),
        service: booking.service || "Nail Service",
        addons: addonsStr,
        date: booking.date || "--",
        time: booking.time || "--",
        total_price: formattedPrice,
        notes: booking.notes || "None",
        status: "Pending Confirmation ⏳"
    };

    // 1. Send confirmation to Client
    let clientResult = { success: false };
    if (booking.clientEmail) {
        clientResult = await sendViaEmailJS({
            ...baseParams,
            to_email: booking.clientEmail.trim()
        });
    }

    // 2. Send instant alert copy to Admin (ndivhuwovele5@gmail.com)
    const adminEmail = config.adminEmail || DEFAULT_CONFIG.adminEmail;
    const adminResult = await sendViaEmailJS({
        ...baseParams,
        to_email: adminEmail.trim(),
        client_name: `[NEW BOOKING ALERT] ${booking.clientName || 'Client'}`
    });

    return { clientResult, adminResult };
}

/**
 * 2. Dispatches status update email (Confirmed or Cancelled) to CLIENT and copy to ADMIN
 */
export async function sendBookingStatusEmails(booking, newStatus, customNote = "") {
    const config = await getResendConfig();
    const isApproved = newStatus === 'confirmed';
    const statusText = isApproved ? "CONFIRMED & APPROVED 🎉" : "CANCELLED / DECLINED ℹ️";

    const addonsStr = Array.isArray(booking.addons) && booking.addons.length > 0 
        ? booking.addons.join(", ") 
        : (booking.addons || "None");

    const formattedPrice = booking.totalPrice 
        ? (typeof booking.totalPrice === 'number' ? `R${booking.totalPrice.toFixed(2)}` : `R${booking.totalPrice}`)
        : "R0.00";

    const baseParams = {
        client_name: booking.clientName || "Valued Client",
        booking_id: booking.id || "NB-APPOINTMENT",
        service: booking.service || "Nail Service",
        addons: addonsStr,
        date: booking.date || "--",
        time: booking.time || "--",
        total_price: formattedPrice,
        status: statusText,
        studio_note: customNote || ""
    };

    // 1. Send to Client
    let clientResult = { success: false };
    if (booking.clientEmail) {
        clientResult = await sendViaEmailJS({
            ...baseParams,
            to_email: booking.clientEmail.trim()
        });
    }

    // 2. Send log to Admin
    const adminEmail = config.adminEmail || DEFAULT_CONFIG.adminEmail;
    const adminResult = await sendViaEmailJS({
        ...baseParams,
        to_email: adminEmail.trim(),
        client_name: `[STATUS UPDATE - ${newStatus.toUpperCase()}] ${booking.clientName || 'Client'}`
    });

    return { clientResult, adminResult };
}

/**
 * 3. Dispatches a verification test email
 */
export async function sendTestResendEmail(testRecipient) {
    return await sendViaEmailJS({
        to_email: testRecipient || DEFAULT_CONFIG.adminEmail,
        client_name: "Test Client",
        booking_id: "NB-TEST-999",
        service: "Luxury Gel Manicure",
        addons: "Matte Top Coat, Paraffin Treatment",
        date: "2026-09-25",
        time: "14:00",
        total_price: "R65.00",
        status: "Test Mode Active ✅",
        notes: "Verification test from Ndi's Nail Bar dashboard."
    });
}
