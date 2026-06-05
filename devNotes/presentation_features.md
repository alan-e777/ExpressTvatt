# Tvättio — Platform Overview
### Everything the system does, slide-by-slide

---

## 1. The Customer Website

The website is the primary booking channel. Customers can browse all services, build a combined order, and pay — without creating an account.

### Service Menu — Three services in one booking

Customers land on a clean, focused page with three service categories they can mix and combine freely:

**Mattvätt**
A size slider lets the customer set the exact square meters of their rug (1–30 m²). The price updates live at 90 kr/m². One click adds it to the cart. No forms, no guesswork.

**Struken tvätt**
A full catalog of garments — shirts, suits, dresses, trousers, ties, outdoor gear, home textiles, and more — organized by category. Each item has a fixed price and a +/– counter so the customer can add multiple of the same garment. All categories display in one flat list so nothing is hidden behind extra taps.

**Klädvård & textil**
Tailoring, repairs, stain removal, waterproofing, fabric protection, pressing, upholstery care, and more. Same +/– interface. Every service is pulled live from the database — no code changes needed when offerings change.

### The Cart

A persistent sidebar (desktop) and a sticky bar (mobile) shows the running total at all times. Pickup & delivery is always included in the price. One button proceeds to checkout.

### Checkout — Address, Date, Time, Payment

- **Address autocomplete** — powered by Google Places but restricted to the admin-configured service area. Customers only see addresses within the delivery zone.
- **Name & C/O field** — the customer enters their name and an optional care-of field for deliveries to third parties.
- **Date & time selection** — the customer chooses their preferred pickup date and time window.
- **Contact details** — email and phone number collected at checkout for delivery coordination.
- **Notes field** — free text for any special instructions.
- **Stripe payment** — embedded Stripe payment form. The server validates every price before the payment intent is created — the client cannot manipulate amounts.
- On success, an order document is created in the database with status `pending_payment`, instantly upgraded to `paid` when the payment webhook fires.

### Live Order Status (logged-in customers)

Customers who sign in see a live progress tracker on the home page for any active order. Five stages: Bokad → Hämtad → Rengörs → Klar → Levererad. The tracker updates in real time as the admin moves the order through statuses. If a customer has multiple active orders, a badge shows the count and they can cycle between them with a tap animation.

### Live Chat

Logged-in customers can open the `/chatt` page to message the shop directly. Messages are delivered in real time via Firebase Realtime Database. Guests see a preview of the chat and a prompt to log in.

---

## 2. The iOS App

The customer app mirrors the website's booking flow, optimized for mobile. Built in React Native (Expo), iOS only.

### Home Screen
Same three service sections — Mattvätt slider, Struken tvätt catalog, Klädvård list — with a live active-order card at the top for returning customers. Push notifications keep customers informed.

### Cart & Checkout
A dedicated checkout screen collects the pickup address (with the same service-area–restricted autocomplete), date, and time. Then hands off to the Stripe payment screen. No branching logic per service type — every combination goes through one unified flow.

### Profile & Chat
- Profile screen shows the customer's order history and account details.
- Chat screen for direct communication with the shop. Requires login — unauthenticated users see a lock screen with a prompt to log in or create an account.

---

## 3. The Admin Dashboard

The admin panel is protected by Firebase authentication + a secure server-side session cookie. Only the designated admin UID can log in. Every section is its own page with real-time data from Firestore.

---

### 3A. Dashboard (overview)

The main landing page after login. Shows a live snapshot of the business at a glance.

**Revenue summary**
Total revenue for the current month, calculated from all completed and in-progress orders. Updates in real time.

**Live order kanban**
A kanban board showing all active orders grouped by status column: New, Collected, In Progress, Ready for Delivery. Cards update in real time as statuses change. Gives an immediate visual sense of the day's workload without opening the full orders table.

**Collapsible driver map**
An embedded map showing the current day's active delivery addresses. Can be collapsed to save screen space.

---

### 3B. Orders

The operational heart of the business.

**Order table**
All orders in one table. Default view: current month, active statuses only (New, Collected, In progress, Ready for pickup). Every column is what you need: date, service, amount, customer, status, notes.

**Status management**
Every order has a color-coded status dropdown — click to move an order from New → Collected → In progress → Ready for delivery → Completed. Changes save instantly.

**Bulk actions**
Select multiple orders with checkboxes and apply a status change to all of them at once. Useful for batch-moving a day's collected orders into "In progress."

**Date range filter**
Filter orders by any date range. Default is the current month from day 1 to today. One click to reset.

**Status filter**
A dropdown with all statuses and live counts for each. Pick one or many. Show only what matters right now.

**XLSX export — tax helper**
A month picker in the orders header lets the admin select any past or current month. One click exports all orders for that month as a `.xlsx` file (`tvattio-orders-YYYY-MM.xlsx`). The sheet includes: date, Stripe payment ID, service name, itemized summary, address, postal code, amount in kr, status, and notes. A totals row at the bottom sums the revenue for the period. Useful for monthly bookkeeping and tax review without needing to log into Stripe.

**Expandable order detail**
Click "Add note" or "View note" on any row to expand the full order detail panel:
- Booking details: address, postal code, dropoff date, dropoff time
- Itemized garment list with quantities and line-item prices
- Customer's free-text description
- **Private admin note** — a text field visible only to staff. Auto-saves when you click away.

---

### 3C. Calendar

A visual overview of all scheduled pickups.

**Monthly calendar grid**
Navigate by month. Days with orders show a colored dot. Click any day to see its orders in the detail panel on the right.

**Day detail panel**
Shows every order for the selected day, sorted by pickup time. Each card shows: time, service name, status badge, customer identifier, and amount.

**Upcoming orders list**
Below the calendar: a full sorted list of all upcoming non-completed orders. Click any row to jump to that date in the calendar.

**Month summary**
At the bottom of the calendar: total order count for the month and how many are still active.

---

### 3D. Driver — Route Planning

This is where pickups and deliveries are planned for the driver.

**Two tabs — Pickup and Dropoff**
- **Upphämtning (Pickup):** shows all paid orders that haven't been collected yet. The driver picks up garments from customers.
- **Utkörning (Dropoff):** shows all orders marked "Ready for pickup" — finished garments ready to be returned to customers.

**Building a route**
Available orders appear in the left panel. Add individual orders to the route queue with one click, or "Add all" to queue everything. Remove orders from the queue individually.

**Route optimization**
Once orders are queued, one button optimizes the route. For up to 10 stops: uses the Google Maps Directions API for true optimal routing. For larger runs: uses a nearest-neighbor algorithm. The result reorders the queue by optimal driving sequence and shows each stop's position number.

**Start and end point control**
Toggle checkboxes to include the driver's default start address (e.g. the shop) and end address as fixed endpoints in the optimization. These addresses are configured in Settings — read-only here.

**Google Maps link**
After optimization, a shareable Google Maps URL is generated with all stops as waypoints. Copy the link or open it directly in Google Maps.

**Driver run link**
A separate tokenized URL is generated for the driver's phone. This is a mobile-optimized page (no login required) that shows the day's stops and lets the driver tap "Levererad" (Delivered) on each stop as they complete it. A progress bar tracks completion. The admin's order statuses update automatically when the driver marks a stop done.

---

### 3E. Services — Live Catalog Management

Admins can manage the full service catalog without touching any code.

**Klädvård & textil**
Add, edit, and delete services. Each service has a name, description, and price. Changes go live on the website and app instantly.

**Struken tvätt**
Same CRUD interface for the ironing catalog. Products are organized into categories (Men, Women, Formal, Home, Outdoor, Tailoring) and can be reordered within each category.

---

### 3F. Customers

A full CRM view of every registered customer.

**Customer list**
Every customer who has placed an order. Displays: avatar initials, name, email, order count, total lifetime spend, and last order date.

**Customer tags**
Automatically applied:
- **Ny** — new customer, first-time or no orders yet
- **Återkommande** — returning customer, 1–4 orders
- **VIP** — loyal customer, 5+ orders

**Search & sort**
Filter by name or email. Sort by order count, total spend, or last order date.

**Expandable order history**
Click any customer to expand their full order history: service name, status, amount, and date for every order.

---

### 3G. Chat — Customer Messages

A two-pane messaging interface for communicating with customers.

**Conversation list**
The left panel lists every customer thread, ordered by most recent message. Unread threads are highlighted — a badge on the Chat sidebar link shows the total unread count.

**Message thread**
The right panel shows the full message history for the selected customer. The admin can read and reply inline. Messages are delivered in real time via Firebase Realtime Database.

---

### 3H. Settings — Service Area & Driver Configuration

**Driver start and end addresses**
Set the default start and end points used in route planning. These addresses use the same Places autocomplete as the customer app — restricted to Sweden.

**Service area — interactive map editor**
A Google Maps view with a draggable, resizable circle defining the delivery zone. Drag the center to move the zone. Drag the circle edge to resize it. Or use the radius slider for precise control.

This circle directly controls which addresses appear in the customer-facing checkout autocomplete and in the admin address inputs — anyone outside the circle simply won't find their address. No manual list to maintain.

Changes are saved to the database and take effect immediately across the website and the app.

---

## 4. The Driver Run Page (mobile-first)

A standalone mobile page, accessed via a one-time token link generated from the Driver section.

- No login required — the token is the key.
- Shows the driver's list of stops for the current run (pickup or dropoff).
- Each stop displays the address, service name, and scheduled time.
- Tap **Levererad** to mark a stop as done. The button flips to "Ångra" in case of a mistake.
- A progress bar at the top fills as stops are completed.
- When all stops are marked done, the bar turns green: "✓ Alla levererade!"

The admin sees status changes in real time on the Orders page.

---

## Summary — What the platform delivers

| Area | What it does |
|---|---|
| Customer website | Browse, combine, and pay for mattvätt + struken tvätt + tailoring in one checkout |
| Customer app (iOS) | Full mobile booking with the same services and push notifications |
| Live chat | Real-time messaging between customers (web + app) and the admin |
| Admin dashboard | Live kanban of active orders by status + revenue summary + driver map |
| Orders | Real-time order management, status tracking, notes, bulk actions, and XLSX export for bookkeeping |
| Calendar | Visual schedule overview by date with upcoming order list |
| Driver planning | Route optimization, Google Maps integration, mobile driver run page |
| Catalog management | Live editing of all services and prices — no code deploys |
| Customer CRM | Full customer overview with order history and loyalty tags |
| Service area control | Geographic delivery zone enforced on all address inputs, configurable via interactive map |
| Payments | Stripe — server-validated, webhook-driven, secure |
