/* ==========================================
   NDI'S NAIL BAR - ADMIN DASHBOARD CONTROLLER
   (with CMS: Pricing Editor & Layout Image Manager)
   ========================================== */

import { auth, db, storage } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
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
const btnLogout = document.getElementById('btn-logout');

// Initial Launch Auth Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginContainer.style.display = 'none';
        dashboardWrapper.classList.add('active');
        initDashboardData();
        showToast('Welcome back, Ndi!', 'success');
    } else {
        cleanupWatchers();
        dashboardWrapper.classList.remove('active');
        loginContainer.style.display = 'flex';
    }
});

// Admin Login Handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    const btnSubmit = loginForm.querySelector('button[type="submit"]');
    const origBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            loginForm.reset();
        })
        .catch((error) => {
            console.error("Auth error:", error);
            let errorMsg = 'Invalid email or password.';
            if (error.code === 'auth/user-not-found') errorMsg = 'No account found with this email.';
            else if (error.code === 'auth/wrong-password') errorMsg = 'Incorrect password. Please try again.';
            else if (error.code === 'auth/too-many-requests') errorMsg = 'Too many failed attempts. Please wait and try again.';
            else if (error.code === 'auth/network-request-failed') errorMsg = 'Network error. Check your internet connection.';
            
            loginError.querySelector('span') ? loginError.querySelector('span').innerText = errorMsg : loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${errorMsg}`;
            loginError.style.display = 'block';
            showToast(errorMsg, 'error');
        })
        .finally(() => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnText;
        });
});

// Logout Handler
btnLogout.addEventListener('click', () => {
    signOut(auth)
        .then(() => showToast('Signed out successfully.', 'info'))
        .catch(err => {
            console.error("SignOut error:", err);
            showToast('Sign out failed. Please try again.', 'error');
        });
});

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
                <button class="btn-icon confirm" title="Confirm Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-check"></i>
                </button>
            `;
        }
        if (booking.status === 'confirmed') {
            actionsHTML += `
                <button class="btn-icon complete" title="Mark Completed" data-docid="${booking.docId}">
                    <i class="fa-solid fa-circle-check"></i>
                </button>
            `;
        }
        if (booking.status !== 'cancelled' && booking.status !== 'completed') {
            actionsHTML += `
                <button class="btn-icon cancel" title="Cancel Booking" data-docid="${booking.docId}">
                    <i class="fa-solid fa-ban"></i>
                </button>
            `;
        } else {
            actionsHTML = '<span style="color:var(--color-text-muted); font-size:0.8rem;">No actions</span>';
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

        // Wire Action Click Triggers - using docId (Firestore document ID)
        row.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-docid');
                const actionClass = btn.classList.contains('confirm') ? 'confirmed' : 
                                    btn.classList.contains('complete') ? 'completed' : 'cancelled';
                
                // Disable button immediately to prevent double-clicks
                btn.disabled = true;
                btn.style.opacity = '0.5';
                
                updateBookingStatus(docId, actionClass, btn);
            });
        });

        bookingsTableBody.appendChild(row);
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
            // Re-enable button on failure
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
