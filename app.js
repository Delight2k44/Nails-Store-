/* ==========================================
   NDI'S NAIL BAR - INTERACTIVE FRONTEND LOGIC
   (CONNECTED TO FIREBASE CLOUD SERVICES)
   ========================================== */

import { db } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPortfolioFilter();
    initBookingWizard();
    initReviewsSystem();
});

/* ==========================================
   1. NAVIGATION & RESPONSIVENESS
   ========================================== */
function initNavigation() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle && navbar) {
        mobileToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (navbar.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    // Smooth navigation active states
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.pageYOffset + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Close menu on nav link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-bars';
        });
    });
}

/* ==========================================
   2. PORTFOLIO GALLERY FILTERS (FIRESTORE DRIVEN)
   ========================================== */
const defaultNails = [
    {
        title: "Sculpted Rose Gold Foil",
        category: "acrylic",
        imageUrl: "assets/acrylic.jpg"
    },
    {
        title: "Lavender & Blush Ombré",
        category: "gel",
        imageUrl: "assets/gel.jpg"
    },
    {
        title: "Glossy Rose Gold Shimmer",
        category: "chrome",
        imageUrl: "assets/chrome.jpg"
    },
    {
        title: "White Lace Floral Details",
        category: "art",
        imageUrl: "assets/art.jpg"
    }
];

function initPortfolioFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Filter Buttons Click Routing
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyActiveFilter();
        });
    });

    // Listen for Nail Designs in Firestore in real-time
    const nailsQuery = query(collection(db, "nails"), orderBy("createdAt", "desc"));
    onSnapshot(nailsQuery, (snapshot) => {
        let nails = [];
        snapshot.forEach(doc => {
            nails.push(doc.data());
        });

        // Fall back to default mock nails if Firestore collection is empty
        if (nails.length === 0) {
            nails = defaultNails;
        }

        renderPortfolioGrid(nails);
    }, (err) => {
        console.warn("Nails fetch error: falling back to defaults.", err);
        renderPortfolioGrid(defaultNails);
    });
}

function renderPortfolioGrid(nails) {
    const gridContainer = document.querySelector('.portfolio-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    nails.forEach(nail => {
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        item.setAttribute('data-category', nail.category);
        
        const categoryLabels = {
            gel: "Gel Manicure",
            acrylic: "Acrylic Extensions",
            chrome: "Glazed Chrome",
            art: "Nail Art"
        };
        const label = categoryLabels[nail.category] || "Nail Art";

        item.innerHTML = `
            <div class="portfolio-image-wrapper">
                <img src="${nail.imageUrl}" alt="${nail.title}" class="portfolio-img" loading="lazy">
                <div class="portfolio-overlay">
                    <span class="item-tag">${label}</span>
                    <h4 class="item-title">${nail.title}</h4>
                </div>
            </div>
        `;
        gridContainer.appendChild(item);
    });

    // Re-apply filter tags
    applyActiveFilter();
}

function applyActiveFilter() {
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    if (!activeFilterBtn) return;

    const filterValue = activeFilterBtn.getAttribute('data-filter');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    portfolioItems.forEach(item => {
        const category = item.getAttribute('data-category');
        
        if (filterValue === 'all' || category === filterValue) {
            item.style.display = 'block';
            setTimeout(() => {
                item.style.transform = 'scale(1)';
                item.style.opacity = '1';
            }, 50);
        } else {
            item.style.transform = 'scale(0.8)';
            item.style.opacity = '0';
            setTimeout(() => {
                item.style.display = 'none';
            }, 300);
        }
    });
}

/* ==========================================
   3. MULTI-STEP BOOKING WIZARD (FIRESTORE DRIVEN)
   ========================================== */
function initBookingWizard() {
    const bookingForm = document.getElementById('booking-form');
    const successBox = document.getElementById('success-box');
    const steps = document.querySelectorAll('.booking-step');
    const indicators = document.querySelectorAll('.step-indicator');
    
    // Step Elements
    const serviceSelect = document.getElementById('booking-service');
    const dateInput = document.getElementById('booking-date');
    const slotsGrid = document.getElementById('slots-grid');
    const clientNameInput = document.getElementById('client-name');
    const clientEmailInput = document.getElementById('client-email');
    const clientPhoneInput = document.getElementById('client-phone');
    
    // Navigation Buttons
    const btnToStep2 = document.getElementById('btn-to-step2');
    const btnToStep3 = document.getElementById('btn-to-step3');
    const btnBackToStep1 = document.getElementById('btn-back-to-step1');
    const btnBackToStep2 = document.getElementById('btn-back-to-step2');
    const btnReset = document.getElementById('btn-reset-booking');

    // Quick Book buttons in pricing section
    const quickBookBtns = document.querySelectorAll('.btn-service-book');

    let bookingState = {
        step: 1,
        serviceName: '',
        servicePrice: 0,
        addons: [],
        date: '',
        timeSlot: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        notes: '',
        totalPrice: 0
    };

    // Quick Book Action
    quickBookBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const service = btn.getAttribute('data-service');
            serviceSelect.value = service;
            serviceSelect.dispatchEvent(new Event('change'));
            
            document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
            goToStep(2);
        });
    });

    // Handle Service Changes and Checkbox Choices
    serviceSelect.addEventListener('change', () => {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        bookingState.serviceName = selectedOption.text.split(' - ')[0];
        bookingState.servicePrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
        updateInvoice();
    });

    // Monitor Addon checkboxes
    const addOnCheckboxes = document.querySelectorAll('input[name="addons"]');
    addOnCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            bookingState.addons = [];
            addOnCheckboxes.forEach(cb => {
                if (cb.checked) {
                    bookingState.addons.push({
                        name: cb.value,
                        price: parseFloat(cb.getAttribute('data-price'))
                    });
                }
            });
            updateInvoice();
        });
    });

    // Handle Date Selection and Time Slot Generation
    dateInput.addEventListener('change', () => {
        const dateValue = new Date(dateInput.value);
        const day = dateValue.getDay(); 

        slotsGrid.innerHTML = '';
        bookingState.date = dateInput.value;
        bookingState.timeSlot = ''; // reset slot selection

        if (isNaN(day)) {
            slotsGrid.innerHTML = '<span class="no-date-msg">Please select a valid date first</span>';
            return;
        }

        // Salon is closed Sunday (0) and Monday (1)
        if (day === 0 || day === 1) {
            slotsGrid.innerHTML = '<span class="no-date-msg closed-error"><i class="fa-solid fa-circle-exclamation"></i> The salon is closed on Sundays and Mondays. Please select Tuesday - Saturday.</span>';
            return;
        }

        // Generate mock slots for Tuesday - Saturday
        const slots = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];
        
        slots.forEach((slot, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.innerText = slot;

            // Randomly flag a slot as already booked to make it realistic
            const isBooked = index > 1 && Math.random() < 0.35;
            if (isBooked) {
                btn.disabled = true;
                btn.style.opacity = '0.35';
                btn.style.cursor = 'not-allowed';
                btn.innerText += ' (Booked)';
            } else {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    bookingState.timeSlot = slot;
                    updateInvoice();
                });
            }

            slotsGrid.appendChild(btn);
        });
    });

    // Invoice updates
    function updateInvoice() {
        const invoiceService = document.getElementById('invoice-service-name');
        const invoiceServicePrice = document.getElementById('invoice-service-price');
        const invoiceAddons = document.getElementById('invoice-addons-list');
        const invoiceTotal = document.getElementById('invoice-total-amount');
        const invoiceDate = document.getElementById('invoice-date');
        const invoiceTime = document.getElementById('invoice-time');

        invoiceService.innerText = bookingState.serviceName || 'Service: None Selected';
        invoiceServicePrice.innerText = `$${bookingState.servicePrice.toFixed(2)}`;

        invoiceAddons.innerHTML = '';
        let addonsTotal = 0;
        bookingState.addons.forEach(addon => {
            addonsTotal += addon.price;
            const item = document.createElement('div');
            item.className = 'invoice-addon-item';
            item.innerHTML = `<span>+ ${addon.name}</span><span>+$${addon.price.toFixed(2)}</span>`;
            invoiceAddons.appendChild(item);
        });

        bookingState.totalPrice = bookingState.servicePrice + addonsTotal;
        invoiceTotal.innerText = `$${bookingState.totalPrice.toFixed(2)}`;

        invoiceDate.innerText = bookingState.date || '--';
        invoiceTime.innerText = bookingState.timeSlot || '--';
    }

    // Step Transition Validator
    function goToStep(targetStep) {
        if (targetStep > bookingState.step) {
            if (bookingState.step === 1 && !serviceSelect.value) {
                alert('Please select a primary service to proceed.');
                return;
            }
            if (bookingState.step === 2) {
                if (!bookingState.date) {
                    alert('Please select a date.');
                    return;
                }
                if (!bookingState.timeSlot) {
                    alert('Please choose an available time slot.');
                    return;
                }
            }
        }

        steps.forEach(stepBox => stepBox.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active', 'completed'));

        bookingState.step = targetStep;
        document.getElementById(`step-${targetStep}-content`).classList.add('active');

        indicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            if (stepNum === targetStep) {
                indicator.classList.add('active');
            } else if (stepNum < targetStep) {
                indicator.classList.add('completed');
            }
        });
    }

    btnToStep2.addEventListener('click', () => goToStep(2));
    btnToStep3.addEventListener('click', () => goToStep(3));
    btnBackToStep1.addEventListener('click', () => goToStep(1));
    btnBackToStep2.addEventListener('click', () => goToStep(2));

    // Submit Booking to Firestore
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!clientNameInput.value.trim()) {
            alert('Please enter your full name.');
            return;
        }
        if (!clientEmailInput.value.trim() || !clientEmailInput.checkValidity()) {
            alert('Please enter a valid email address.');
            return;
        }
        if (!clientPhoneInput.value.trim()) {
            alert('Please enter your phone number.');
            return;
        }

        bookingState.clientName = clientNameInput.value.trim();
        bookingState.clientEmail = clientEmailInput.value.trim();
        bookingState.clientPhone = clientPhoneInput.value.trim();
        bookingState.notes = document.getElementById('client-notes').value.trim();

        const btnSubmit = document.getElementById('btn-submit-booking');
        const origText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reserving Slot...';

        const bookingId = 'NB-' + Math.floor(10000 + Math.random() * 90000);
        
        const bookingData = {
            id: bookingId,
            clientName: bookingState.clientName,
            clientEmail: bookingState.clientEmail,
            clientPhone: bookingState.clientPhone,
            service: bookingState.serviceName,
            addons: bookingState.addons.map(a => a.name),
            date: bookingState.date,
            time: bookingState.timeSlot,
            totalPrice: bookingState.totalPrice,
            notes: bookingState.notes,
            status: "pending", // Starts as pending
            createdAt: Timestamp.now()
        };

        // Write to Firestore Database
        addDoc(collection(db, "bookings"), bookingData)
            .then(() => {
                // Success: update receipt details
                document.getElementById('ticket-client-name').innerText = bookingState.clientName;
                document.getElementById('ticket-id').innerText = bookingId;
                document.getElementById('ticket-service').innerText = bookingState.serviceName + (bookingState.addons.length ? ` (+${bookingState.addons.length} Add-ons)` : '');
                document.getElementById('ticket-datetime').innerText = `${bookingState.date} @ ${bookingState.timeSlot}`;
                document.getElementById('ticket-price').innerText = `$${bookingState.totalPrice.toFixed(2)}`;

                // Render success screens
                bookingForm.style.display = 'none';
                document.querySelector('.stepper').style.display = 'none';
                successBox.classList.add('active');
            })
            .catch(err => {
                console.error("Booking submit failed:", err);
                alert("We ran into a database error saving your appointment slot. Please try again.");
            })
            .finally(() => {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = origText;
            });
    });

    // Reset Booking Wizard
    btnReset.addEventListener('click', () => {
        bookingForm.reset();
        bookingState = {
            step: 1,
            serviceName: '',
            servicePrice: 0,
            addons: [],
            date: '',
            timeSlot: '',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            notes: '',
            totalPrice: 0
        };

        addOnCheckboxes.forEach(cb => cb.checked = false);
        slotsGrid.innerHTML = '<span class="no-date-msg">Please select a valid date first</span>';
        updateInvoice();
        
        successBox.classList.remove('active');
        bookingForm.style.display = 'flex';
        document.querySelector('.stepper').style.display = 'flex';
        goToStep(1);
    });
}

/* ==========================================
   4. RATINGS & REVIEWS (FIRESTORE DRIVEN)
   ========================================== */
const defaultReviews = [
    {
        name: 'Sophia Alvarez',
        rating: 5,
        content: "Ndi is an absolute magician! I got the glazed chrome gel manicure and the shimmer is perfect. The studio is extremely clean and welcoming.",
        date: 'Aug 12, 2026'
    },
    {
        name: 'Keira Knight',
        rating: 5,
        content: "My acrylic full set looks incredibly natural. Ndi paid such close attention to the length and custom gold foil styling. Worth every single penny!",
        date: 'Aug 08, 2026'
    },
    {
        name: 'Mila Kunis',
        rating: 4,
        content: "Beautiful custom line art! Ndi is highly skilled. The session ran about 10 minutes over but the quality and precision made up for it. Highly recommend.",
        date: 'Jul 30, 2026'
    }
];

function initReviewsSystem() {
    const reviewForm = document.getElementById('review-form');
    const reviewText = document.getElementById('review-text');
    const authorNameInput = document.getElementById('review-author-name');
    const feedContainer = document.getElementById('reviews-feed-container');
    const starsSelector = document.getElementById('star-rating-selector');

    let currentFormRating = 5;

    // Star Select button routing
    if (starsSelector) {
        const starButtons = starsSelector.querySelectorAll('.star-select-btn');
        starButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.getAttribute('data-rating'));
                currentFormRating = rating;

                starButtons.forEach(b => {
                    const bRating = parseInt(b.getAttribute('data-rating'));
                    const icon = b.querySelector('i');
                    
                    if (bRating <= rating) {
                        b.classList.add('active');
                        icon.className = 'fa-solid fa-star';
                    } else {
                        b.classList.remove('active');
                        icon.className = 'fa-regular fa-star';
                    }
                });
            });
        });
    }

    // Watch Approved Reviews in Firestore (Real-time update)
    const reviewsQuery = query(
        collection(db, "reviews"), 
        where("status", "==", "approved"), 
        orderBy("createdAt", "desc")
    );

    onSnapshot(reviewsQuery, (snapshot) => {
        let reviewsList = [];
        snapshot.forEach(doc => {
            reviewsList.push(doc.data());
        });

        // Fall back to default mock list if Firestore contains no reviews
        if (reviewsList.length === 0) {
            reviewsList = defaultReviews;
        }

        renderReviews(reviewsList);
        updateMetrics(reviewsList);
    }, (err) => {
        console.warn("Reviews watcher failed; using defaults.", err);
        renderReviews(defaultReviews);
        updateMetrics(defaultReviews);
    });

    // Submit Review Form
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = authorNameInput.value.trim();
        const content = reviewText.value.trim();

        if (!name || !content) return;

        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        const todayStr = new Date().toLocaleDateString('en-US', options);

        const btnSubmit = reviewForm.querySelector('.btn-submit-review');
        const origText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const newReview = {
            name: name,
            rating: currentFormRating,
            content: content,
            date: todayStr,
            status: "pending", // Moderate first!
            createdAt: Timestamp.now()
        };

        // Write new pending review to Firestore
        addDoc(collection(db, "reviews"), newReview)
            .then(() => {
                reviewForm.reset();
                resetStarSelector();
                alert('Thank you! Your rating and review has been submitted. It will show live on our page once Ndi moderates and approves it!');
            })
            .catch(err => {
                console.error("Review save failed:", err);
                alert("We ran into a database error submitting your review. Please try again.");
            })
            .finally(() => {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = origText;
            });
    });

    function resetStarSelector() {
        currentFormRating = 5;
        const starButtons = starsSelector.querySelectorAll('.star-select-btn');
        starButtons.forEach(b => {
            const rating = parseInt(b.getAttribute('data-rating'));
            const icon = b.querySelector('i');
            if (rating <= 5) {
                b.classList.add('active');
                icon.className = 'fa-solid fa-star';
            }
        });
    }

    function renderReviews(reviews) {
        feedContainer.innerHTML = '';
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
            card.className = 'review-card glass-panel';
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
                <p class="review-body">${review.content}</p>
            `;
            feedContainer.appendChild(card);
        });
    }

    function updateMetrics(reviews) {
        const avgValueText = document.getElementById('avg-rating-value');
        const avgStarsContainer = document.getElementById('avg-stars-container');
        const countText = document.getElementById('total-reviews-count');

        if (reviews.length === 0) return;

        const totalSum = reviews.reduce((sum, r) => sum + r.rating, 0);
        const average = (totalSum / reviews.length).toFixed(1);

        avgValueText.innerText = average;
        countText.innerText = `Based on ${reviews.length} review${reviews.length > 1 ? 's' : ''}`;

        avgStarsContainer.innerHTML = '';
        const roundAverage = Math.round(parseFloat(average));
        for (let i = 1; i <= 5; i++) {
            if (i <= roundAverage) {
                avgStarsContainer.innerHTML += '<i class="fa-solid fa-star"></i>';
            } else {
                avgStarsContainer.innerHTML += '<i class="fa-regular fa-star"></i>';
            }
        }

        // Breakdown percent calculations
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (counts[r.rating] !== undefined) counts[r.rating]++;
        });

        const breakdownRows = document.querySelectorAll('.breakdown-row');
        breakdownRows.forEach(row => {
            const starText = row.querySelector('span:first-child').innerText;
            const starNum = parseInt(starText.charAt(0)); 
            
            const count = counts[starNum] || 0;
            const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;

            row.querySelector('.progress-bar-fill').style.width = `${percentage}%`;
            row.querySelector('.breakdown-pct').innerText = `${percentage}%`;
        });
    }
}
