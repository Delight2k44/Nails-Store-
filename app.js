/* ==========================================
   NDI'S NAIL BAR - INTERACTIVE FRONTEND LOGIC
   (CONNECTED TO FIREBASE CLOUD SERVICES)
   ========================================== */

import { db } from "./firebase-config.js";
import { 
    collection, 
    doc,
    addDoc, 
    getDocs,
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendBookingCreatedEmails } from "./email-service.js";

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPortfolioFilter();
    initBookingWizard();
    initReviewsSystem();
    initDynamicLayout();
    initBookingTracker();
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
   DYNAMIC LAYOUT: HERO & ABOUT IMAGES FROM FIRESTORE
   ========================================== */
function initDynamicLayout() {
    try {
        onSnapshot(doc(db, "settings", "layout"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Update Hero background image via CSS variable
                if (data.heroImageUrl) {
                    document.documentElement.style.setProperty(
                        '--hero-bg', 
                        `url('${data.heroImageUrl}')`
                    );
                }
                
                // Update About section image
                if (data.aboutImageUrl) {
                    const aboutImg = document.querySelector('.about-image img');
                    if (aboutImg) {
                        aboutImg.src = data.aboutImageUrl;
                    }
                }
            }
        }, (err) => {
            console.warn("Layout settings fetch error (non-critical):", err);
        });
    } catch (err) {
        console.warn("Layout init skipped:", err);
    }
}

/* ==========================================
   DYNAMIC SERVICES & ADDONS FROM FIRESTORE
   ========================================== */
function loadDynamicServices(onServicesLoaded) {
    try {
        const servicesQuery = query(collection(db, "services"), orderBy("order", "asc"));
        onSnapshot(servicesQuery, (snapshot) => {
            if (snapshot.empty) {
                // No services in DB yet — keep static HTML as fallback
                return;
            }
            
            const services = [];
            snapshot.forEach(docSnap => {
                services.push(docSnap.data());
            });

            // Render service cards in the pricing section
            renderServiceCards(services);
            // Update booking form dropdown
            renderBookingServiceOptions(services);
            
            if (onServicesLoaded) onServicesLoaded(services);
        }, (err) => {
            console.warn("Services fetch error (using static fallback):", err);
        });
    } catch (err) {
        console.warn("Services init skipped:", err);
    }
}

function loadDynamicAddons() {
    try {
        onSnapshot(collection(db, "addons"), (snapshot) => {
            if (snapshot.empty) return;
            
            const addons = [];
            snapshot.forEach(docSnap => {
                addons.push(docSnap.data());
            });

            renderBookingAddonOptions(addons);
        }, (err) => {
            console.warn("Addons fetch error (using static fallback):", err);
        });
    } catch (err) {
        console.warn("Addons init skipped:", err);
    }
}

function renderServiceCards(services) {
    const servicesGrid = document.querySelector('.services-grid');
    if (!servicesGrid) return;

    servicesGrid.innerHTML = '';

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="service-details">
                <span class="service-category">${service.category}</span>
                <h3 class="service-name">${service.name}</h3>
                <p class="service-description">${service.description}</p>
            </div>
            <div class="service-pricing">
                <span class="price">R${service.price}</span>
                <span class="duration"><i class="fa-regular fa-clock"></i> ${service.duration} mins</span>
                <button class="btn btn-service-book" data-service="${service.name}" data-price="${service.price}">Quick Book</button>
            </div>
        `;
        servicesGrid.appendChild(card);
    });

    // Re-wire quick book buttons for the booking wizard
    const quickBookBtns = servicesGrid.querySelectorAll('.btn-service-book');
    quickBookBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const serviceSelect = document.getElementById('booking-service');
            if (serviceSelect) {
                serviceSelect.value = btn.getAttribute('data-service');
                serviceSelect.dispatchEvent(new Event('change'));
                document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function renderBookingServiceOptions(services) {
    const serviceSelect = document.getElementById('booking-service');
    if (!serviceSelect) return;

    // Keep the first placeholder option
    const placeholder = serviceSelect.querySelector('option[disabled]');
    serviceSelect.innerHTML = '';
    if (placeholder) serviceSelect.appendChild(placeholder);

    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.name;
        option.setAttribute('data-price', service.price);
        option.textContent = `${service.name} - R${service.price} (${service.duration} mins)`;
        serviceSelect.appendChild(option);
    });
}

function renderBookingAddonOptions(addons) {
    const addonsGrid = document.querySelector('.addons-grid');
    if (!addonsGrid) return;

    addonsGrid.innerHTML = '';

    addons.forEach(addon => {
        const label = document.createElement('label');
        label.className = 'addon-card';
        label.innerHTML = `
            <input type="checkbox" name="addons" value="${addon.name}" data-price="${addon.price}">
            <span class="addon-name">${addon.name}</span>
            <span class="addon-price">+R${addon.price}</span>
        `;
        addonsGrid.appendChild(label);
    });

    // Re-wire addon checkboxes for invoice updates
    const event = new CustomEvent('addons-refreshed');
    document.dispatchEvent(event);
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

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyActiveFilter();
        });
    });

    try {
        const nailsQuery = collection(db, "nails");
        onSnapshot(nailsQuery, (snapshot) => {
            let nails = [];
            snapshot.forEach(docSnap => {
                nails.push({ docId: docSnap.id, ...docSnap.data() });
            });

            if (nails.length === 0) {
                nails = defaultNails;
            } else {
                nails.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });
            }

            renderPortfolioGrid(nails);
        }, (err) => {
            console.warn("Nails fetch error: falling back to defaults.", err);
            renderPortfolioGrid(defaultNails);
        });
    } catch (err) {
        console.warn("Nails snapshot init error:", err);
        renderPortfolioGrid(defaultNails);
    }
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
    
    const serviceSelect = document.getElementById('booking-service');
    const dateInput = document.getElementById('booking-date');
    const slotsGrid = document.getElementById('slots-grid');
    const clientNameInput = document.getElementById('client-name');
    const clientEmailInput = document.getElementById('client-email');
    const clientPhoneInput = document.getElementById('client-phone');
    
    const btnToStep2 = document.getElementById('btn-to-step2');
    const btnToStep3 = document.getElementById('btn-to-step3');
    const btnBackToStep1 = document.getElementById('btn-back-to-step1');
    const btnBackToStep2 = document.getElementById('btn-back-to-step2');
    const btnReset = document.getElementById('btn-reset-booking');

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

    // Load dynamic services and addons from Firestore
    loadDynamicServices();
    loadDynamicAddons();

    // Quick Book Action (initial static buttons - dynamic ones are wired in renderServiceCards)
    const quickBookBtns = document.querySelectorAll('.btn-service-book');
    quickBookBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.getAttribute('data-service');
            serviceSelect.value = service;
            serviceSelect.dispatchEvent(new Event('change'));
            
            document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
            goToStep(2);
        });
    });

    // Handle Service Changes
    serviceSelect.addEventListener('change', () => {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        bookingState.serviceName = selectedOption.text.split(' - ')[0];
        bookingState.servicePrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
        updateInvoice();
    });

    // Monitor Addon checkboxes (initial + refreshed)
    function wireAddonCheckboxes() {
        const addOnCheckboxes = document.querySelectorAll('input[name="addons"]');
        addOnCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                bookingState.addons = [];
                document.querySelectorAll('input[name="addons"]').forEach(cb => {
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
    }
    wireAddonCheckboxes();

    // Listen for dynamic addon refreshes from Firestore
    document.addEventListener('addons-refreshed', () => {
        wireAddonCheckboxes();
    });

    // Handle Date Selection and Time Slot Generation
    dateInput.addEventListener('change', () => {
        const dateValue = new Date(dateInput.value);
        const day = dateValue.getDay(); 

        slotsGrid.innerHTML = '';
        bookingState.date = dateInput.value;
        bookingState.timeSlot = '';

        if (isNaN(day)) {
            slotsGrid.innerHTML = '<span class="no-date-msg">Please select a valid date first</span>';
            return;
        }

        if (day === 0 || day === 1) {
            slotsGrid.innerHTML = '<span class="no-date-msg closed-error"><i class="fa-solid fa-circle-exclamation"></i> The salon is closed on Sundays and Mondays. Please select Tuesday - Saturday.</span>';
            return;
        }

        const slots = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];
        
        slots.forEach((slot, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.innerText = slot;

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
        invoiceServicePrice.innerText = `R${bookingState.servicePrice.toFixed(2)}`;

        invoiceAddons.innerHTML = '';
        let addonsTotal = 0;
        bookingState.addons.forEach(addon => {
            addonsTotal += addon.price;
            const item = document.createElement('div');
            item.className = 'invoice-addon-item';
            item.innerHTML = `<span>+ ${addon.name}</span><span>+R${addon.price.toFixed(2)}</span>`;
            invoiceAddons.appendChild(item);
        });

        bookingState.totalPrice = bookingState.servicePrice + addonsTotal;
        invoiceTotal.innerText = `R${bookingState.totalPrice.toFixed(2)}`;

        invoiceDate.innerText = bookingState.date || '--';
        invoiceTime.innerText = bookingState.timeSlot || '--';
    }

    // Step Transition
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
            status: "pending",
            createdAt: Timestamp.now()
        };

        addDoc(collection(db, "bookings"), bookingData)
            .then(() => {
                document.getElementById('ticket-client-name').innerText = bookingState.clientName;
                document.getElementById('ticket-id').innerText = bookingId;
                document.getElementById('ticket-service').innerText = bookingState.serviceName + (bookingState.addons.length ? ` (+${bookingState.addons.length} Add-ons)` : '');
                document.getElementById('ticket-datetime').innerText = `${bookingState.date} @ ${bookingState.timeSlot}`;
                document.getElementById('ticket-price').innerText = `R${bookingState.totalPrice.toFixed(2)}`;

                // Make ticket box visible first so QR & canvas can render
                bookingForm.style.display = 'none';
                const stepper = document.querySelector('.stepper');
                if (stepper) stepper.style.display = 'none';
                successBox.classList.add('active');

                // Generate QR Code for admin scanning on service completion
                renderBookingQRCode(bookingId);

                // Configure direct WhatsApp button with client booking details
                const btnTicketWa = document.getElementById('btn-ticket-whatsapp');
                if (btnTicketWa) {
                    const waText = `Hi Ndi! ✨ I just requested an appointment on your website.\n\n💅 Service: ${bookingState.serviceName}\n📅 Date: ${bookingState.date}\n⏰ Time: ${bookingState.timeSlot}\n💰 Total: R${bookingState.totalPrice.toFixed(2)}\n🔖 Booking ID: ${bookingId}\n\nClient Name: ${bookingState.clientName}`;
                    btnTicketWa.href = `https://wa.me/27715996931?text=${encodeURIComponent(waText)}`;
                }

                // Initialize Slip Download button
                initTicketDownloader(bookingId);

                // Wire Track Appointment button on confirmation slip
                const btnTrackTicket = document.getElementById('btn-track-ticket');
                if (btnTrackTicket) {
                    btnTrackTicket.onclick = () => {
                        if (window.openTrackerForBooking) {
                            window.openTrackerForBooking(bookingId);
                        }
                    };
                }

                // Dispatch confirmation emails via Resend to User & Admin
                sendBookingCreatedEmails(bookingData).catch(e => console.warn("Resend email dispatch:", e));
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

    // Helper: Render high quality QR code for booking
    function renderBookingQRCode(bookingId) {
        const qrContainer = document.getElementById('ticket-qrcode');
        if (!qrContainer) return;
        qrContainer.innerHTML = '';

        const origin = window.location.origin;
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const scanUrl = `${origin}${basePath}admin.html?completeBooking=${encodeURIComponent(bookingId)}`;

        // High-contrast, crystal-clear QR image
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(scanUrl)}&margin=4`;
        img.alt = `Booking QR Code ${bookingId}`;
        img.width = 130;
        img.height = 130;
        img.style.display = "block";
        img.style.margin = "0 auto";
        img.style.borderRadius = "6px";
        img.crossOrigin = "anonymous";

        // Fallback to quickchart if qrserver fails
        img.onerror = () => {
            img.src = `https://quickchart.io/qr?text=${encodeURIComponent(scanUrl)}&size=160`;
        };

        qrContainer.appendChild(img);
    }

    // Helper: Download Ticket Slip as Image / PDF Print
    function initTicketDownloader(bookingId) {
        const btnDownload = document.getElementById('btn-download-ticket');
        if (!btnDownload) return;

        btnDownload.onclick = async () => {
            const ticketElement = document.getElementById('booking-ticket');
            if (!ticketElement) return;

            const originalHTML = btnDownload.innerHTML;
            btnDownload.disabled = true;
            btnDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Slip...';

            try {
                if (typeof html2canvas !== 'undefined') {
                    const canvas = await html2canvas(ticketElement, {
                        scale: 2,
                        backgroundColor: '#fbf9f6',
                        useCORS: true,
                        allowTaint: true,
                        logging: false
                    });
                    const link = document.createElement('a');
                    link.download = `NdisNailBar-Slip-${bookingId || 'Booking'}.png`;
                    link.href = canvas.toDataURL('image/png');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    window.print();
                }
            } catch (err) {
                console.error("Error generating slip image:", err);
                window.print();
            } finally {
                btnDownload.disabled = false;
                btnDownload.innerHTML = '<i class="fa-solid fa-circle-check"></i> Slip Downloaded!';
                setTimeout(() => {
                    btnDownload.innerHTML = originalHTML;
                }, 3000);
            }
        };
    }

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

        document.querySelectorAll('input[name="addons"]').forEach(cb => cb.checked = false);
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

    const reviewsQuery = query(
        collection(db, "reviews"), 
        where("status", "==", "approved"), 
        orderBy("createdAt", "desc")
    );

    onSnapshot(reviewsQuery, (snapshot) => {
        let reviewsList = [];
        snapshot.forEach(docSnap => {
            reviewsList.push(docSnap.data());
        });

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
            status: "pending",
            createdAt: Timestamp.now()
        };

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

/* ==========================================
   5. REAL-TIME CLIENT APPOINTMENT TRACKER (MODAL POPUP)
   ========================================== */
function initBookingTracker() {
    const trackerModal = document.getElementById('tracker-modal');
    const btnOpenTracker = document.getElementById('btn-open-tracker-modal');
    const btnCloseTracker = document.getElementById('btn-close-tracker-modal');
    const btnCloseTrackerBtn = document.getElementById('btn-close-tracker-modal-btn');
    const trackerForm = document.getElementById('tracker-form');
    const trackerInput = document.getElementById('tracker-input');
    const trackerResult = document.getElementById('tracker-result');

    // Modal Open / Close handlers
    function openTrackerModal(prefillId = '') {
        if (!trackerModal) return;
        trackerModal.classList.add('active');
        trackerModal.style.display = 'flex';
        if (trackerInput) {
            if (prefillId) {
                trackerInput.value = prefillId;
                executeTrackerSearch(prefillId);
            }
            setTimeout(() => trackerInput.focus(), 150);
        }
    }

    function closeTrackerModal() {
        if (!trackerModal) return;
        trackerModal.classList.remove('active');
        trackerModal.style.display = 'none';
    }

    if (btnOpenTracker) {
        btnOpenTracker.addEventListener('click', () => openTrackerModal());
    }
    if (btnCloseTracker) {
        btnCloseTracker.addEventListener('click', closeTrackerModal);
    }
    if (btnCloseTrackerBtn) {
        btnCloseTrackerBtn.addEventListener('click', closeTrackerModal);
    }
    if (trackerModal) {
        trackerModal.addEventListener('click', (e) => {
            if (e.target === trackerModal) closeTrackerModal();
        });
    }

    // Expose global helper for confirmation slip trigger
    window.openTrackerForBooking = (bookingId) => {
        openTrackerModal(bookingId);
    };

    if (!trackerForm || !trackerInput || !trackerResult) return;

    trackerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const queryVal = trackerInput.value.trim();
        if (queryVal) {
            executeTrackerSearch(queryVal);
        }
    });

    async function executeTrackerSearch(queryVal) {
        const btnSubmit = trackerForm.querySelector('button[type="submit"]');
        const origText = btnSubmit ? btnSubmit.innerHTML : 'Check Status';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
        }

        trackerResult.style.display = 'block';
        trackerResult.innerHTML = '<div style="text-align:center; padding: 15px; color: var(--color-text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Checking live appointment status...</div>';

        try {
            // First search by Booking ID (e.g. NB-12345)
            const idQuery = query(collection(db, "bookings"), where("id", "==", queryVal.toUpperCase()));
            let snapshot = await getDocs(idQuery);

            // If not found, try searching by Phone Number
            if (snapshot.empty) {
                const phoneQuery = query(collection(db, "bookings"), where("clientPhone", "==", queryVal));
                snapshot = await getDocs(phoneQuery);
            }

            if (snapshot.empty) {
                trackerResult.innerHTML = `
                    <div style="text-align:center; padding: 15px 10px;">
                        <i class="fa-solid fa-circle-question" style="font-size: 2rem; color: var(--color-rose-gold-dark); margin-bottom: 10px;"></i>
                        <h4 style="color: var(--color-text-dark); margin-bottom: 6px;">No Booking Found</h4>
                        <p style="font-size: 0.82rem; color: var(--color-text-muted); line-height: 1.5;">We couldn't find an active booking matching <strong>"${queryVal}"</strong>. Please verify your reference number or message us on WhatsApp.</p>
                    </div>
                `;
                return;
            }

            const bookings = [];
            snapshot.forEach(docSnap => bookings.push(docSnap.data()));
            bookings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            const b = bookings[0];
            const statusLabels = {
                pending: { text: "Pending Studio Approval ⏳", class: "pending" },
                confirmed: { text: "Approved & Confirmed 🎉", class: "confirmed" },
                completed: { text: "Service Completed ✨", class: "completed" },
                cancelled: { text: "Declined / Cancelled ❌", class: "cancelled" }
            };
            const statusInfo = statusLabels[b.status] || { text: b.status, class: "pending" };
            const priceFormatted = b.totalPrice ? `R${parseFloat(b.totalPrice).toFixed(2)}` : 'R0.00';

            let noteHTML = '';
            if (b.adminNote) {
                noteHTML = `
                    <div class="tracker-note-box">
                        <strong><i class="fa-solid fa-comment-dots"></i> Note from Studio:</strong><br>
                        ${b.adminNote}
                    </div>
                `;
            }

            trackerResult.innerHTML = `
                <div class="tracker-result-header">
                    <div>
                        <strong style="font-size: 1.05rem; color: var(--color-text-dark);">${b.clientName || 'Valued Client'}</strong>
                        <div style="font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace; letter-spacing: 0.5px;">Booking ID: ${b.id}</div>
                    </div>
                    <span class="tracker-status-badge ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                <div class="tracker-item-row">
                    <span>Primary Service:</span>
                    <strong>${b.service || '--'}</strong>
                </div>
                <div class="tracker-item-row">
                    <span>Date & Time Slot:</span>
                    <strong>${b.date || '--'} @ ${b.time || '--'}</strong>
                </div>
                <div class="tracker-item-row">
                    <span>Estimated Total:</span>
                    <strong style="color: var(--color-rose-gold-dark); font-size: 0.95rem;">${priceFormatted}</strong>
                </div>
                ${noteHTML}
                
                <!-- Client QR Pass for Check-in -->
                <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(200, 143, 123, 0.3); text-align: center;">
                    <span style="font-size: 0.72rem; font-weight: 700; color: var(--color-text-muted); letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-bottom: 8px;">
                        <i class="fa-solid fa-qrcode"></i> Check-in QR Code
                    </span>
                    <div style="background: #fff; display: inline-block; padding: 8px; border-radius: 8px; border: 1px solid rgba(220, 205, 195, 0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'admin.html?completeBooking=' + (b.id || ''))}&margin=3" alt="Booking QR Code" width="120" height="120" style="display:block; border-radius: 4px;">
                    </div>
                    <p style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 6px;">Present this QR code slip upon arrival at the studio.</p>
                </div>
            `;
        } catch (err) {
            console.error("Tracker search error:", err);
            trackerResult.innerHTML = `
                <div style="text-align:center; padding: 12px; color: #e74c3c;">
                    <i class="fa-solid fa-circle-exclamation"></i> Error checking status. Please try again.
                </div>
            `;
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = origText;
            }
        }
    }
}

