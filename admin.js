/* ==========================================
   NDI'S NAIL BAR - ADMIN DASHBOARD CONTROLLER
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

// Global Listeners Unsubscribe Functions (to clean up when logging out)
let unsubBookings = null;
let unsubPendingReviews = null;
let unsubAllReviews = null;
let unsubNails = null;

// Global Lists for stats calculation
let allBookingsList = [];
let approvedReviewsList = [];
let nailsList = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardWrapper = document.getElementById('dashboard-wrapper');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

// Initial Launch Auth Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Authenticated: show workspace, start watchers
        loginContainer.style.display = 'none';
        dashboardWrapper.classList.add('active');
        initDashboardData();
    } else {
        // Unauthenticated: clear variables, stop watchers, show login
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
            loginError.style.display = 'block';
        })
        .finally(() => {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnText;
        });
});

// Logout Handler
btnLogout.addEventListener('click', () => {
    signOut(auth).catch(err => console.error("SignOut error:", err));
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
    }
};

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const tabName = item.getAttribute('data-tab');
        
        // Update menu active highlights
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');

        // Show selected tab container
        tabContents.forEach(tc => tc.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update header descriptions
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
    const bookingsQuery = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
        allBookingsList = [];
        snapshot.forEach(doc => {
            allBookingsList.push({ id: doc.id, ...doc.data() });
        });
        
        // Update statistics and table displays
        updateStats();
        renderBookingsTable();
    }, (err) => console.error("Bookings stream error:", err));

    // 2. Real-time Pending Reviews Watcher
    const pendingReviewsQuery = query(collection(db, "reviews"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    unsubPendingReviews = onSnapshot(pendingReviewsQuery, (snapshot) => {
        const pendingReviews = [];
        snapshot.forEach(doc => {
            pendingReviews.push({ id: doc.id, ...doc.data() });
        });
        
        document.getElementById('stat-pending-bookings').innerText = allBookingsList.filter(b => b.status === 'pending').length;
        renderPendingReviews(pendingReviews);
    }, (err) => console.error("Pending reviews stream error:", err));

    // 3. Real-time Approved Reviews Watcher (for average stats)
    const approvedReviewsQuery = query(collection(db, "reviews"), where("status", "==", "approved"));
    unsubAllReviews = onSnapshot(approvedReviewsQuery, (snapshot) => {
        approvedReviewsList = [];
        snapshot.forEach(doc => {
            approvedReviewsList.push(doc.data());
        });
        updateStats();
    }, (err) => console.error("Approved reviews stream error:", err));

    // 4. Real-time Nails Portfolio Watcher (for gallery counts)
    const nailsQuery = collection(db, "nails");
    unsubNails = onSnapshot(nailsQuery, (snapshot) => {
        nailsList = [];
        snapshot.forEach(doc => {
            nailsList.push(doc.data());
        });
        updateStats();
    }, (err) => console.error("Nails list stream error:", err));

    // Initialize Uploader Form Behaviors
    initUploaderBehaviors();
}

function cleanupWatchers() {
    if (unsubBookings) unsubBookings();
    if (unsubPendingReviews) unsubPendingReviews();
    if (unsubAllReviews) unsubAllReviews();
    if (unsubNails) unsubNails();
}

/* ==========================================
   STATISTICS UPDATE ENGINE
   ========================================== */
function updateStats() {
    // Booking counts
    document.getElementById('stat-total-bookings').innerText = allBookingsList.length;
    document.getElementById('stat-pending-bookings').innerText = allBookingsList.filter(b => b.status === 'pending').length;
    
    // Gallery count
    document.getElementById('stat-gallery-count').innerText = nailsList.length;

    // Review averages
    if (approvedReviewsList.length > 0) {
        const totalStars = approvedReviewsList.reduce((sum, r) => sum + r.rating, 0);
        document.getElementById('stat-avg-rating').innerText = (totalStars / approvedReviewsList.length).toFixed(1);
    } else {
        document.getElementById('stat-avg-rating').innerText = "4.9"; // Fallback default
    }
}

/* ==========================================
   BOOKINGS MANAGEMENT RENDER & ACTIONS
   ========================================== */
const bookingsSearch = document.getElementById('booking-search');
const statusFilter = document.getElementById('booking-status-filter');
const bookingsTableBody = document.getElementById('bookings-table-body');

// Triggers for inputs
bookingsSearch.addEventListener('input', renderBookingsTable);
statusFilter.addEventListener('change', renderBookingsTable);

function renderBookingsTable() {
    const searchQuery = bookingsSearch.value.trim().toLowerCase();
    const activeFilter = statusFilter.value;

    bookingsTableBody.innerHTML = '';

    const filtered = allBookingsList.filter(booking => {
        const matchesSearch = booking.clientName.toLowerCase().includes(searchQuery);
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
        
        // Addons mapping to nice tag badges
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
                <button class="btn-icon confirm" title="Confirm Booking" data-id="${booking.id}">
                    <i class="fa-solid fa-check"></i>
                </button>
            `;
        }
        if (booking.status === 'confirmed') {
            actionsHTML += `
                <button class="btn-icon complete" title="Mark Completed" data-id="${booking.id}">
                    <i class="fa-solid fa-circle-check"></i>
                </button>
            `;
        }
        if (booking.status !== 'cancelled' && booking.status !== 'completed') {
            actionsHTML += `
                <button class="btn-icon cancel" title="Cancel Booking" data-id="${booking.id}">
                    <i class="fa-solid fa-ban"></i>
                </button>
            `;
        } else {
            actionsHTML = '<span style="color:var(--color-text-muted); font-size:0.8rem;">No actions</span>';
        }

        const dateFormatted = booking.date ? booking.date : '--';
        const timeFormatted = booking.time ? booking.time : '--';
        const priceFormatted = booking.totalPrice ? `$${parseFloat(booking.totalPrice).toFixed(2)}` : '$0.00';
        const notesFormatted = booking.notes ? booking.notes : '--';

        row.innerHTML = `
            <td class="bold">${booking.id}</td>
            <td>${booking.clientName}</td>
            <td>${booking.service}</td>
            <td><div class="addons-tags">${addonsHTML}</div></td>
            <td><strong>${dateFormatted}</strong><br><span style="font-size:0.75rem;">${timeFormatted}</span></td>
            <td class="bold accent-text">${priceFormatted}</td>
            <td class="booking-notes-col" title="${notesFormatted}">${notesFormatted}</td>
            <td><span class="status-badge ${booking.status}">${booking.status}</span></td>
            <td><div class="table-actions">${actionsHTML}</div></td>
        `;

        // Wire Action Click Triggers
        row.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const actionClass = btn.classList.contains('confirm') ? 'confirmed' : 
                                    btn.classList.contains('complete') ? 'completed' : 'cancelled';
                updateBookingStatus(id, actionClass);
            });
        });

        bookingsTableBody.appendChild(row);
    });
}

function updateBookingStatus(id, newStatus) {
    // Find matching firestore document. (Note: Booking documents key matches firebase id, or we queried by id field)
    // First find document reference in Firestore
    const bookingsRef = collection(db, "bookings");
    // We stored the Firestore document ID in the list, let's update it
    const docRef = doc(db, "bookings", id);
    updateDoc(docRef, { status: newStatus })
        .then(() => console.log(`Booking ${id} status updated to ${newStatus}`))
        .catch(err => console.error("Error updating status:", err));
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
                <button class="btn-mod-delete" data-id="${review.id}"><i class="fa-solid fa-trash-can"></i> Reject & Delete</button>
                <button class="btn-mod-approve" data-id="${review.id}"><i class="fa-solid fa-circle-check"></i> Approve & Publish</button>
            </div>
        `;

        // Action triggers
        card.querySelector('.btn-mod-approve').addEventListener('click', () => {
            approveReview(review.id);
        });
        card.querySelector('.btn-mod-delete').addEventListener('click', () => {
            if (confirm("Are you sure you want to delete this review request?")) {
                deleteReview(review.id);
            }
        });

        reviewsContainer.appendChild(card);
    });
}

function approveReview(id) {
    const docRef = doc(db, "reviews", id);
    updateDoc(docRef, { status: "approved" })
        .then(() => console.log(`Review ${id} approved`))
        .catch(err => console.error("Error approving review:", err));
}

function deleteReview(id) {
    const docRef = doc(db, "reviews", id);
    deleteDoc(docRef)
        .then(() => console.log(`Review ${id} deleted`))
        .catch(err => console.error("Error deleting review:", err));
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
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                // Hide texts/icons
                uploadIcon.style.display = 'none';
                text1.style.display = 'none';
                text2.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle form submissions
    const form = document.getElementById('nail-upload-form');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('nail-title').value.trim();
        const category = document.getElementById('nail-category').value;
        const file = fileInput.files[0];

        if (!file) {
            alert("Please select a nail photo to upload.");
            return;
        }

        const btnPublish = document.getElementById('btn-submit-upload');
        const origText = btnPublish.innerHTML;
        btnPublish.disabled = true;
        btnPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        // 1. Upload file to Firebase Storage
        const fileRef = ref(storage, `nails/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = `${progress}%`;
            }, 
            (error) => {
                console.error("Upload error:", error);
                alert("Nail photo upload failed. Please try again.");
                btnPublish.disabled = false;
                btnPublish.innerHTML = origText;
                progressContainer.style.display = 'none';
            }, 
            () => {
                // Upload complete, get URL
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    // 2. Save document to Firestore
                    addDoc(collection(db, "nails"), {
                        title: title,
                        category: category,
                        imageUrl: downloadURL,
                        createdAt: Timestamp.now()
                    })
                    .then(() => {
                        alert("Success! Nail design has been published to the gallery.");
                        
                        // Reset forms and elements
                        form.reset();
                        preview.style.display = 'none';
                        preview.src = '';
                        uploadIcon.style.display = 'block';
                        text1.style.display = 'block';
                        text2.style.display = 'block';
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                        
                        // Switch back to overview tab
                        document.querySelector('.menu-item[data-tab="overview"]').click();
                    })
                    .catch(err => {
                        console.error("Firestore save error:", err);
                        alert("Error saving nail metadata to database.");
                    })
                    .finally(() => {
                        btnPublish.disabled = false;
                        btnPublish.innerHTML = origText;
                    });
                });
            }
        );
    });
}
