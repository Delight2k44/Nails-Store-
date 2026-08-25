# 💅 Ndi's Nail Bar — Premium Booking & Admin Platform

A modern, fully responsive website and admin dashboard for **Ndi's Nail Bar**, a boutique nail studio. Built with vanilla HTML, CSS, and JavaScript, powered by **Firebase** (Auth, Firestore, Storage) for real-time data and cloud hosting.

---

## ✨ Features

### 🌐 Client Website (`index.html`)
- **Hero Section** — Full-viewport animated background with a call-to-action booking button
- **About Us** — Studio introduction with a custom signature element
- **Services Menu** — Dynamic pricing cards (Gel, Acrylic, Chrome, Nail Art) fetched live from Firestore
- **Portfolio Gallery** — Filterable nail design showcase loaded from Firestore with smooth animations
- **Multi-Step Booking Wizard** — 3-step form (Service → Date/Time → Details) with live invoice calculations and Firestore submission
- **Instant WhatsApp Ticket Link** — Direct button on the booking confirmation screen to WhatsApp the studio with booking details
- **Live Appointment Tracker** — Clients can search their Booking ID or phone number to check their live confirmation status and studio notes
- **Ratings & Reviews** — Customer testimonials with star ratings, averages breakdown, and a submission form (moderated before publishing)
- **Responsive Design** — Mobile-first layout with glassmorphism styling, rose gold & blush pink palette, and elegant serif/sans-serif typography

### 🔐 Admin Dashboard (`admin.html`)
- **Firebase Authentication** — Secure email/password login with detailed error handling
- **Dashboard Overview** — Real-time stat cards (total bookings, pending slots, average rating, gallery count)
- **Bookings Management & Client Notifications** —
  - 📩 **Approve & Notify** — Generates personalized confirmation messages with service, date, time, price, and custom studio note
  - 🚫 **Decline & Notify** — Allows the admin to provide an optional decline reason and generates cancellation messages
  - 📲 **1-Click WhatsApp & Email Sending** — Direct integration to send the generated update via WhatsApp or Email with 1 click
  - ⚡ **Quick WhatsApp Button** in the bookings table to chat with any client instantly
- **Reviews Moderation** — Approve or reject pending client reviews before they go live
- **Portfolio Uploader** — Upload nail art photos with progress bar directly to Firebase Storage
- **Website Settings (CMS)** — Full content management system:
  - 🖼️ **Image Manager** — Upload new Hero background and About Us images (live updates via Firestore)
  - 💰 **Pricing Editor** — Edit service prices, durations, and add-on costs in real-time
- **Toast Notifications** — Elegant slide-in notifications for all success/error/warning/info actions

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Vanilla), JavaScript (ES Modules) |
| **Backend** | Firebase Firestore (NoSQL database) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Storage** | Firebase Cloud Storage (images) |
| **Fonts** | Google Fonts — Cormorant Garamond + Montserrat |
| **Icons** | Font Awesome 6.4 |
| **Hosting** | Static files — deploy anywhere (Netlify, Vercel, Firebase Hosting, GitHub Pages) |

---

## 📁 Project Structure

```
Nails-Store/
├── assets/                  # Static images (hero, about, nail portfolio defaults)
│   ├── hero.jpg
│   ├── about.jpg
│   ├── acrylic.jpg
│   ├── gel.jpg
│   ├── chrome.jpg
│   └── art.jpg
├── index.html               # Client-facing website
├── styles.css               # Client website styling
├── app.js                   # Client interactivity & Firestore integration
├── admin.html               # Admin dashboard
├── admin.css                # Admin dashboard styling
├── admin.js                 # Admin logic, CMS, and Firestore watchers
└── firebase-config.js       # Firebase SDK initialization & exports
```

---

## 🔥 Firebase Collections

| Collection | Purpose |
|---|---|
| `bookings` | Client appointment reservations (name, service, date, time, price, status) |
| `reviews` | Customer testimonials (name, rating, content, status: pending/approved) |
| `nails` | Portfolio gallery items (title, category, image URL) |
| `services` | Service definitions (name, category, description, price, duration) |
| `addons` | Optional booking add-ons (name, price) |
| `settings/layout` | Website layout config (heroImageUrl, aboutImageUrl) |

---

## 🚀 Getting Started

### Prerequisites
- A [Firebase](https://console.firebase.google.com/) project with:
  - **Authentication** → Email/Password provider enabled
  - **Firestore Database** → Created in production or test mode
  - **Storage** → Bucket created

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Delight2k44/Nails-Store-.git
   cd Nails-Store-
   ```

2. **Configure Firebase**
   Edit `firebase-config.js` with your Firebase project credentials (already configured for this project).

3. **Set Firestore Security Rules**
   In the Firebase Console → Firestore → Rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Bookings & Reviews: public read/write (clients submit)
       match /bookings/{bookingId} {
         allow read, write: if true;
       }
       match /reviews/{reviewId} {
         allow read, write: if true;
       }
       // Nails gallery: public read, admin write
       match /nails/{nailId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       // Services, Addons, Settings: public read, admin write
       match /services/{serviceId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /addons/{addonId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /settings/{settingId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. **Create Admin Account**
   In Firebase Console → Authentication → Users → **Add User**:
   - Email: your admin email
   - Password: your admin password

5. **Run Locally**
   Open `index.html` in a browser, or use a local server:
   ```bash
   npx serve .
   ```

6. **Access the Admin**
   - Open `admin.html` in your browser
   - Or click the **Admin Login** link in the homepage footer
   - Sign in with your admin credentials

---

## 💰 Currency

All prices are displayed in **South African Rands (R)**. The currency format is used consistently across the client booking system, invoices, and admin dashboard.

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `> 1024px` | Full desktop layout with sidebar |
| `768px – 1024px` | Tablet — stacked grids, collapsible sidebar |
| `< 768px` | Mobile — single column, hamburger menu |

---

## 📄 License

This project is proprietary software for **Ndi's Nail Bar**. All rights reserved.

---

Built with 💅 by [Delight](https://github.com/Delight2k44)
