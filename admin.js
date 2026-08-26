/* ==========================================
   NDI'S NAIL BAR - ADMIN DASHBOARD CONTROLLER
   (with CMS: Pricing Editor & Layout Image Manager)
   ========================================== */

import { auth, db, storage } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    doc, 
    addDoc, 
    setDoc,
    getDocs, 
    onSnapshot, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/* ==========================================
   TOAST NOTIFICATION SYSTEM
   ========================================== */
function showToast(message, type = 'info') {
    // type: 'success', 'error', 'info', 'warning'
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Global Listeners Unsubscribe Functions
let unsubBookings = null;
let unsubPendingReviews = null;
let unsubAllReviews = null;
let unsubNails = null;
let unsubServices = null;
let unsubAddons = null;
let unsubLayout = null;

// Global Lists for stats calculation
let allBookingsList = [];
let approvedReviewsList = [];
let nailsList = [];
let servicesList = [];
let addonsList = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardWrapper = document.getElementById('dashboard-wrapper');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');
const loginErrorText = document.getElementById('login-error-text');
const btnLogout = document.getElementById('btn-logout');
const emailInput = document.getElementById('admin-email');
const passwordInput = document.getElementById('admin-password');
const btnTogglePassword = document.getElementById('btn-toggle-password');
const togglePasswordIcon = document.getElementById('toggle-password-icon');
const btnForgotPassword = document.getElementById('btn-forgot-password');
const rememberMeCheckbox = document.getElementById('remember-me');

// Initial Launch Auth Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginContainer.style.display = 'none';
        dashboardWrapper.classList.add('active');
        initDashboardData();
        showToast(`Welcome back, ${user.email.split('@')[0]}!`, 'success');
    } else {
        cleanupWatchers();
        dashboardWrapper.classList.remove('active');
        loginContainer.style.display = 'flex';
    }
});

// Auto-hide error alert when typing in email or password
if (emailInput) emailInput.addEventListener('input', () => { if (loginError) loginError.style.display = 'none'; });
if (passwordInput) passwordInput.addEventListener('input', () => { if (loginError) loginError.style.display = 'none'; });

// Show / Hide Password Toggle
if (btnTogglePassword && passwordInput) {
    btnTogglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        if (togglePasswordIcon) {
            togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
    });
}

// Forgot Password Handler
if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', () => {
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
            showToast('Please enter your admin email above first, then click "Forgot password?".', 'warning');
            if (emailInput) emailInput.focus();
            return;
        }

        const origText = btnForgotPassword.innerText;
        btnForgotPassword.innerText = 'Sending link...';

        sendPasswordResetEmail(auth, email)
            .then(() => {
                showToast(`Password reset link sent to ${email}! Check your inbox.`, 'success');
            })
            .catch((err) => {
                console.error("Password reset error:", err);
                if (err.code === 'auth/user-not-found') {
                    showToast('No user account found with that email.', 'error');
                } else {
                    showToast(`Failed to send reset link: ${err.message || 'Please try again.'}`, 'error');
                }
            })
            .finally(() => {
                btnForgotPassword.innerText = origText;
            });
    });
}

// Admin Login Handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginError) loginError.style.display = 'none';

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const btnSubmit = document.getElementById('btn-admin-signin') || loginForm.querySelector('button[type="submit"]');
        const origBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

        try {
            // Configure persistence based on "Remember me" checkbox
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                await setPersistence(auth, browserLocalPersistence);
            } else {
                await setPersistence(auth, browserSessionPersistence);
            }

            await signInWithEmailAndPassword(auth, email, password);
            loginForm.reset();
            if (passwordInput) passwordInput.type = 'password';
            if (togglePasswordIcon) togglePasswordIcon.className = 'fa-solid fa-eye';
        } catch (error) {
            console.error("Auth login error:", error);
            let errorMsg = 'Invalid email or password. Please verify your credentials.';
            
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                errorMsg = 'Incorrect email or password. Please check your spelling and try again.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Please enter a valid email address format.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = 'Too many failed login attempts. Please wait a minute and try again.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMsg = 'Network connection failed. Please check your internet connection.';
            } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
                errorMsg = 'Email/Password sign-in is disabled in your Firebase Console. Enable it in Authentication > Sign-in method.';
            } else if (error.code === 'auth/user-disabled') {
                errorMsg = 'This admin account has been disabled in Firebase Console.';
            }
            
            if (loginErrorText) {
                loginErrorText.innerText = errorMsg;
            } else if (loginError) {
                loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${errorMsg}</span>`;
            }
            
            if (loginError) loginError.style.display = 'flex';
            showToast(errorMsg, 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnText;
        }
    });
}

// Logout Handler
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth)
            .then(() => showToast('Signed out successfully.', 'info'))
            .catch(err => {
                console.error("SignOut error:", err);
                showToast('Sign out failed. Please try again.', 'error');
            });
    });
}

/* ==========================================
   TAB NAVIGATION SYSTEM
   ========================================== */
const menuItems = document.querySelectorAll('.menu-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');
const tabHeading = document.getElementById('tab-heading');
const tabDescription = document.getElementById('tab-description');

const tabMeta = {
    overview: {
        title: "Dashboard Overview",
        desc: "Monitor your bookings, moderate customer ratings, and update your gallery."
    },
    bookings: {
        title: "Bookings & Appointments",
        desc: "Manage dates, verify user requests, and update reservation status."
    },
    reviews: {
        title: "Moderation Queue",
        desc: "Review pending testimonials and choose whether to publish or discard them."
    },
    uploader: {
        title: "Portfolio Uploader",
        desc: "Publish your latest nail designs to the home page gallery in real-time."
    },
    settings: {
        title: "Website Settings",
        desc: "Edit service pricing, manage add-ons, and update website images."
    }
};

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const tabName = item.getAttribute('data-tab');
        
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');

        tabContents.forEach(tc => tc.classList.remove('active'));
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) targetTab.classList.add('active');

        if (tabMeta[tabName]) {
            tabHeading.innerText = tabMeta[tabName].title;
            tabDescription.innerText = tabMeta[tabName].desc;
        }
    });
});

/* ==========================================
   INITIALIZE REAL-TIME DB WATCHERS
   ========================================== */
function initDashboardData() {
    // 1. Real-time Bookings Watcher
    try {
        const bookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
            allBookingsList = [];
            snapshot.forEach(docSnap => {
                // BUG FIX: Store Firestore document ID as 'docId' so it doesn't
                // get overwritten by the custom 'id' field ("NB-xxxxx") in the data
                allBookingsList.push({ docId: docSnap.id, ...docSnap.data() });
            });
            
            updateStats();
            renderBookingsTable();
        }, (err) => {
            console.error("Bookings stream error:", err);
            showToast('Failed to load bookings. Check your connection.', 'error');
        });
    } catch (err) {
        console.error("Bookings init error:", err);
        showToast('Could not initialize bookings watcher.', 'error');
    }

    // 2. Real-time Pending Reviews Watcher
    try {
        const pendingReviewsQuery = query(collection(db, "reviews"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
        unsubPendingReviews = onSnapshot(pendingReviewsQuery, (snapshot) => {
            const pendingReviews = [];
            snapshot.forEach(docSnap => {
                pendingReviews.push({ docId: docSnap.id, ...docSnap.data() });
            });
            
            document.getElementById('stat-pending-bookings').innerText = allBookingsList.filter(b => b.status === 'pending').length;
            renderPendingReviews(pendingReviews);
        }, (err) => {
            console.error("Pending reviews stream error:", err);
            showToast('Failed to load pending reviews.', 'error');
        });
    } catch (err) {
        console.error("Pending reviews init error:", err);
    }

    // 3. Real-time Approved Reviews Watcher (for average stats)
    try {
        const approvedReviewsQuery = query(collection(db, "reviews"), where("status", "==", "approved"));
        unsubAllReviews = onSnapshot(approvedReviewsQuery, (snapshot) => {
            approvedReviewsList = [];
            snapshot.forEach(docSnap => {
                approvedReviewsList.push(docSnap.data());
            });
            updateStats();
        }, (err) => {
            console.error("Approved reviews stream error:", err);
        });
    } catch (err) {
        console.error("Approved reviews init error:", err);
    }

    // 4. Real-time Nails Portfolio Watcher
    try {
        const nailsQuery = collection(db, "nails");
        unsubNails = onSnapshot(nailsQuery, (snapshot) => {
            nailsList = [];
            snapshot.forEach(docSnap => {
                nailsList.push(docSnap.data());
            });
            updateStats();
        }, (err) => {
            console.error("Nails list stream error:", err);
        });
    } catch (err) {
        console.error("Nails init error:", err);
    }

    // 5. Real-time Services Watcher (CMS)
    try {
        const servicesQuery = query(collection(db, "services"), orderBy("order", "asc"));
        unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            servicesList = [];
            snapshot.forEach(docSnap => {
                servicesList.push({ docId: docSnap.id, ...docSnap.data() });
            });
            renderServicesPricingEditor();
        }, (err) => {
            console.error("Services stream error:", err);
        });
    } catch (err) {
        console.error("Services init error:", err);
    }

    // 6. Real-time Addons Watcher (CMS)
    try {
        const addonsQuery = collection(db, "addons");
        unsubAddons = onSnapshot(addonsQuery, (snapshot) => {
            addonsList = [];
            snapshot.forEach(docSnap => {
                addonsList.push({ docId: docSnap.id, ...docSnap.data() });
            });
            renderAddonsPricingEditor();
        }, (err) => {
            console.error("Addons stream error:", err);
        });
    } catch (err) {
        console.error("Addons init error:", err);
    }

    // 7. Layout Settings Watcher (CMS)
    try {
        unsubLayout = onSnapshot(doc(db, "settings", "layout"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const heroPreview = document.getElementById('hero-preview-img');
                const aboutPreview = document.getElementById('about-preview-img');
                if (heroPreview && data.heroImageUrl) {
                    heroPreview.src = data.heroImageUrl;
                    heroPreview.style.display = 'block';
                }
                if (aboutPreview && data.aboutImageUrl) {
                    aboutPreview.src = data.aboutImageUrl;
                    aboutPreview.style.display = 'block';
                }
            }
        }, (err) => {
            console.error("Layout settings stream error:", err);
        });
    } catch (err) {
        console.error("Layout init error:", err);
    }

    // Initialize Uploader & CMS Behaviors
    initUploaderBehaviors();
    initCMSBehaviors();
}

function cleanupWatchers() {
    if (unsubBookings) unsubBookings();
    if (unsubPendingReviews) unsubPendingReviews();
    if (unsubAllReviews) unsubAllReviews();
    if (unsubNails) unsubNails();
    if (unsubServices) unsubServices();
    if (unsubAddons) unsubAddons();
    if (unsubLayout) unsubLayout();
}

/* ==========================================
   STATISTICS UPDATE ENGINE
   ========================================== */
function updateStats() {
    document.getElementById('stat-total-bookings').innerText = allBookingsList.length;
    document.getElementById('stat-pending-bookings').innerText = allBookingsList.filter(b => b.status === 'pending').length;
    document.getElementById('stat-gallery-count').innerText = nailsList.length;

    if (approvedReviewsList.length > 0) {
        const totalStars = approvedReviewsList.reduce((sum, r) => sum + r.rating, 0);
        document.getElementById('stat-avg-rating').innerText = (totalStars / approvedReviewsList.length).toFixed(1);
    } else {
        document.getElementById('stat-avg-rating').innerText = "4.9";
    }
}

/* ==========================================
   BOOKINGS MANAGEMENT RENDER & ACTIONS
   ========================================== */
const bookingsSearch = document.getElementById('booking-search');
const statusFilter = document.getElementById('booking-status-filter');
const bookingsTableBody = document.getElementById('bookings-table-body');

bookingsSearch.addEventListener('input', renderBookingsTable);
statusFilter.addEventListener('change', renderBookingsTable);

function renderBookingsTable() {
    const searchQuery = bookingsSearch.value.trim().toLowerCase();
    const activeFilter = statusFilter.value;

    bookingsTableBody.innerHTML = '';

    const filtered = allBookingsList.filter(booking => {
        const name = (booking.clientName || '').toLowerCase();
        const matchesSearch = name.includes(searchQuery);
        const matchesStatus = activeFilter === 'all' || booking.status === activeFilter;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="no-records-msg">No booking matches found.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(booking => {
        const row = document.createElement('tr');
        
        let addonsHTML = '';
        if (booking.addons && booking.addons.length > 0) {
            addonsHTML = booking.addons.map(tag => `<span class="tag-addon">${tag}</span>`).join('');
        } else {
            addonsHTML = '<span style="color:var(--color-text-muted); font-size:0.75rem;">None</span>';
        }

        // Action buttons based on status
        let actionsHTML = '';
        if (booking.status === 'pending') {
            actionsHTML += `
                <button class="btn-icon confirm" title="Approve & Send WhatsApp" data-docid="${booking.docId}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-icon cancel" title="Decline & Send WhatsApp" data-docid="${booking.docId}">
                    <i class="fa-solid fa-ban"></i>
                </button>
                <button class="btn-icon whatsapp" title="Send WhatsApp Message" data-docid="${booking.docId}">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
            `;
        } else if (booking.status === 'confirmed') {
            actionsHTML += `
                <button class="btn-icon complete" title="Mark Completed" data-docid="${booking.docId}">
                    <i class="fa-solid fa-circle-check"></i>
                </button>
                <button class="btn-icon cancel" title="Cancel & Send WhatsApp" data-docid="${booking.docId}">
                    <i class="fa-solid fa-ban"></i>
                </button>
                <button class="btn-icon whatsapp" title="Send WhatsApp Message" data-docid="${booking.docId}">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
            `;
        } else if (booking.status === 'cancelled') {
            actionsHTML += `
                <button class="btn-icon confirm" title="Re-approve & Send WhatsApp" data-docid="${booking.docId}">
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
                <button class="btn-icon whatsapp" title="Send WhatsApp Message" data-docid="${booking.docId}">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
            `;
        } else {
            actionsHTML += `
                <button class="btn-icon whatsapp" title="Send WhatsApp Message" data-docid="${booking.docId}">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
            `;
        }

        const displayId = booking.id || booking.docId.substring(0, 10);
        const dateFormatted = booking.date ? booking.date : '--';
        const timeFormatted = booking.time ? booking.time : '--';
        const priceFormatted = booking.totalPrice ? `R${parseFloat(booking.totalPrice).toFixed(2)}` : 'R0.00';
        const notesFormatted = booking.notes ? booking.notes : '--';

        row.innerHTML = `
            <td class="bold">${displayId}</td>
            <td>${booking.clientName || 'Unknown'}</td>
            <td>${booking.service || '--'}</td>
            <td><div class="addons-tags">${addonsHTML}</div></td>
            <td><strong>${dateFormatted}</strong><br><span style="font-size:0.75rem;">${timeFormatted}</span></td>
            <td class="bold accent-text">${priceFormatted}</td>
            <td class="booking-notes-col" title="${notesFormatted}">${notesFormatted}</td>
            <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
            <td><div class="table-actions">${actionsHTML}</div></td>
        `;

        // Wire Action Click Triggers
        row.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-docid');
                const bookingData = allBookingsList.find(b => b.docId === docId);
                if (!bookingData) return;

                if (btn.classList.contains('confirm')) {
                    openBookingNotifyModal(bookingData, 'confirmed');
                } else if (btn.classList.contains('cancel')) {
                    openBookingNotifyModal(bookingData, 'cancelled');
                } else if (btn.classList.contains('complete')) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    updateBookingStatus(docId, 'completed', btn);
                } else if (btn.classList.contains('whatsapp')) {
                    // Open modal pre-set with current booking status or confirmed
                    const targetAction = bookingData.status === 'cancelled' ? 'cancelled' : 'confirmed';
                    openBookingNotifyModal(bookingData, targetAction);
                }
            });
        });

        bookingsTableBody.appendChild(row);
    });
}

/* ==========================================
   BOOKING NOTIFICATION & WHATSAPP MODAL CONTROLLER
   ========================================== */
let currentNotifyBooking = null;
let currentNotifyAction = 'confirmed';

const notifyModal = document.getElementById('booking-notify-modal');
const modalTitleText = document.getElementById('modal-title-text');
const modalStatusPill = document.getElementById('modal-status-pill');
const modalStatusPillText = document.getElementById('modal-status-pill-text');
const notifyAvatar = document.getElementById('modal-client-avatar');
const notifyClientName = document.getElementById('modal-client-name');
const notifyClientMeta = document.getElementById('modal-client-meta');
const modalWaChip = document.getElementById('modal-wa-chip');
const modalWaPhoneText = document.getElementById('modal-wa-phone-text');
const toggleConfirmBtn = document.getElementById('toggle-confirm-btn');
const toggleCancelBtn = document.getElementById('toggle-cancel-btn');
const customMsgInputLabel = document.getElementById('modal-custom-message-label');
const customMsgInput = document.getElementById('modal-custom-message');
const msgPreviewArea = document.getElementById('modal-msg-preview');
const modalPhoneHint = document.getElementById('modal-phone-hint');
const btnCopyMsg = document.getElementById('btn-copy-msg');
const btnModalWhatsapp = document.getElementById('btn-modal-whatsapp');
const btnModalWaText = document.getElementById('btn-modal-wa-text');
const btnModalEmail = document.getElementById('btn-modal-email');
const btnModalConfirmStatus = document.getElementById('btn-modal-confirm-status');
const btnStatusOnlyText = document.getElementById('btn-status-only-text');
const btnCloseModal = document.getElementById('btn-close-notify-modal');
const btnCancelModal = document.getElementById('btn-cancel-notify-modal');

/**
 * Robust phone number formatting for WhatsApp links:
 * - South African numbers starting with 0 (e.g. 0821234567) -> 27821234567
 * - Strips all symbols, spaces, parentheses, hyphens, and leading '+'
 */
function formatPhoneForWhatsApp(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 9)) {
        cleaned = '27' + cleaned.substring(1);
    }
    return cleaned;
}

function openBookingNotifyModal(booking, defaultAction = 'confirmed') {
    currentNotifyBooking = booking;
    currentNotifyAction = defaultAction;

    // Client Avatar & Name
    const initial = booking.clientName ? booking.clientName.charAt(0).toUpperCase() : 'C';
    if (notifyAvatar) notifyAvatar.innerText = initial;
    if (notifyClientName) notifyClientName.innerText = booking.clientName || 'Client';

    // WhatsApp Phone Chip Display
    const waPhoneClean = formatPhoneForWhatsApp(booking.clientPhone);
    if (modalWaChip && modalWaPhoneText) {
        if (booking.clientPhone) {
            modalWaChip.className = 'wa-phone-chip';
            modalWaChip.innerHTML = `<i class="fa-brands fa-whatsapp"></i> <span>${booking.clientPhone}</span>`;
        } else {
            modalWaChip.className = 'wa-phone-chip no-phone';
            modalWaChip.innerHTML = `<i class="fa-solid fa-phone-slash"></i> <span>No Phone Number</span>`;
        }
    }

    // Client Meta Summary
    if (notifyClientMeta) {
        const addonsInfo = booking.addons && booking.addons.length ? ` (+${booking.addons.length} Add-ons)` : '';
        notifyClientMeta.innerHTML = `
            <i class="fa-solid fa-envelope"></i> ${booking.clientEmail || 'No email'} &nbsp;|&nbsp; 
            <i class="fa-solid fa-tag"></i> <strong>${booking.service || 'Service'}${addonsInfo}</strong> &nbsp;|&nbsp;
            <i class="fa-solid fa-calendar-day"></i> <strong>${booking.date || 'TBD'} @ ${booking.time || 'TBD'}</strong>
        `;
    }

    // Reset custom message
    if (customMsgInput) customMsgInput.value = '';

    // Set action toggle (confirmed vs cancelled) and refresh preview
    setActionToggle(defaultAction);

    // Show modal
    if (notifyModal) notifyModal.style.display = 'flex';
}

function closeBookingNotifyModal() {
    if (notifyModal) notifyModal.style.display = 'none';
    currentNotifyBooking = null;
}

function setActionToggle(action) {
    currentNotifyAction = action;

    if (action === 'confirmed') {
        if (toggleConfirmBtn) toggleConfirmBtn.classList.add('active');
        if (toggleCancelBtn) toggleCancelBtn.classList.remove('active');

        if (modalTitleText) modalTitleText.innerText = 'Approve & Send WhatsApp Confirmation';
        if (modalStatusPill) {
            modalStatusPill.className = 'modal-status-pill';
            if (modalStatusPillText) modalStatusPillText.innerText = 'Confirmed & Booked 🎉';
        }
        if (customMsgInputLabel) {
            customMsgInputLabel.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Studio Note / Arrival Info (Optional)';
        }
        if (customMsgInput) {
            customMsgInput.placeholder = 'e.g. Please arrive 5 minutes early, free parking available at the studio.';
        }
        if (btnModalWaText) btnModalWaText.innerText = 'Approve & Send WhatsApp';
        if (btnStatusOnlyText) btnStatusOnlyText.innerText = 'Confirm Without WhatsApp';
    } else {
        if (toggleCancelBtn) toggleCancelBtn.classList.add('active');
        if (toggleConfirmBtn) toggleConfirmBtn.classList.remove('active');

        if (modalTitleText) modalTitleText.innerText = 'Decline & Send WhatsApp Cancellation';
        if (modalStatusPill) {
            modalStatusPill.className = 'modal-status-pill cancelled';
            if (modalStatusPillText) modalStatusPillText.innerText = 'Declined & Cancelled 🚫';
        }
        if (customMsgInputLabel) {
            customMsgInputLabel.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Cancellation Reason for Client (Optional)';
        }
        if (customMsgInput) {
            customMsgInput.placeholder = 'e.g. The requested time slot is unavailable. Please choose another date on our website.';
        }
        if (btnModalWaText) btnModalWaText.innerText = 'Decline & Send WhatsApp';
        if (btnStatusOnlyText) btnStatusOnlyText.innerText = 'Cancel Without WhatsApp';
    }

    updateModalMessagePreview();
}

function generateClientMessageText(booking, action, customNote) {
    if (!booking) return '';

    const name = booking.clientName || 'Valued Client';
    const service = booking.service || 'Nail Service';
    const addons = booking.addons && booking.addons.length ? `\n✨ *Add-ons:* ${booking.addons.join(', ')}` : '';
    const date = booking.date || 'TBD';
    const time = booking.time || 'TBD';
    const price = booking.totalPrice ? `R${parseFloat(booking.totalPrice).toFixed(2)}` : 'R0.00';
    const bookingId = booking.id || booking.docId.substring(0, 8);

    if (action === 'confirmed') {
        let msg = `✨ *Ndi's Nail Bar — Appointment Confirmed!* ✨\n\n`;
        msg += `Hi ${name},\n`;
        msg += `Your appointment has been *CONFIRMED & BOOKED*! 🎉\n\n`;
        msg += `💅 *Service:* ${service}${addons}\n`;
        msg += `📅 *Date:* ${date}\n`;
        msg += `⏰ *Time:* ${time}\n`;
        msg += `💰 *Total:* ${price}\n`;
        msg += `🔖 *Booking ID:* ${bookingId}\n`;

        if (customNote) {
            msg += `\n📝 *Note:* ${customNote}\n`;
        }

        msg += `\n📍 *Studio:* Ndi's Nail Bar\n`;
        msg += `We look forward to pampering you! If you need to make changes, please reply to this WhatsApp message.`;
        return msg;
    } else {
        let msg = `💅 *Ndi's Nail Bar — Appointment Update*\n\n`;
        msg += `Hi ${name},\n`;
        msg += `We regret to inform you that your booking request for *${service}* on *${date}* at *${time}* could not be accepted.\n\n`;

        if (customNote) {
            msg += `📝 *Reason:* ${customNote}\n\n`;
        } else {
            msg += `📝 *Reason:* The requested time slot is currently unavailable.\n\n`;
        }

        msg += `🔖 *Booking ID:* ${bookingId}\n\n`;
        msg += `Please visit our website to pick another available time slot, or reply directly to this message.\n\n`;
        msg += `Warm regards,\n*Ndi's Nail Bar*`;
        return msg;
    }
}

function updateModalMessagePreview() {
    if (!currentNotifyBooking) return;

    const customNote = customMsgInput ? customMsgInput.value.trim() : '';
    const text = generateClientMessageText(currentNotifyBooking, currentNotifyAction, customNote);
    if (msgPreviewArea) msgPreviewArea.value = text;

    const waPhone = formatPhoneForWhatsApp(currentNotifyBooking.clientPhone);

    // Update WhatsApp Button Status
    if (btnModalWhatsapp) {
        if (waPhone) {
            btnModalWhatsapp.disabled = false;
            btnModalWhatsapp.style.opacity = '1';
            btnModalWhatsapp.title = `Send WhatsApp message to ${currentNotifyBooking.clientPhone}`;
        } else {
            btnModalWhatsapp.disabled = true;
            btnModalWhatsapp.style.opacity = '0.5';
            btnModalWhatsapp.title = 'No phone number provided by client';
        }
    }

    // Update Email Link
    if (btnModalEmail) {
        if (currentNotifyBooking.clientEmail) {
            const subject = `Ndi's Nail Bar Appointment ${currentNotifyAction === 'confirmed' ? 'Confirmation' : 'Cancellation'} (${currentNotifyBooking.id || ''})`;
            btnModalEmail.href = `mailto:${currentNotifyBooking.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
            btnModalEmail.style.display = 'inline-flex';
        } else {
            btnModalEmail.style.display = 'none';
        }
    }
}

// Modal Event Listeners
if (toggleConfirmBtn && toggleCancelBtn) {
    toggleConfirmBtn.addEventListener('click', () => setActionToggle('confirmed'));
    toggleCancelBtn.addEventListener('click', () => setActionToggle('cancelled'));
}

if (customMsgInput) {
    customMsgInput.addEventListener('input', updateModalMessagePreview);
}

if (btnCopyMsg) {
    btnCopyMsg.addEventListener('click', () => {
        if (msgPreviewArea && msgPreviewArea.value) {
            navigator.clipboard.writeText(msgPreviewArea.value)
                .then(() => showToast('WhatsApp message copied to clipboard!', 'success'))
                .catch(() => showToast('Could not copy automatically. Please select text manually.', 'warning'));
        }
    });
}

if (btnCloseModal) btnCloseModal.addEventListener('click', closeBookingNotifyModal);
if (btnCancelModal) btnCancelModal.addEventListener('click', closeBookingNotifyModal);

// Close on clicking backdrop
if (notifyModal) {
    notifyModal.addEventListener('click', (e) => {
        if (e.target === notifyModal) closeBookingNotifyModal();
    });
}

// WhatsApp Button Click: Updates Firestore & Opens WhatsApp
if (btnModalWhatsapp) {
    btnModalWhatsapp.addEventListener('click', async () => {
        if (!currentNotifyBooking) return;

        const docId = currentNotifyBooking.docId;
        const clientName = currentNotifyBooking.clientName || 'Client';
        const customNote = customMsgInput ? customMsgInput.value.trim() : '';
        const text = generateClientMessageText(currentNotifyBooking, currentNotifyAction, customNote);
        const waPhone = formatPhoneForWhatsApp(currentNotifyBooking.clientPhone);

        if (!waPhone) {
            showToast('No phone number available for this client. Please use Email or copy the text.', 'warning');
            return;
        }

        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;

        // Open WhatsApp directly in a new window/tab
        window.open(waUrl, '_blank');

        // Update database with status & notification metadata
        await updateBookingWithNotification(docId, currentNotifyAction, customNote, "WhatsApp");
        closeBookingNotifyModal();
    });
}

// Save Status Only Button: Updates Firestore without WhatsApp
if (btnModalConfirmStatus) {
    btnModalConfirmStatus.addEventListener('click', async () => {
        if (!currentNotifyBooking) return;

        const docId = currentNotifyBooking.docId;
        const customNote = customMsgInput ? customMsgInput.value.trim() : '';

        btnModalConfirmStatus.disabled = true;
        btnModalConfirmStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
            await updateBookingWithNotification(docId, currentNotifyAction, customNote, "None (Status Only)");
        } finally {
            btnModalConfirmStatus.disabled = false;
            closeBookingNotifyModal();
        }
    });
}

// Email Button Click: Update Firestore metadata
if (btnModalEmail) {
    btnModalEmail.addEventListener('click', () => {
        if (!currentNotifyBooking) return;
        const docId = currentNotifyBooking.docId;
        const customNote = customMsgInput ? customMsgInput.value.trim() : '';
        updateBookingWithNotification(docId, currentNotifyAction, customNote, "Email");
        closeBookingNotifyModal();
    });
}

function updateBookingWithNotification(docId, newStatus, customNote = '', channel = '') {
    const docRef = doc(db, "bookings", docId);
    const updateData = {
        status: newStatus,
        adminNote: customNote,
        notificationSentAt: Timestamp.now(),
        notificationChannel: channel || 'In-App'
    };

    return updateDoc(docRef, updateData)
        .then(() => {
            const statusLabels = {
                confirmed: 'approved & booked',
                completed: 'marked as completed',
                cancelled: 'declined & cancelled'
            };
            const channelMsg = channel && channel !== 'None (Status Only)' ? ` (WhatsApp notification opened)` : '';
            showToast(`Booking ${statusLabels[newStatus] || 'updated'}${channelMsg}!`, 'success');
        })
        .catch(err => {
            console.error("Error updating booking status:", err);
            showToast(`Failed to update booking status. ${err.message || 'Please try again.'}`, 'error');
        });
}

function updateBookingStatus(docId, newStatus, btnElement) {
    const docRef = doc(db, "bookings", docId);
    updateDoc(docRef, { status: newStatus })
        .then(() => {
            const statusLabels = {
                confirmed: 'confirmed',
                completed: 'marked as completed',
                cancelled: 'cancelled'
            };
            showToast(`Booking ${statusLabels[newStatus] || 'updated'} successfully!`, 'success');
        })
        .catch(err => {
            console.error("Error updating booking status:", err);
            showToast(`Failed to update booking. ${err.message || 'Please try again.'}`, 'error');
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.style.opacity = '1';
            }
        });
}



/* ==========================================
   REVIEWS MODERATION QUEUE
   ========================================== */
const reviewsContainer = document.getElementById('pending-reviews-container');

function renderPendingReviews(reviews) {
    reviewsContainer.innerHTML = '';

    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<div class="no-records-msg">No pending reviews requiring moderation. Great job!</div>';
        return;
    }

    reviews.forEach(review => {
        const initial = review.name ? review.name.charAt(0) : 'C';

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= review.rating) {
                starsHTML += '<i class="fa-solid fa-star"></i>';
            } else {
                starsHTML += '<i class="fa-regular fa-star"></i>';
            }
        }

        const card = document.createElement('div');
        card.className = 'moderation-card glass-panel';
        card.innerHTML = `
            <div class="review-header">
                <div class="review-author">
                    <span class="author-avatar">${initial}</span>
                    <div>
                        <h4 class="author-name">${review.name}</h4>
                        <span class="review-date">${review.date}</span>
                    </div>
                </div>
                <div class="review-stars">${starsHTML}</div>
            </div>
            <p class="review-body" style="margin-top: 10px;">${review.content}</p>
            <div class="moderation-footer">
                <button class="btn-mod-delete" data-docid="${review.docId}"><i class="fa-solid fa-trash-can"></i> Reject & Delete</button>
                <button class="btn-mod-approve" data-docid="${review.docId}"><i class="fa-solid fa-circle-check"></i> Approve & Publish</button>
            </div>
        `;

        card.querySelector('.btn-mod-approve').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';
            approveReview(review.docId, btn);
        });
        card.querySelector('.btn-mod-delete').addEventListener('click', (e) => {
            if (confirm("Are you sure you want to delete this review?")) {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
                deleteReview(review.docId, btn);
            }
        });

        reviewsContainer.appendChild(card);
    });
}

function approveReview(docId, btnElement) {
    const docRef = doc(db, "reviews", docId);
    updateDoc(docRef, { status: "approved" })
        .then(() => showToast('Review approved and published!', 'success'))
        .catch(err => {
            console.error("Error approving review:", err);
            showToast(`Failed to approve review. ${err.message || 'Try again.'}`, 'error');
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = '<i class="fa-solid fa-circle-check"></i> Approve & Publish';
            }
        });
}

function deleteReview(docId, btnElement) {
    const docRef = doc(db, "reviews", docId);
    deleteDoc(docRef)
        .then(() => showToast('Review rejected and deleted.', 'info'))
        .catch(err => {
            console.error("Error deleting review:", err);
            showToast(`Failed to delete review. ${err.message || 'Try again.'}`, 'error');
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = '<i class="fa-solid fa-trash-can"></i> Reject & Delete';
            }
        });
}

/* ==========================================
   PORTFOLIO GALLERY UPLOADER BEHAVIORS
   ========================================== */
function initUploaderBehaviors() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('nail-file-input');
    const preview = document.getElementById('upload-preview');
    const uploadIcon = dropZone.querySelector('.upload-icon');
    const text1 = dropZone.querySelector('p:nth-of-type(1)');
    const text2 = dropZone.querySelector('p:nth-of-type(2)');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('File too large. Maximum size is 5MB.', 'warning');
                fileInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                uploadIcon.style.display = 'none';
                text1.style.display = 'none';
                text2.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    const form = document.getElementById('nail-upload-form');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('nail-title').value.trim();
        const category = document.getElementById('nail-category').value;
        const file = fileInput.files[0];

        if (!file) {
            showToast('Please select a nail photo to upload.', 'warning');
            return;
        }

        const btnPublish = document.getElementById('btn-submit-upload');
        const origText = btnPublish.innerHTML;
        btnPublish.disabled = true;
        btnPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        const fileRef = ref(storage, `nails/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = `${progress}%`;
            }, 
            (error) => {
                console.error("Upload error:", error);
                showToast('Upload failed. Please check your connection and try again.', 'error');
                btnPublish.disabled = false;
                btnPublish.innerHTML = origText;
                progressContainer.style.display = 'none';
            }, 
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    addDoc(collection(db, "nails"), {
                        title: title,
                        category: category,
                        imageUrl: downloadURL,
                        createdAt: Timestamp.now()
                    })
                    .then(() => {
                        showToast('Nail design published to the gallery!', 'success');
                        
                        form.reset();
                        preview.style.display = 'none';
                        preview.src = '';
                        uploadIcon.style.display = 'block';
                        text1.style.display = 'block';
                        text2.style.display = 'block';
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                        
                        document.querySelector('.menu-item[data-tab="overview"]').click();
                    })
                    .catch(err => {
                        console.error("Firestore save error:", err);
                        showToast('Error saving nail metadata to database.', 'error');
                    })
                    .finally(() => {
                        btnPublish.disabled = false;
                        btnPublish.innerHTML = origText;
                    });
                }).catch(err => {
                    console.error("Download URL error:", err);
                    showToast('Failed to get download URL. Try again.', 'error');
                    btnPublish.disabled = false;
                    btnPublish.innerHTML = origText;
                    progressContainer.style.display = 'none';
                });
            }
        );
    });
}

/* ==========================================
   CMS: PRICING EDITOR & LAYOUT IMAGE MANAGER
   ========================================== */

function initCMSBehaviors() {
    // --- Seed Default Services if Collection is Empty ---
    getDocs(collection(db, "services")).then(snapshot => {
        if (snapshot.empty) {
            const defaultServices = [
                { name: "Gel Manicure", category: "MANICURE", description: "Long-lasting, chip-resistant gel polish cured under LED light. Includes cuticle care, shaping, and hydrating massage.", price: 45, duration: 45, order: 1 },
                { name: "Acrylic Full Set", category: "EXTENSIONS", description: "Full set of sculpted premium acrylic extensions with length extension, shape of your choice, and solid gel color.", price: 65, duration: 60, order: 2 },
                { name: "Glazed Chrome Gel", category: "SPECIALTY", description: "The signature shimmering chrome finish on a base of your choice. Clean, reflective, and highly fashionable glazed look.", price: 55, duration: 50, order: 3 },
                { name: "Custom Nail Art Set", category: "DESIGN", description: "Bespoke hand-painted nail designs, fine floral line-work, custom patterns, or layered glitter detailing tailored to your theme.", price: 75, duration: 75, order: 4 }
            ];
            defaultServices.forEach(service => {
                addDoc(collection(db, "services"), service).catch(err => console.error("Seed service error:", err));
            });
            showToast('Default services loaded into database.', 'info');
        }
    }).catch(err => console.error("Services check error:", err));

    // --- Seed Default Addons if Collection is Empty ---
    getDocs(collection(db, "addons")).then(snapshot => {
        if (snapshot.empty) {
            const defaultAddons = [
                { name: "Matte Top Coat", price: 5 },
                { name: "Paraffin Treatment", price: 15 },
                { name: "Rhinestone Studs (x10)", price: 10 },
                { name: "Nail Repair (Single)", price: 8 }
            ];
            defaultAddons.forEach(addon => {
                addDoc(collection(db, "addons"), addon).catch(err => console.error("Seed addon error:", err));
            });
            showToast('Default add-ons loaded into database.', 'info');
        }
    }).catch(err => console.error("Addons check error:", err));

    // --- Hero Image Upload ---
    const heroInput = document.getElementById('hero-image-input');
    const heroUploadBtn = document.getElementById('btn-upload-hero');
    if (heroInput && heroUploadBtn) {
        heroUploadBtn.addEventListener('click', () => {
            const file = heroInput.files[0];
            if (!file) {
                showToast('Please select a Hero image first.', 'warning');
                return;
            }
            uploadLayoutImage(file, 'heroImageUrl', heroUploadBtn, 'hero-preview-img');
        });
    }

    // --- About Image Upload ---
    const aboutInput = document.getElementById('about-image-input');
    const aboutUploadBtn = document.getElementById('btn-upload-about');
    if (aboutInput && aboutUploadBtn) {
        aboutUploadBtn.addEventListener('click', () => {
            const file = aboutInput.files[0];
            if (!file) {
                showToast('Please select an About image first.', 'warning');
                return;
            }
            uploadLayoutImage(file, 'aboutImageUrl', aboutUploadBtn, 'about-preview-img');
        });
    }

    // --- Save All Prices Button ---
    const savePricesBtn = document.getElementById('btn-save-prices');
    if (savePricesBtn) {
        savePricesBtn.addEventListener('click', saveAllPrices);
    }
}

function uploadLayoutImage(file, fieldName, btnElement, previewId) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Maximum size is 5MB.', 'warning');
        return;
    }

    const origText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

    const fileRef = ref(storage, `layout/${fieldName}_${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed',
        () => {},
        (error) => {
            console.error("Layout upload error:", error);
            showToast('Image upload failed. Check your connection.', 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = origText;
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                const updateData = {};
                updateData[fieldName] = downloadURL;

                setDoc(doc(db, "settings", "layout"), updateData, { merge: true })
                    .then(() => {
                        showToast('Website image updated successfully!', 'success');
                        const previewEl = document.getElementById(previewId);
                        if (previewEl) {
                            previewEl.src = downloadURL;
                            previewEl.style.display = 'block';
                        }
                    })
                    .catch(err => {
                        console.error("Layout save error:", err);
                        showToast('Failed to save image URL. Try again.', 'error');
                    })
                    .finally(() => {
                        btnElement.disabled = false;
                        btnElement.innerHTML = origText;
                    });
            }).catch(err => {
                console.error("Download URL error:", err);
                showToast('Failed to retrieve image URL.', 'error');
                btnElement.disabled = false;
                btnElement.innerHTML = origText;
            });
        }
    );
}

/* --- Services Pricing Editor --- */
function renderServicesPricingEditor() {
    const container = document.getElementById('services-pricing-list');
    if (!container) return;

    container.innerHTML = '';

    if (servicesList.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">No services found. They will be auto-seeded on first load.</p>';
        return;
    }

    servicesList.forEach(service => {
        const row = document.createElement('div');
        row.className = 'pricing-edit-row';
        row.innerHTML = `
            <div class="pricing-edit-info">
                <span class="pricing-edit-category">${service.category}</span>
                <span class="pricing-edit-name">${service.name}</span>
            </div>
            <div class="pricing-edit-controls">
                <label>Price (R)</label>
                <input type="number" class="pricing-input service-price-input" data-docid="${service.docId}" value="${service.price}" min="0" step="1">
                <label>Duration</label>
                <input type="number" class="pricing-input service-duration-input" data-docid="${service.docId}" value="${service.duration}" min="5" step="5">
                <span class="duration-suffix">mins</span>
            </div>
        `;
        container.appendChild(row);
    });
}

/* --- Addons Pricing Editor --- */
function renderAddonsPricingEditor() {
    const container = document.getElementById('addons-pricing-list');
    if (!container) return;

    container.innerHTML = '';

    if (addonsList.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">No add-ons found. They will be auto-seeded on first load.</p>';
        return;
    }

    addonsList.forEach(addon => {
        const row = document.createElement('div');
        row.className = 'pricing-edit-row addon-row';
        row.innerHTML = `
            <div class="pricing-edit-info">
                <span class="pricing-edit-name">${addon.name}</span>
            </div>
            <div class="pricing-edit-controls">
                <label>Price (R)</label>
                <input type="number" class="pricing-input addon-price-input" data-docid="${addon.docId}" value="${addon.price}" min="0" step="1">
            </div>
        `;
        container.appendChild(row);
    });
}

/* --- Save All Prices --- */
function saveAllPrices() {
    const savePricesBtn = document.getElementById('btn-save-prices');
    const origText = savePricesBtn.innerHTML;
    savePricesBtn.disabled = true;
    savePricesBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const promises = [];

    // Update service prices
    document.querySelectorAll('.service-price-input').forEach(input => {
        const docId = input.getAttribute('data-docid');
        const newPrice = parseFloat(input.value);
        
        // Find matching duration input
        const durationInput = document.querySelector(`.service-duration-input[data-docid="${docId}"]`);
        const newDuration = durationInput ? parseInt(durationInput.value) : null;

        const updateData = { price: newPrice };
        if (newDuration !== null) updateData.duration = newDuration;

        if (!isNaN(newPrice) && newPrice >= 0) {
            promises.push(
                updateDoc(doc(db, "services", docId), updateData)
            );
        }
    });

    // Update addon prices
    document.querySelectorAll('.addon-price-input').forEach(input => {
        const docId = input.getAttribute('data-docid');
        const newPrice = parseFloat(input.value);

        if (!isNaN(newPrice) && newPrice >= 0) {
            promises.push(
                updateDoc(doc(db, "addons", docId), { price: newPrice })
            );
        }
    });

    Promise.all(promises)
        .then(() => {
            showToast(`All prices saved! (${promises.length} items updated)`, 'success');
        })
        .catch(err => {
            console.error("Price save error:", err);
            showToast(`Failed to save some prices. ${err.message || 'Try again.'}`, 'error');
        })
        .finally(() => {
            savePricesBtn.disabled = false;
            savePricesBtn.innerHTML = origText;
        });
}

/* ==========================================
   QR CODE CLIENT SLIP SCANNER & AUTO-COMPLETE
   ========================================== */
let html5QrScannerInstance = null;

const btnOpenQRScanner = document.getElementById('btn-open-qr-scanner');
const qrScanModal = document.getElementById('qr-scan-modal');
const btnCloseQRModal = document.getElementById('btn-close-qr-modal');
const btnCancelQRModal = document.getElementById('btn-cancel-qr-modal');
const manualBookingInput = document.getElementById('manual-booking-id-input');
const btnManualComplete = document.getElementById('btn-manual-complete-booking');
const qrFeedback = document.getElementById('qr-scan-feedback');

function initAdminQRScanner() {
    if (btnOpenQRScanner) {
        btnOpenQRScanner.addEventListener('click', openQRScannerModal);
    }
    if (btnCloseQRModal) {
        btnCloseQRModal.addEventListener('click', closeQRScannerModal);
    }
    if (btnCancelQRModal) {
        btnCancelQRModal.addEventListener('click', closeQRScannerModal);
    }

    if (qrScanModal) {
        qrScanModal.addEventListener('click', (e) => {
            if (e.target === qrScanModal) closeQRScannerModal();
        });
    }

    if (btnManualComplete) {
        btnManualComplete.addEventListener('click', handleManualBookingComplete);
    }

    if (manualBookingInput) {
        manualBookingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleManualBookingComplete();
            }
        });
    }

    // Check for direct URL scan completion (e.g. ?completeBooking=NB-12345)
    checkUrlScanCompletion();
}

function openQRScannerModal() {
    if (!qrScanModal) return;
    qrScanModal.style.display = 'flex';
    if (qrFeedback) {
        qrFeedback.style.display = 'none';
        qrFeedback.className = 'qr-feedback-box';
        qrFeedback.innerHTML = '';
    }
    if (manualBookingInput) manualBookingInput.value = '';

    // Initialize Camera Scanner
    startCameraScanner();
}

function closeQRScannerModal() {
    if (!qrScanModal) return;
    qrScanModal.style.display = 'none';
    stopCameraScanner();
}

function startCameraScanner() {
    const qrReaderDiv = document.getElementById('qr-reader');
    if (!qrReaderDiv) return;

    if (typeof Html5Qrcode === 'undefined') {
        if (qrFeedback) {
            qrFeedback.className = 'qr-feedback-box error';
            qrFeedback.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Scanner library loading. You can enter the Booking ID manually below.';
            qrFeedback.style.display = 'block';
        }
        return;
    }

    try {
        stopCameraScanner();
        html5QrScannerInstance = new Html5Qrcode("qr-reader");

        const config = {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
        };

        html5QrScannerInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // Successful QR code scan
                handleScannedQRCode(decodedText);
            },
            (errorMessage) => {
                // Parse errors are expected while searching frames
            }
        ).catch(err => {
            console.warn("Camera start failed, falling back to manual input:", err);
            if (qrFeedback) {
                qrFeedback.className = 'qr-feedback-box';
                qrFeedback.style.background = 'rgba(241, 196, 15, 0.15)';
                qrFeedback.style.color = '#d35400';
                qrFeedback.style.border = '1px solid rgba(241, 196, 15, 0.3)';
                qrFeedback.innerHTML = '<i class="fa-solid fa-camera-rotate"></i> Camera permission needed or unavailable. Please enter the Booking ID manually below.';
                qrFeedback.style.display = 'block';
            }
        });
    } catch (err) {
        console.error("QR scanner start exception:", err);
    }
}

function stopCameraScanner() {
    if (html5QrScannerInstance) {
        try {
            html5QrScannerInstance.stop().then(() => {
                html5QrScannerInstance.clear();
                html5QrScannerInstance = null;
            }).catch(() => {
                html5QrScannerInstance = null;
            });
        } catch (e) {
            html5QrScannerInstance = null;
        }
    }
}

function parseBookingIdFromQR(rawText) {
    if (!rawText) return '';
    let text = rawText.trim();

    // Check if QR text is a URL with completeBooking query param
    if (text.includes('completeBooking=')) {
        try {
            const url = new URL(text, window.location.origin);
            const id = url.searchParams.get('completeBooking');
            if (id) return id.trim().toUpperCase();
        } catch (e) {
            const match = text.match(/completeBooking=([^&]+)/);
            if (match && match[1]) return decodeURIComponent(match[1]).trim().toUpperCase();
        }
    }

    // Check if JSON payload
    if (text.startsWith('{') && text.endsWith('}')) {
        try {
            const data = JSON.parse(text);
            if (data.id) return data.id.trim().toUpperCase();
            if (data.bookingId) return data.bookingId.trim().toUpperCase();
        } catch (e) {}
    }

    // Return plain text ID (e.g. NB-12345)
    return text.toUpperCase();
}

function handleScannedQRCode(decodedText) {
    const bookingId = parseBookingIdFromQR(decodedText);
    if (!bookingId) return;

    // Pause camera to prevent repeated scans
    stopCameraScanner();

    completeBookingById(bookingId, "QR Camera Scan");
}

function handleManualBookingComplete() {
    const rawVal = manualBookingInput ? manualBookingInput.value.trim() : '';
    if (!rawVal) {
        showToast('Please enter a Booking ID (e.g. NB-12345).', 'warning');
        return;
    }
    const bookingId = parseBookingIdFromQR(rawVal);
    completeBookingById(bookingId, "Manual ID Entry");
}

async function completeBookingById(bookingId, source = "QR Scan") {
    if (!bookingId) return;

    if (qrFeedback) {
        qrFeedback.className = 'qr-feedback-box';
        qrFeedback.style.display = 'block';
        qrFeedback.style.background = 'rgba(52, 152, 219, 0.15)';
        qrFeedback.style.color = '#2980b9';
        qrFeedback.style.border = '1px solid rgba(52, 152, 219, 0.3)';
        qrFeedback.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Looking up booking <strong>${bookingId}</strong>...`;
    }

    // 1. Search in local active list first
    let targetBooking = allBookingsList.find(b => 
        (b.id && b.id.toUpperCase() === bookingId.toUpperCase()) || 
        (b.docId && b.docId === bookingId)
    );

    let docId = targetBooking ? targetBooking.docId : null;

    // 2. If not found in memory, query Firestore
    if (!docId) {
        try {
            const q = query(collection(db, "bookings"), where("id", "==", bookingId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                docId = docSnap.id;
                targetBooking = { docId: docId, ...docSnap.data() };
            }
        } catch (err) {
            console.error("Firestore lookup error:", err);
        }
    }

    if (!docId || !targetBooking) {
        if (qrFeedback) {
            qrFeedback.className = 'qr-feedback-box error';
            qrFeedback.style.display = 'block';
            qrFeedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> No booking found matching ID: <strong>${bookingId}</strong>. Please verify the slip.`;
        }
        showToast(`No booking found matching ${bookingId}`, 'error');
        return;
    }

    // 3. If already completed
    if (targetBooking.status === 'completed') {
        if (qrFeedback) {
            qrFeedback.className = 'qr-feedback-box';
            qrFeedback.style.display = 'block';
            qrFeedback.style.background = 'rgba(39, 174, 96, 0.15)';
            qrFeedback.style.color = '#27ae60';
            qrFeedback.style.border = '1px solid rgba(39, 174, 96, 0.3)';
            qrFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Booking <strong>${targetBooking.id || docId}</strong> for <strong>${targetBooking.clientName || 'Client'}</strong> is already completed.`;
        }
        showToast(`Booking ${targetBooking.id || docId} was already marked completed!`, 'info');
        setTimeout(() => closeQRScannerModal(), 2000);
        return;
    }

    // 4. Update status to 'completed' in Firestore
    try {
        const docRef = doc(db, "bookings", docId);
        await updateDoc(docRef, {
            status: "completed",
            completedAt: Timestamp.now(),
            completedVia: source
        });

        const clientName = targetBooking.clientName || 'Client';
        const displayId = targetBooking.id || docId.substring(0, 8);

        if (qrFeedback) {
            qrFeedback.className = 'qr-feedback-box success';
            qrFeedback.style.display = 'block';
            qrFeedback.innerHTML = `
                <i class="fa-solid fa-circle-check" style="font-size: 1.4rem; display: block; margin-bottom: 6px;"></i>
                <strong>Service Completed!</strong><br>
                <span>${clientName} (${displayId})</span> has been completed and automatically removed from the active bookings list.
            `;
        }

        showToast(`🎉 Service completed for ${clientName} (${displayId})! Removed from active list.`, 'success');

        // Automatically close modal after 1.8 seconds
        setTimeout(() => {
            closeQRScannerModal();
        }, 1800);

    } catch (err) {
        console.error("Error updating booking status via QR:", err);
        if (qrFeedback) {
            qrFeedback.className = 'qr-feedback-box error';
            qrFeedback.style.display = 'block';
            qrFeedback.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Failed to update booking: ${err.message || 'Please try again.'}`;
        }
        showToast(`Failed to complete booking: ${err.message || 'Error'}`, 'error');
    }
}

function checkUrlScanCompletion() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('completeBooking')) {
            const bookingId = urlParams.get('completeBooking');
            if (bookingId) {
                // Clear URL query parameter to avoid repeated completion triggers on refresh
                window.history.replaceState({}, document.title, window.location.pathname);

                // Small delay to allow initial Firestore auth & connection
                setTimeout(() => {
                    completeBookingById(bookingId, "Direct QR Link");
                }, 1000);
            }
        }
    } catch (e) {
        console.warn("URL scan check exception:", e);
    }
}

// Wire QR Scanner during initialization
initAdminQRScanner();

