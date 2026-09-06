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
import { 
    sendBookingStatusEmails, 
    sendBookingCreatedEmails, 
    getResendConfig, 
    saveResendConfig 
} from "./email-service.js";

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

// Default Services, Addons, and Portfolio Designs Constants
const DEFAULT_SERVICES = [
    { docId: "service_gel_manicure", name: "Gel Manicure", category: "MANICURE", description: "Long-lasting gel polish with cuticles refinement, shaping, buffing, and luxury rose cuticle oil massage.", price: 45, duration: 45, order: 1 },
    { docId: "service_acrylic_full_set", name: "Acrylic Full Set", category: "EXTENSIONS", description: "Full set acrylic extensions with precision tip application, sculpting, and bespoke high-gloss gel finish.", price: 65, duration: 60, order: 2 },
    { docId: "service_glazed_chrome", name: "Glazed Chrome Gel", category: "SPECIALTY", description: "The signature shimmering chrome finish on a base of your choice. Clean, reflective, and highly fashionable glazed look.", price: 55, duration: 50, order: 3 },
    { docId: "service_custom_art", name: "Custom Nail Art Set", category: "DESIGN", description: "Bespoke hand-painted nail designs, fine floral line-work, custom patterns, or layered glitter detailing tailored to your theme.", price: 75, duration: 75, order: 4 }
];

const DEFAULT_ADDONS = [
    { docId: "addon_matte_top_coat", name: "Matte Top Coat", price: 5 },
    { docId: "addon_paraffin_treatment", name: "Paraffin Treatment", price: 15 },
    { docId: "addon_rhinestones", name: "Rhinestone Studs (x10)", price: 10 },
    { docId: "addon_nail_repair", name: "Nail Repair (Single)", price: 8 }
];

const DEFAULT_NAILS = [
    {
        docId: "nail_acrylic_foil",
        title: "Sculpted Rose Gold Foil",
        category: "acrylic",
        imageUrl: "assets/acrylic.jpg",
        createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z"))
    },
    {
        docId: "nail_gel_ombre",
        title: "Lavender & Blush Ombré",
        category: "gel",
        imageUrl: "assets/gel.jpg",
        createdAt: Timestamp.fromDate(new Date("2025-01-02T10:00:00Z"))
    },
    {
        docId: "nail_chrome_shimmer",
        title: "Glossy Rose Gold Shimmer",
        category: "chrome",
        imageUrl: "assets/chrome.jpg",
        createdAt: Timestamp.fromDate(new Date("2025-01-03T10:00:00Z"))
    },
    {
        docId: "nail_art_floral",
        title: "White Lace Floral Details",
        category: "art",
        imageUrl: "assets/art.jpg",
        createdAt: Timestamp.fromDate(new Date("2025-01-04T10:00:00Z"))
    }
];

// Global Lists for stats calculation
let allBookingsList = [];
let approvedReviewsList = [];
let nailsList = [...DEFAULT_NAILS];
let servicesList = [...DEFAULT_SERVICES];
let addonsList = [...DEFAULT_ADDONS];

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

        if (tabName === 'settings') {
            renderServicesPricingEditor();
            renderAddonsPricingEditor();
        } else if (tabName === 'uploader') {
            renderNailsGalleryManager();
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
            if (snapshot.empty) {
                // If collection is empty, auto-seed defaults with deterministic IDs
                nailsList = [...DEFAULT_NAILS];
                DEFAULT_NAILS.forEach(n => {
                    const { docId, ...data } = n;
                    setDoc(doc(db, "nails", docId), data, { merge: true }).catch(err => console.warn("Auto-seed nail error:", err));
                });
            } else {
                nailsList = [];
                snapshot.forEach(docSnap => {
                    nailsList.push({ docId: docSnap.id, ...docSnap.data() });
                });
                // Sort by createdAt desc locally
                nailsList.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });
            }
            updateStats();
            renderNailsGalleryManager();
        }, (err) => {
            console.error("Nails list stream error (using defaults):", err);
            nailsList = [...DEFAULT_NAILS];
            renderNailsGalleryManager();
        });
    } catch (err) {
        console.error("Nails init error:", err);
        nailsList = [...DEFAULT_NAILS];
        renderNailsGalleryManager();
    }

    // 5. Real-time Services Watcher (CMS)
    try {
        const servicesQuery = collection(db, "services");
        unsubServices = onSnapshot(servicesQuery, (snapshot) => {
            if (snapshot.empty) {
                // If collection is empty, auto-seed defaults with deterministic IDs
                servicesList = [...DEFAULT_SERVICES];
                DEFAULT_SERVICES.forEach(s => {
                    const { docId, ...data } = s;
                    setDoc(doc(db, "services", docId), data, { merge: true }).catch(err => console.warn("Auto-seed service error:", err));
                });
            } else {
                servicesList = [];
                snapshot.forEach(docSnap => {
                    servicesList.push({ docId: docSnap.id, ...docSnap.data() });
                });
                // Sort locally by order or name
                servicesList.sort((a, b) => (a.order || 99) - (b.order || 99));
            }
            renderServicesPricingEditor();
        }, (err) => {
            console.error("Services stream error (using defaults):", err);
            servicesList = [...DEFAULT_SERVICES];
            renderServicesPricingEditor();
        });
    } catch (err) {
        console.error("Services init error:", err);
        servicesList = [...DEFAULT_SERVICES];
        renderServicesPricingEditor();
    }

    // 6. Real-time Addons Watcher (CMS)
    try {
        const addonsQuery = collection(db, "addons");
        unsubAddons = onSnapshot(addonsQuery, (snapshot) => {
            if (snapshot.empty) {
                addonsList = [...DEFAULT_ADDONS];
                DEFAULT_ADDONS.forEach(a => {
                    const { docId, ...data } = a;
                    setDoc(doc(db, "addons", docId), data, { merge: true }).catch(err => console.warn("Auto-seed addon error:", err));
                });
            } else {
                addonsList = [];
                snapshot.forEach(docSnap => {
                    addonsList.push({ docId: docSnap.id, ...docSnap.data() });
                });
            }
            renderAddonsPricingEditor();
        }, (err) => {
            console.error("Addons stream error (using defaults):", err);
            addonsList = [...DEFAULT_ADDONS];
            renderAddonsPricingEditor();
        });
    } catch (err) {
        console.error("Addons init error:", err);
        addonsList = [...DEFAULT_ADDONS];
        renderAddonsPricingEditor();
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
                <button class="btn-icon delete" title="Delete Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-trash-can"></i>
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
                <button class="btn-icon delete" title="Delete Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-trash-can"></i>
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
                <button class="btn-icon delete" title="Delete Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        } else {
            actionsHTML += `
                <button class="btn-icon whatsapp" title="Send WhatsApp Message" data-docid="${booking.docId}">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
                <button class="btn-icon delete" title="Delete Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-trash-can"></i>
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
                } else if (btn.classList.contains('delete')) {
                    const clientName = bookingData.clientName || 'this client';
                    const displayId = bookingData.id || docId.substring(0, 8);
                    if (confirm(`Are you sure you want to permanently delete booking ${displayId} for ${clientName}? This cannot be undone.`)) {
                        deleteBooking(docId, btn);
                    }
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

    const targetBooking = allBookingsList.find(b => b.docId === docId) || currentNotifyBooking;
    if (targetBooking && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
        sendBookingStatusEmails(targetBooking, newStatus, customNote).catch(e => console.warn("Resend email dispatch error:", e));
    }

    return updateDoc(docRef, updateData)
        .then(() => {
            const statusLabels = {
                confirmed: 'approved & booked',
                completed: 'marked as completed',
                cancelled: 'declined & cancelled'
            };
            const channelMsg = channel && channel !== 'None (Status Only)' ? ` (WhatsApp notification opened)` : '';
            showToast(`Booking ${statusLabels[newStatus] || 'updated'}${channelMsg}! Email dispatched to client.`, 'success');
        })
        .catch(err => {
            console.error("Error updating booking status:", err);
            showToast(`Failed to update booking status. ${err.message || 'Please try again.'}`, 'error');
        });
}

function deleteBooking(docId, btnElement) {
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }
    const docRef = doc(db, "bookings", docId);
    deleteDoc(docRef)
        .then(() => {
            showToast('Booking deleted permanently.', 'info');
        })
        .catch(err => {
            console.error("Delete booking error:", err);
            showToast(`Failed to delete booking. ${err.message || 'Please try again.'}`, 'error');
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            }
        });
}

function updateBookingStatus(docId, newStatus, btnElement) {
    const docRef = doc(db, "bookings", docId);
    const targetBooking = allBookingsList.find(b => b.docId === docId);
    if (targetBooking && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
        sendBookingStatusEmails(targetBooking, newStatus).catch(e => console.warn("Resend email dispatch error:", e));
    }

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
/* ==========================================
   PORTFOLIO GALLERY: UPLOADER & DESIGNS MANAGER (CRUD)
   ========================================== */
let activeNailsFilter = 'all';

function initUploaderBehaviors() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('nail-file-input');
    const preview = document.getElementById('upload-preview');
    const uploadIcon = dropZone ? dropZone.querySelector('.upload-icon') : null;
    const text1 = dropZone ? dropZone.querySelector('p:nth-of-type(1)') : null;
    const text2 = dropZone ? dropZone.querySelector('p:nth-of-type(2)') : null;

    if (fileInput) {
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
                    if (preview) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    }
                    if (uploadIcon) uploadIcon.style.display = 'none';
                    if (text1) text1.style.display = 'none';
                    if (text2) text2.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const form = document.getElementById('nail-upload-form');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('nail-title').value.trim();
            const category = document.getElementById('nail-category').value;
            const file = fileInput ? fileInput.files[0] : null;

            if (!file) {
                showToast('Please select a nail photo to upload.', 'warning');
                return;
            }

            const btnPublish = document.getElementById('btn-submit-upload');
            const origText = btnPublish ? btnPublish.innerHTML : 'Publish to Gallery';
            if (btnPublish) {
                btnPublish.disabled = true;
                btnPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
            }
            
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressBar) progressBar.style.width = '0%';

            const fileRef = ref(storage, `nails/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressBar) progressBar.style.width = `${progress}%`;
                }, 
                (error) => {
                    console.error("Upload error:", error);
                    showToast('Upload failed. Please check your connection and try again.', 'error');
                    if (btnPublish) {
                        btnPublish.disabled = false;
                        btnPublish.innerHTML = origText;
                    }
                    if (progressContainer) progressContainer.style.display = 'none';
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
                            showToast('✨ Nail design published to the live gallery!', 'success');
                            
                            form.reset();
                            if (preview) {
                                preview.style.display = 'none';
                                preview.src = '';
                            }
                            if (uploadIcon) uploadIcon.style.display = 'block';
                            if (text1) text1.style.display = 'block';
                            if (text2) text2.style.display = 'block';
                            if (progressContainer) progressContainer.style.display = 'none';
                            if (progressBar) progressBar.style.width = '0%';
                        })
                        .catch(err => {
                            console.error("Firestore save error:", err);
                            showToast('Error saving nail metadata to database.', 'error');
                        })
                        .finally(() => {
                            if (btnPublish) {
                                btnPublish.disabled = false;
                                btnPublish.innerHTML = origText;
                            }
                        });
                    }).catch(err => {
                        console.error("Download URL error:", err);
                        showToast('Failed to get download URL. Try again.', 'error');
                        if (btnPublish) {
                            btnPublish.disabled = false;
                            btnPublish.innerHTML = origText;
                        }
                        if (progressContainer) progressContainer.style.display = 'none';
                    });
                }
            );
        });
    }

    // Filter Chips for Admin Gallery
    const filterChips = document.querySelectorAll('.admin-filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeNailsFilter = chip.getAttribute('data-category') || 'all';
            renderNailsGalleryManager();
        });
    });

    // Wire Edit Nail Modal
    const btnCloseEditNail = document.getElementById('btn-close-edit-nail-modal');
    const btnCancelEditNail = document.getElementById('btn-cancel-edit-nail');
    const editNailModal = document.getElementById('edit-nail-modal');
    const editNailForm = document.getElementById('edit-nail-form');

    if (btnCloseEditNail) btnCloseEditNail.addEventListener('click', closeEditNailModal);
    if (btnCancelEditNail) btnCancelEditNail.addEventListener('click', closeEditNailModal);
    if (editNailModal) {
        editNailModal.addEventListener('click', (e) => {
            if (e.target === editNailModal) closeEditNailModal();
        });
    }

    if (editNailForm) {
        editNailForm.addEventListener('submit', handleSaveNailEdit);
    }

    // Seed / Reset Default Gallery Designs Button
    const btnSeedNails = document.getElementById('btn-seed-default-nails');
    if (btnSeedNails) {
        btnSeedNails.addEventListener('click', async () => {
            const confirmed = confirm("Reset the portfolio gallery to the 4 default designs (Gel, Acrylic, Chrome, Nail Art)?");
            if (!confirmed) return;

            const origHtml = btnSeedNails.innerHTML;
            btnSeedNails.disabled = true;
            btnSeedNails.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';

            try {
                await seedDefaultNails(true);
                showToast('✨ Default nail gallery designs restored!', 'success');
            } catch (err) {
                console.error("Reset nails error:", err);
                showToast('Failed to reset gallery. Please try again.', 'error');
            } finally {
                btnSeedNails.disabled = false;
                btnSeedNails.innerHTML = origHtml;
            }
        });
    }
}

async function seedDefaultNails(force = false) {
    const promises = [];
    DEFAULT_NAILS.forEach(nail => {
        const { docId, ...data } = nail;
        promises.push(setDoc(doc(db, "nails", docId), data, { merge: true }));
    });
    await Promise.all(promises);
    nailsList = [...DEFAULT_NAILS];
    updateStats();
    renderNailsGalleryManager();
}

function renderNailsGalleryManager() {
    const grid = document.getElementById('admin-gallery-grid');
    const badge = document.getElementById('admin-gallery-count-badge');
    const statGallery = document.getElementById('stat-gallery-count');
    
    if (statGallery) statGallery.innerText = nailsList.length;
    if (badge) badge.innerText = `${nailsList.length} design${nailsList.length === 1 ? '' : 's'}`;

    if (!grid) return;

    let filtered = nailsList;
    if (activeNailsFilter !== 'all') {
        filtered = nailsList.filter(n => (n.category || '').toLowerCase() === activeNailsFilter.toLowerCase());
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
                <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 2rem; color: var(--color-rose-gold); margin-bottom: 10px; display: block;"></i>
                <p style="font-size: 0.95rem; font-weight: 500; margin-bottom: 4px;">No nail designs found in this category</p>
                <p style="font-size: 0.8rem;">Upload a new nail photo above to publish it directly to your live portfolio.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    filtered.forEach(nail => {
        const card = document.createElement('div');
        card.className = 'admin-gallery-card';
        
        let catLabel = 'Gel';
        if (nail.category === 'acrylic') catLabel = 'Acrylic';
        else if (nail.category === 'chrome') catLabel = 'Chrome';
        else if (nail.category === 'art') catLabel = 'Custom Art';
        else if (nail.category) catLabel = nail.category.toUpperCase();

        const formattedDate = nail.createdAt?.toDate ? nail.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Added';

        card.innerHTML = `
            <div class="admin-gallery-thumb-wrapper">
                <img src="${nail.imageUrl || 'assets/hero.jpg'}" alt="${nail.title || 'Nail Design'}" class="admin-gallery-thumb" loading="lazy">
                <span class="admin-gallery-badge">${catLabel}</span>
            </div>
            <div class="admin-gallery-details">
                <div class="admin-gallery-title">${nail.title || 'Untitled Design'}</div>
                <div class="admin-gallery-meta"><i class="fa-regular fa-calendar"></i> ${formattedDate}</div>
                <div class="admin-gallery-actions">
                    <button type="button" class="btn-card-action edit btn-edit-nail" data-docid="${nail.docId}">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button type="button" class="btn-card-action delete btn-delete-nail" data-docid="${nail.docId}">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                </div>
            </div>
        `;

        const btnEdit = card.querySelector('.btn-edit-nail');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => openEditNailModal(nail.docId));
        }

        const btnDelete = card.querySelector('.btn-delete-nail');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => deleteNailDesign(nail.docId, nail.title));
        }

        grid.appendChild(card);
    });
}

function openEditNailModal(docId) {
    const nail = nailsList.find(n => n.docId === docId);
    if (!nail) return;

    const modal = document.getElementById('edit-nail-modal');
    const docIdInput = document.getElementById('edit-nail-docid');
    const titleInput = document.getElementById('edit-nail-title');
    const categorySelect = document.getElementById('edit-nail-category');
    const currentImg = document.getElementById('edit-nail-current-img');
    const fileInput = document.getElementById('edit-nail-file-input');
    const progressContainer = document.getElementById('edit-nail-progress-container');

    if (docIdInput) docIdInput.value = docId;
    if (titleInput) titleInput.value = nail.title || '';
    if (categorySelect) categorySelect.value = nail.category || 'gel';
    if (currentImg) currentImg.src = nail.imageUrl || 'assets/hero.jpg';
    if (fileInput) fileInput.value = '';
    if (progressContainer) progressContainer.style.display = 'none';

    if (modal) modal.style.display = 'flex';
}

function closeEditNailModal() {
    const modal = document.getElementById('edit-nail-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveNailEdit(e) {
    e.preventDefault();

    const docId = document.getElementById('edit-nail-docid')?.value;
    const newTitle = document.getElementById('edit-nail-title')?.value.trim();
    const newCategory = document.getElementById('edit-nail-category')?.value;
    const fileInput = document.getElementById('edit-nail-file-input');
    const newFile = fileInput?.files?.[0];

    if (!docId || !newTitle) {
        showToast('Please fill out the design title.', 'warning');
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-edit-nail');
    const origHtml = btnSubmit?.innerHTML || 'Save Changes';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    const progressContainer = document.getElementById('edit-nail-progress-container');
    const progressBar = document.getElementById('edit-nail-progress-bar');

    try {
        let updatedImageUrl = null;

        if (newFile) {
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressBar) progressBar.style.width = '0%';

            const fileRef = ref(storage, `nails/${Date.now()}_${newFile.name}`);
            const uploadTask = uploadBytesResumable(fileRef, newFile);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (progressBar) progressBar.style.width = `${progress}%`;
                    },
                    (err) => reject(err),
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then(url => {
                            updatedImageUrl = url;
                            resolve();
                        }).catch(reject);
                    }
                );
            });
        }

        const updateData = {
            title: newTitle,
            category: newCategory
        };
        if (updatedImageUrl) updateData.imageUrl = updatedImageUrl;

        await setDoc(doc(db, "nails", docId), updateData, { merge: true });

        // Update in memory list
        const idx = nailsList.findIndex(n => n.docId === docId);
        if (idx !== -1) {
            nailsList[idx].title = newTitle;
            nailsList[idx].category = newCategory;
            if (updatedImageUrl) nailsList[idx].imageUrl = updatedImageUrl;
        }

        showToast('✨ Nail design updated successfully!', 'success');
        closeEditNailModal();
        renderNailsGalleryManager();

    } catch (err) {
        console.error("Save nail edit error:", err);
        showToast(`Failed to update nail design: ${err.message || 'Error'}`, 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origHtml;
        }
        if (progressContainer) progressContainer.style.display = 'none';
    }
}

function deleteNailDesign(docId, title = 'this design') {
    const confirmed = confirm(`Are you sure you want to delete "${title}" from the gallery? This action cannot be undone.`);
    if (!confirmed) return;

    deleteDoc(doc(db, "nails", docId))
        .then(() => {
            nailsList = nailsList.filter(n => n.docId !== docId);
            updateStats();
            renderNailsGalleryManager();
            showToast(`🗑️ "${title}" deleted from the gallery.`, 'info');
        })
        .catch(err => {
            console.error("Delete nail error:", err);
            showToast(`Failed to delete design: ${err.message || 'Error'}`, 'error');
        });
}

/* ==========================================
   CMS: SERVICES & ADD-ONS PRICING MANAGER (CRUD)
   ========================================== */

async function seedDefaultServicesAndAddons(force = false) {
    const promises = [];
    DEFAULT_SERVICES.forEach(service => {
        const { docId, ...data } = service;
        promises.push(setDoc(doc(db, "services", docId), data, { merge: true }));
    });
    DEFAULT_ADDONS.forEach(addon => {
        const { docId, ...data } = addon;
        promises.push(setDoc(doc(db, "addons", docId), data, { merge: true }));
    });
    await Promise.all(promises);
    servicesList = [...DEFAULT_SERVICES];
    addonsList = [...DEFAULT_ADDONS];
    renderServicesPricingEditor();
    renderAddonsPricingEditor();
}

function initCMSBehaviors() {
    // Initial immediate renders
    renderServicesPricingEditor();
    renderAddonsPricingEditor();

    // Check & auto-seed services if DB is completely empty
    getDocs(collection(db, "services")).then(snapshot => {
        if (snapshot.empty) {
            seedDefaultServicesAndAddons().then(() => {
                showToast('✨ Default services loaded into database.', 'info');
            }).catch(err => console.warn("Seed error:", err));
        }
    }).catch(err => console.warn("Services check error:", err));

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

    // --- Seed / Reset Default Prices Button ---
    const btnSeedPrices = document.getElementById('btn-seed-default-prices');
    if (btnSeedPrices) {
        btnSeedPrices.addEventListener('click', async () => {
            const confirmed = confirm("Reset all service and add-on prices to studio defaults (Gel R45, Acrylic R65, Chrome R55, Art R75)?");
            if (!confirmed) return;

            const origHtml = btnSeedPrices.innerHTML;
            btnSeedPrices.disabled = true;
            btnSeedPrices.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';

            try {
                await seedDefaultServicesAndAddons(true);
                showToast('✨ Default services and add-ons loaded successfully!', 'success');
            } catch (err) {
                console.error("Reset prices error:", err);
                showToast('Failed to reset prices. Please try again.', 'error');
            } finally {
                btnSeedPrices.disabled = false;
                btnSeedPrices.innerHTML = origHtml;
            }
        });
    }

    // --- Service Modal Triggers ---
    const btnOpenAddService = document.getElementById('btn-open-add-service-modal');
    const btnCloseServiceModal = document.getElementById('btn-close-service-modal');
    const btnCancelServiceModal = document.getElementById('btn-cancel-service-modal');
    const serviceModal = document.getElementById('service-modal');
    const serviceForm = document.getElementById('service-form');

    if (btnOpenAddService) btnOpenAddService.addEventListener('click', openAddServiceModal);
    if (btnCloseServiceModal) btnCloseServiceModal.addEventListener('click', closeServiceModal);
    if (btnCancelServiceModal) btnCancelServiceModal.addEventListener('click', closeServiceModal);
    if (serviceModal) {
        serviceModal.addEventListener('click', (e) => {
            if (e.target === serviceModal) closeServiceModal();
        });
    }
    if (serviceForm) serviceForm.addEventListener('submit', handleSaveServiceModal);

    // --- Add-on Modal Triggers ---
    const btnOpenAddAddon = document.getElementById('btn-open-add-addon-modal');
    const btnCloseAddonModal = document.getElementById('btn-close-addon-modal');
    const btnCancelAddonModal = document.getElementById('btn-cancel-addon-modal');
    const addonModal = document.getElementById('addon-modal');
    const addonForm = document.getElementById('addon-form');

    if (btnOpenAddAddon) btnOpenAddAddon.addEventListener('click', openAddAddonModal);
    if (btnCloseAddonModal) btnCloseAddonModal.addEventListener('click', closeAddonModal);
    if (btnCancelAddonModal) btnCancelAddonModal.addEventListener('click', closeAddonModal);
    if (addonModal) {
        addonModal.addEventListener('click', (e) => {
            if (e.target === addonModal) closeAddonModal();
        });
    }
    if (addonForm) addonForm.addEventListener('submit', handleSaveAddonModal);

    // --- Load Email Configuration ---
    getResendConfig().then(config => {
        const serviceInput = document.getElementById('emailjs-service-id');
        const templateInput = document.getElementById('emailjs-template-id');
        const publicInput = document.getElementById('emailjs-public-key');
        const adminEmailInput = document.getElementById('resend-admin-email');
        if (serviceInput && config.serviceId) serviceInput.value = config.serviceId;
        if (templateInput && config.templateId) templateInput.value = config.templateId;
        if (publicInput && config.publicKey) publicInput.value = config.publicKey;
        if (adminEmailInput && config.adminEmail) adminEmailInput.value = config.adminEmail;
    }).catch(err => console.warn("Email config load error:", err));

    // --- Save Email Settings Button ---
    const btnSaveEmailSettings = document.getElementById('btn-save-email-settings');
    if (btnSaveEmailSettings) {
        btnSaveEmailSettings.addEventListener('click', async () => {
            const serviceId = document.getElementById('emailjs-service-id')?.value || '';
            const templateId = document.getElementById('emailjs-template-id')?.value || '';
            const publicKey = document.getElementById('emailjs-public-key')?.value || '';
            const adminEmail = document.getElementById('resend-admin-email')?.value || '';

            const origHtml = btnSaveEmailSettings.innerHTML;
            btnSaveEmailSettings.disabled = true;
            btnSaveEmailSettings.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            try {
                await saveResendConfig({ serviceId, templateId, publicKey, adminEmail });
                showToast('Email notification settings saved successfully!', 'success');
            } catch (e) {
                console.error("Save email settings error:", e);
                showToast('Failed to save email settings.', 'error');
            } finally {
                btnSaveEmailSettings.disabled = false;
                btnSaveEmailSettings.innerHTML = origHtml;
            }
        });
    }

    // --- Test Email Button ---
    const btnTestEmail = document.getElementById('btn-test-resend-email');
    if (btnTestEmail) {
        btnTestEmail.addEventListener('click', async () => {
            const testTarget = prompt("Enter the email address to receive a test booking confirmation:", "ndivhuwovele5@gmail.com");
            if (!testTarget || !testTarget.includes('@')) return;

            const origHtml = btnTestEmail.innerHTML;
            btnTestEmail.disabled = true;
            btnTestEmail.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Test...';

            try {
                const testBooking = {
                    id: "NB-TEST",
                    clientName: "Test Guest",
                    clientEmail: testTarget.trim(),
                    clientPhone: "071 599 6931",
                    service: "Gel Manicure",
                    addons: ["Matte Top Coat"],
                    date: "2026-09-10",
                    time: "14:00",
                    totalPrice: 50,
                    notes: "This is a live test from Ndi's Nail Bar dashboard."
                };
                const res = await sendBookingCreatedEmails(testBooking);
                if (res.clientResult?.success || res.adminResult?.success) {
                    showToast(`✨ Test email delivered to ${testTarget.trim()} successfully!`, 'success');
                } else {
                    showToast(res.clientResult?.error || 'Could not send test email. Please verify credentials.', 'error');
                }
            } catch (err) {
                showToast(`Test failed: ${err.message || 'Error'}`, 'error');
            } finally {
                btnTestEmail.disabled = false;
                btnTestEmail.innerHTML = origHtml;
            }
        });
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

/* --- Services Pricing Editor & Actions --- */
function renderServicesPricingEditor() {
    const container = document.getElementById('services-pricing-list');
    if (!container) return;

    const listToRender = (servicesList && servicesList.length > 0) ? servicesList : DEFAULT_SERVICES;

    container.innerHTML = '';

    listToRender.forEach(service => {
        const row = document.createElement('div');
        row.className = 'pricing-edit-row';
        row.innerHTML = `
            <div class="pricing-edit-info">
                <span class="pricing-edit-category">${service.category || 'SERVICE'}</span>
                <span class="pricing-edit-name">${service.name}</span>
                ${service.description ? `<p style="font-size: 0.76rem; color: var(--color-text-muted); margin: 3px 0 0; font-weight: 300;">${service.description}</p>` : ''}
            </div>
            <div class="pricing-edit-controls">
                <label>Price (R)</label>
                <input type="number" class="pricing-input service-price-input" data-docid="${service.docId}" value="${service.price}" min="0" step="1">
                <label>Duration</label>
                <input type="number" class="pricing-input service-duration-input" data-docid="${service.docId}" value="${service.duration || 45}" min="5" step="5">
                <span class="duration-suffix">mins</span>
                <button type="button" class="btn-row-save btn-save-single-service" data-docid="${service.docId}" title="Save Price & Duration">
                    <i class="fa-solid fa-floppy-disk"></i> Save
                </button>
                <button type="button" class="btn-row-edit btn-edit-service-trigger" data-docid="${service.docId}" title="Edit Name & Description">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" class="btn-row-delete btn-delete-service-trigger" data-docid="${service.docId}" title="Delete Service">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        // Wire single save
        const btnSaveSingle = row.querySelector('.btn-save-single-service');
        if (btnSaveSingle) {
            btnSaveSingle.addEventListener('click', () => {
                saveSingleServicePrice(service.docId, btnSaveSingle);
            });
        }

        // Wire edit details modal
        const btnEditTrigger = row.querySelector('.btn-edit-service-trigger');
        if (btnEditTrigger) {
            btnEditTrigger.addEventListener('click', () => {
                openEditServiceModal(service.docId);
            });
        }

        // Wire delete
        const btnDeleteTrigger = row.querySelector('.btn-delete-service-trigger');
        if (btnDeleteTrigger) {
            btnDeleteTrigger.addEventListener('click', () => {
                deleteService(service.docId, service.name);
            });
        }

        container.appendChild(row);
    });
}

function openAddServiceModal() {
    const modal = document.getElementById('service-modal');
    const modalTitle = document.getElementById('service-modal-title');
    const docIdInput = document.getElementById('service-modal-docid');
    const nameInput = document.getElementById('service-modal-name');
    const catInput = document.getElementById('service-modal-category');
    const priceInput = document.getElementById('service-modal-price');
    const durationInput = document.getElementById('service-modal-duration');
    const descInput = document.getElementById('service-modal-desc');

    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-sparkles" style="color: var(--color-rose-gold-dark);"></i> Add New Service';
    if (docIdInput) docIdInput.value = '';
    if (nameInput) nameInput.value = '';
    if (catInput) catInput.value = 'SPECIALTY';
    if (priceInput) priceInput.value = '50';
    if (durationInput) durationInput.value = '45';
    if (descInput) descInput.value = '';

    if (modal) modal.style.display = 'flex';
}

function openEditServiceModal(docId) {
    const service = servicesList.find(s => s.docId === docId) || DEFAULT_SERVICES.find(s => s.docId === docId);
    if (!service) return;

    const modal = document.getElementById('service-modal');
    const modalTitle = document.getElementById('service-modal-title');
    const docIdInput = document.getElementById('service-modal-docid');
    const nameInput = document.getElementById('service-modal-name');
    const catInput = document.getElementById('service-modal-category');
    const priceInput = document.getElementById('service-modal-price');
    const durationInput = document.getElementById('service-modal-duration');
    const descInput = document.getElementById('service-modal-desc');

    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--color-rose-gold-dark);"></i> Edit Service Details';
    if (docIdInput) docIdInput.value = docId;
    if (nameInput) nameInput.value = service.name || '';
    if (catInput) catInput.value = service.category || 'SERVICE';
    if (priceInput) priceInput.value = service.price || 45;
    if (durationInput) durationInput.value = service.duration || 45;
    if (descInput) descInput.value = service.description || '';

    if (modal) modal.style.display = 'flex';
}

function closeServiceModal() {
    const modal = document.getElementById('service-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveServiceModal(e) {
    e.preventDefault();

    let docId = document.getElementById('service-modal-docid')?.value;
    const name = document.getElementById('service-modal-name')?.value.trim();
    const category = document.getElementById('service-modal-category')?.value.trim().toUpperCase() || 'SERVICE';
    const price = parseFloat(document.getElementById('service-modal-price')?.value);
    const duration = parseInt(document.getElementById('service-modal-duration')?.value) || 45;
    const description = document.getElementById('service-modal-desc')?.value.trim();

    if (!name || isNaN(price) || price < 0) {
        showToast('Please provide a valid service name and price.', 'warning');
        return;
    }

    if (!docId) {
        // Create deterministic slug id for new service
        docId = 'service_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    }

    const btnSubmit = document.getElementById('btn-submit-service-modal');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : 'Save Service';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    const serviceData = {
        name,
        category,
        price,
        duration,
        description,
        order: servicesList.length + 1
    };

    try {
        await setDoc(doc(db, "services", docId), serviceData, { merge: true });

        // Update in memory list
        const idx = servicesList.findIndex(s => s.docId === docId);
        if (idx !== -1) {
            servicesList[idx] = { docId, ...serviceData };
        } else {
            servicesList.push({ docId, ...serviceData });
        }
        servicesList.sort((a, b) => (a.order || 99) - (b.order || 99));

        showToast(`✨ Service "${name}" saved successfully!`, 'success');
        closeServiceModal();
        renderServicesPricingEditor();
    } catch (err) {
        console.error("Save service modal error:", err);
        showToast(`Failed to save service: ${err.message || 'Error'}`, 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origHtml;
        }
    }
}

function deleteService(docId, serviceName = 'this service') {
    const confirmed = confirm(`Are you sure you want to delete "${serviceName}" from your services? Clients will no longer see it.`);
    if (!confirmed) return;

    deleteDoc(doc(db, "services", docId))
        .then(() => {
            servicesList = servicesList.filter(s => s.docId !== docId);
            renderServicesPricingEditor();
            showToast(`🗑️ Service "${serviceName}" deleted.`, 'info');
        })
        .catch(err => {
            console.error("Delete service error:", err);
            showToast(`Failed to delete service: ${err.message || 'Error'}`, 'error');
        });
}

function saveSingleServicePrice(docId, btnElement) {
    const priceInput = document.querySelector(`.service-price-input[data-docid="${docId}"]`);
    const durationInput = document.querySelector(`.service-duration-input[data-docid="${docId}"]`);

    if (!priceInput) return;

    const newPrice = parseFloat(priceInput.value);
    const newDuration = durationInput ? parseInt(durationInput.value) : 45;

    if (isNaN(newPrice) || newPrice < 0) {
        showToast('Please enter a valid price amount.', 'warning');
        return;
    }

    const origHTML = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const existing = servicesList.find(s => s.docId === docId) || DEFAULT_SERVICES.find(s => s.docId === docId) || {};
    const updateData = {
        ...existing,
        price: newPrice,
        duration: isNaN(newDuration) ? (existing.duration || 45) : newDuration
    };
    delete updateData.docId;

    setDoc(doc(db, "services", docId), updateData, { merge: true })
        .then(() => {
            const index = servicesList.findIndex(s => s.docId === docId);
            if (index !== -1) {
                servicesList[index].price = newPrice;
                servicesList[index].duration = updateData.duration;
            }
            showToast('Service price updated successfully!', 'success');
            btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
            setTimeout(() => {
                btnElement.disabled = false;
                btnElement.innerHTML = origHTML;
            }, 1800);
        })
        .catch(err => {
            console.error("Save service price error:", err);
            showToast(`Failed to save price: ${err.message || 'Error'}`, 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = origHTML;
        });
}

/* --- Addons Pricing Editor & Actions --- */
function renderAddonsPricingEditor() {
    const container = document.getElementById('addons-pricing-list');
    if (!container) return;

    const listToRender = (addonsList && addonsList.length > 0) ? addonsList : DEFAULT_ADDONS;

    container.innerHTML = '';

    listToRender.forEach(addon => {
        const row = document.createElement('div');
        row.className = 'pricing-edit-row addon-row';
        row.innerHTML = `
            <div class="pricing-edit-info">
                <span class="pricing-edit-name">${addon.name}</span>
            </div>
            <div class="pricing-edit-controls">
                <label>Price (R)</label>
                <input type="number" class="pricing-input addon-price-input" data-docid="${addon.docId}" value="${addon.price}" min="0" step="1">
                <button type="button" class="btn-row-save btn-save-single-addon" data-docid="${addon.docId}" title="Save Price">
                    <i class="fa-solid fa-floppy-disk"></i> Save
                </button>
                <button type="button" class="btn-row-edit btn-edit-addon-trigger" data-docid="${addon.docId}" title="Edit Name">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" class="btn-row-delete btn-delete-addon-trigger" data-docid="${addon.docId}" title="Delete Add-on">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        // Wire single save
        const btnSaveSingle = row.querySelector('.btn-save-single-addon');
        if (btnSaveSingle) {
            btnSaveSingle.addEventListener('click', () => {
                saveSingleAddonPrice(addon.docId, btnSaveSingle);
            });
        }

        // Wire edit modal
        const btnEditTrigger = row.querySelector('.btn-edit-addon-trigger');
        if (btnEditTrigger) {
            btnEditTrigger.addEventListener('click', () => {
                openEditAddonModal(addon.docId);
            });
        }

        // Wire delete
        const btnDeleteTrigger = row.querySelector('.btn-delete-addon-trigger');
        if (btnDeleteTrigger) {
            btnDeleteTrigger.addEventListener('click', () => {
                deleteAddon(addon.docId, addon.name);
            });
        }

        container.appendChild(row);
    });
}

function openAddAddonModal() {
    const modal = document.getElementById('addon-modal');
    const modalTitle = document.getElementById('addon-modal-title');
    const docIdInput = document.getElementById('addon-modal-docid');
    const nameInput = document.getElementById('addon-modal-name');
    const priceInput = document.getElementById('addon-modal-price');

    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-puzzle-piece" style="color: var(--color-rose-gold-dark);"></i> Add New Add-on';
    if (docIdInput) docIdInput.value = '';
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '10';

    if (modal) modal.style.display = 'flex';
}

function openEditAddonModal(docId) {
    const addon = addonsList.find(a => a.docId === docId) || DEFAULT_ADDONS.find(a => a.docId === docId);
    if (!addon) return;

    const modal = document.getElementById('addon-modal');
    const modalTitle = document.getElementById('addon-modal-title');
    const docIdInput = document.getElementById('addon-modal-docid');
    const nameInput = document.getElementById('addon-modal-name');
    const priceInput = document.getElementById('addon-modal-price');

    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--color-rose-gold-dark);"></i> Edit Add-on Name';
    if (docIdInput) docIdInput.value = docId;
    if (nameInput) nameInput.value = addon.name || '';
    if (priceInput) priceInput.value = addon.price || 10;

    if (modal) modal.style.display = 'flex';
}

function closeAddonModal() {
    const modal = document.getElementById('addon-modal');
    if (modal) modal.style.display = 'none';
}

async function handleSaveAddonModal(e) {
    e.preventDefault();

    let docId = document.getElementById('addon-modal-docid')?.value;
    const name = document.getElementById('addon-modal-name')?.value.trim();
    const price = parseFloat(document.getElementById('addon-modal-price')?.value);

    if (!name || isNaN(price) || price < 0) {
        showToast('Please enter a valid add-on name and price.', 'warning');
        return;
    }

    if (!docId) {
        docId = 'addon_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    }

    const btnSubmit = document.getElementById('btn-submit-addon-modal');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : 'Save Add-on';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    const addonData = { name, price };

    try {
        await setDoc(doc(db, "addons", docId), addonData, { merge: true });

        const idx = addonsList.findIndex(a => a.docId === docId);
        if (idx !== -1) {
            addonsList[idx] = { docId, ...addonData };
        } else {
            addonsList.push({ docId, ...addonData });
        }

        showToast(`✨ Add-on "${name}" saved successfully!`, 'success');
        closeAddonModal();
        renderAddonsPricingEditor();
    } catch (err) {
        console.error("Save addon modal error:", err);
        showToast(`Failed to save add-on: ${err.message || 'Error'}`, 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origHtml;
        }
    }
}

function deleteAddon(docId, addonName = 'this add-on') {
    const confirmed = confirm(`Are you sure you want to delete "${addonName}" from your add-ons?`);
    if (!confirmed) return;

    deleteDoc(doc(db, "addons", docId))
        .then(() => {
            addonsList = addonsList.filter(a => a.docId !== docId);
            renderAddonsPricingEditor();
            showToast(`🗑️ Add-on "${addonName}" deleted.`, 'info');
        })
        .catch(err => {
            console.error("Delete addon error:", err);
            showToast(`Failed to delete add-on: ${err.message || 'Error'}`, 'error');
        });
}

function saveSingleAddonPrice(docId, btnElement) {
    const priceInput = document.querySelector(`.addon-price-input[data-docid="${docId}"]`);
    if (!priceInput) return;

    const newPrice = parseFloat(priceInput.value);
    if (isNaN(newPrice) || newPrice < 0) {
        showToast('Please enter a valid price amount.', 'warning');
        return;
    }

    const origHTML = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const existing = addonsList.find(a => a.docId === docId) || DEFAULT_ADDONS.find(a => a.docId === docId) || {};
    const updateData = {
        ...existing,
        price: newPrice
    };
    delete updateData.docId;

    setDoc(doc(db, "addons", docId), updateData, { merge: true })
        .then(() => {
            const index = addonsList.findIndex(a => a.docId === docId);
            if (index !== -1) {
                addonsList[index].price = newPrice;
            }
            showToast('Add-on price updated successfully!', 'success');
            btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
            setTimeout(() => {
                btnElement.disabled = false;
                btnElement.innerHTML = origHTML;
            }, 1800);
        })
        .catch(err => {
            console.error("Save addon price error:", err);
            showToast(`Failed to save price: ${err.message || 'Error'}`, 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = origHTML;
        });
}

/* --- Save All Prices --- */
function saveAllPrices() {
    const savePricesBtn = document.getElementById('btn-save-prices');
    const origText = savePricesBtn ? savePricesBtn.innerHTML : 'Save All Prices';
    if (savePricesBtn) {
        savePricesBtn.disabled = true;
        savePricesBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving All Prices...';
    }

    const promises = [];

    // Update service prices
    document.querySelectorAll('.service-price-input').forEach(input => {
        const docId = input.getAttribute('data-docid');
        const newPrice = parseFloat(input.value);
        
        // Find matching duration input
        const durationInput = document.querySelector(`.service-duration-input[data-docid="${docId}"]`);
        const newDuration = durationInput ? parseInt(durationInput.value) : 45;

        if (!isNaN(newPrice) && newPrice >= 0 && docId) {
            const existing = servicesList.find(s => s.docId === docId) || DEFAULT_SERVICES.find(s => s.docId === docId) || {};
            const updateData = {
                ...existing,
                price: newPrice,
                duration: isNaN(newDuration) ? (existing.duration || 45) : newDuration
            };
            delete updateData.docId;

            promises.push(
                setDoc(doc(db, "services", docId), updateData, { merge: true })
            );
        }
    });

    // Update addon prices
    document.querySelectorAll('.addon-price-input').forEach(input => {
        const docId = input.getAttribute('data-docid');
        const newPrice = parseFloat(input.value);

        if (!isNaN(newPrice) && newPrice >= 0 && docId) {
            const existing = addonsList.find(a => a.docId === docId) || DEFAULT_ADDONS.find(a => a.docId === docId) || {};
            const updateData = {
                ...existing,
                price: newPrice
            };
            delete updateData.docId;

            promises.push(
                setDoc(doc(db, "addons", docId), updateData, { merge: true })
            );
        }
    });

    Promise.all(promises)
        .then(() => {
            showToast(`All prices saved successfully! (${promises.length} items updated)`, 'success');
        })
        .catch(err => {
            console.error("Price save error:", err);
            showToast(`Failed to save some prices. ${err.message || 'Try again.'}`, 'error');
        })
        .finally(() => {
            if (savePricesBtn) {
                savePricesBtn.disabled = false;
                savePricesBtn.innerHTML = origText;
            }
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

// Wire QR Scanner, Uploader, and CMS Editors during initialization
initAdminQRScanner();
initUploaderBehaviors();
initCMSBehaviors();
renderServicesPricingEditor();
renderAddonsPricingEditor();
renderNailsGalleryManager();
checkUrlScanCompletion();

