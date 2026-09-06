# Replace Native Browser Delete Confirmation with Bespoke Glassmorphic Modal

Written against: `a7e736c`

## Evidence chain

- Surface: `admin.html`, `admin.js`, and `admin.css` (Admin Dashboard > Bookings Management Table > Row Action `.btn-icon.delete`)
- Problem: Clicking the trash can delete icon triggers the browser native `window.confirm("Are you sure you want to permanently delete booking NB-xxxxx for ...? This cannot be undone.")`. This plain OS dialog blocks the browser thread, violates the studio's luxury glassmorphic design language, and provides no styled summary of the booking being deleted.
- Design evidence: Existing custom modal patterns in `admin.html` and `admin.css`:
  - `.modal-backdrop` (blur backdrop filter `blur(10px)`, `rgba(30, 22, 19, 0.75)`)
  - `.modal-card` (`max-width: 480px`, glass background `rgba(255, 255, 255, 0.92)`, rounded corners `var(--radius-md)`, entrance animations `modalSlideUp`)
  - `.modal-header`, `.modal-title-group`, `.modal-status-pill.cancelled`, `.modal-close-btn`
  - `.notify-client-badge` with `.badge-avatar` and `.badge-details`
  - `.btn-secondary` and `.btn-danger` / `.btn-mod-delete`
- Owner: `admin.html` (modal template), `admin.js` (modal controller & Firestore deletion trigger), `admin.css` (modal & destructive action styling)
- Scope and affected surfaces: Admin Dashboard Bookings Table (`#bookings-table-body`) and Modal Backdrops container in `admin.html`
- Uncertainty: None. Reuses verified modal tokens and components already proven by `#booking-notify-modal`, `#service-modal`, and `#addon-modal`.

## Design decision

Replace the blocking `window.confirm()` dialog with a luxury, glassmorphic **Delete Booking Confirmation Modal** (`#delete-booking-modal`) that:
1. Displays a clear destructive warning header with a red warning icon (`fa-triangle-exclamation`) and a `"Permanent Action"` status pill.
2. Embeds a client summary card (`.notify-client-badge`) displaying the client initials avatar, client name, booking ID badge, service name, date/time, and price.
3. Provides an explicit contextual warning regarding permanent database deletion and invalidation of tracking codes.
4. Includes styled **Cancel** (`.btn-secondary`) and **Permanently Delete** (`.btn-danger-action`) buttons with a loading spinner state during Firestore deletion.
5. Supports seamless close on escape key, backdrop click, or cancel button.

## Reuse

- Tokens: `var(--glass-border)`, `var(--glass-bg)`, `var(--glass-shadow)`, `var(--radius-md)`, `var(--color-text-dark)`, `var(--color-text-muted)`, `var(--color-rose-gold-dark)`
- Components: `.modal-backdrop`, `.modal-card`, `.modal-header`, `.modal-title-group`, `.modal-status-pill`, `.modal-close-btn`, `.notify-client-badge`, `.badge-avatar`, `.badge-details`, `.btn`, `.btn-secondary`
- Exemplar: `#booking-notify-modal` in [`admin.html`](file:///C:/Users/delig/.gemini/antigravity/scratch/Nails-Store/admin.html#L442-L518)

## Changes

1. [`admin.html`](file:///C:/Users/delig/.gemini/antigravity/scratch/Nails-Store/admin.html)
   - Change: Add `#delete-booking-modal` markup before closing `</body>` tag containing the modal header, client preview badge, warning banner, and action buttons.
   - Preserve: All existing modals (`#booking-notify-modal`, `#qr-scan-modal`, `#edit-nail-modal`, `#service-modal`, `#addon-modal`).
   - Verify: Modal is present in DOM, hidden by default (`display: none;`).

2. [`admin.js`](file:///C:/Users/delig/.gemini/antigravity/scratch/Nails-Store/admin.js)
   - Change:
     - In `renderBookingsTable()`, change the `.btn-icon.delete` click handler from `if (confirm(...))` to `openDeleteBookingModal(bookingData, btn)`.
     - Implement `openDeleteBookingModal(bookingData, btnElement)` to populate client details (name, ID, avatar initial, service, date, price) and display `#delete-booking-modal`.
     - Implement `closeDeleteBookingModal()` to hide the modal and clear pending references.
     - Wire event listeners for `#btn-confirm-delete-booking`, `#btn-close-delete-modal`, `#btn-cancel-delete-modal`, and modal backdrop click.
     - In the confirmation handler, disable the button, show loading spinner, delete the doc from Firestore (`deleteDoc(doc(db, "bookings", pendingDeleteDocId))`), show a success toast, and close the modal.
   - Preserve: Real-time table updates via `unsubBookings` and other existing action triggers.
   - Verify: Clicking trash icon opens the custom modal without browser alert; clicking "Permanently Delete" removes the booking and shows toast.

3. [`admin.css`](file:///C:/Users/delig/.gemini/antigravity/scratch/Nails-Store/admin.css)
   - Change: Add `.btn-danger-action` styling with subtle red hover glow and active transform states matching `.btn-primary`.
   - Preserve: All existing modal and button styles.
   - Verify: Modal aligns with the rose-gold glassmorphism theme and destructive actions are visually prominent.

## Scope

- Inherit: All row delete buttons across filtered booking lists (All, Pending, Confirmed, Cancelled).
- Verify: Bookings table row deletion, pending review delete actions, gallery delete actions.
- Exclude: Unrelated tabs (Settings, Uploader, Overview).

## Validation

- Product: Admin clicks delete icon on booking `NB-86968` for "Delight Tshitangano". The custom glassmorphic modal opens with complete booking details. Admin confirms deletion, and booking is deleted smoothly with live toast feedback.
- Interface: Test on desktop (1920px/1440px) and mobile viewport (375px); verify modal centering, scrolling on small screens, and backdrop click dismiss.
- System: Verify absence of native `window.confirm()` calls in the bookings table workflow.
- Repository: `node -c admin.js` → exits with code 0.

## Stop conditions

- Stop if Firestore permissions prevent document deletion.
- Stop if modal markup conflicts with existing backdrop z-index layers.

## Design documentation

- After acceptance and validation: Record `#delete-booking-modal` in dashboard component library under destructive action patterns.
