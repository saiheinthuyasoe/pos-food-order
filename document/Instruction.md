# Restaurant Food Order Website — Build Guide

---

## CUSTOMER SIDE

### Page 1: Home Page

The entry point for all customers. Build a full-width banner with a food photo, restaurant name, and two buttons: **"Order Now"** and **"View Menu"**. Below that, show popular dishes, restaurant opening hours, address, and a Google Maps embed. Add a sticky navigation bar at the top with links to Menu, Cart, and Login.

### Page 2: Menu Page

Group food by category tabs (Starters, Mains, Drinks, Desserts). Each food card shows a photo, name, description, price, and an **"Add to Cart"** button. Add a search bar at the top and filter buttons for category, price range, or dietary type (vegetarian, spicy, etc.). Show a floating cart icon with item count so the customer always knows what's in their cart.

### Page 3: Food Detail Page

When a customer clicks a food item, open a detail page or popup showing a larger photo, full description, ingredients, allergens, and portion size. Allow the customer to choose options (size, spice level, extras) before adding to cart.

### Page 4: Cart Page

List all items the customer added with photo, name, quantity controls (+/-), unit price, and line total. Show promo code input box, subtotal, delivery fee (if delivery), tax, and grand total. Two buttons at the bottom: **"Continue Shopping"** and **"Proceed to Checkout"**.

### Page 5: Checkout Page

Split into two tabs at the top: **Walk-in** and **Delivery**.

For Walk-in: name, phone, table number, special instructions.

For Delivery: name, phone, full address, apartment/floor, delivery notes.

Below that show payment method options: Cash, Credit/Debit Card, or Online (Stripe/PayPal). Show a final order summary on the right side. End with a **"Place Order"** button.

### Page 6: Order Confirmation Page

After placing an order show the order ID, full list of items, total paid, order type (walk-in or delivery), and estimated time. Add a **"Track My Order"** button. Send an SMS or email confirmation automatically.

### Page 7: Order Tracking Page

Show a visual step progress bar: **Order Placed → Confirmed → Preparing → Ready / Out for Delivery → Delivered**. Each step lights up as the order moves forward. Show estimated minutes remaining. Auto-refresh every 30 seconds or use real-time update with Socket.io.

### Page 8: Login / Register Page

Two tabs — Login and Register. Login asks for email and password. Register asks for name, email, phone, and password. Add social login (Google) as an option. After login, redirect back to where the customer was.

### Page 9: Customer Profile Page

Let the customer update their name, phone, email, and saved delivery addresses. Show a list of saved payment methods if applicable.

### Page 10: Order History Page

Show all past orders in a table: order date, order ID, items summary, total, and status. Add a **"Reorder"** button to add the same items to cart again with one click. Let the customer click any order to see full details.

### Page 11: Notifications Page

Show a list of alerts: "Your order is being prepared", "Your order is out for delivery", "Special discount today only". Mark notifications as read when clicked.

---

## ADMIN SIDE

### Page 1: Admin Login Page

Simple login form with email and password. Only approved staff can access. Add role-based access later (Super Admin, Kitchen Staff, Delivery Manager).

### Page 2: Admin Dashboard (Overview)

The first page after login. Show key numbers at the top in cards: **Today's Orders, Revenue Today, Pending Orders, Active Deliveries**. Below that show a live orders feed, a bar chart of orders by hour, and a pie chart of order types (walk-in vs delivery). This page gives the manager a full picture at a glance.

### Page 3: Orders Management Page

A real-time list of all incoming orders. Each row shows: order ID, customer name, order type, items summary, total, time placed, and current status. Add filter tabs: **All, Pending, Preparing, Ready, Delivered, Cancelled**. Staff can click an order to see full details and use buttons to move status forward: **Confirm → Preparing → Ready → Delivered**. Kitchen staff see this page on a screen and act on it.

### Page 4: Order Detail Page (Admin)

When admin clicks an order, open a full detail view: customer info, items with quantities, special instructions, payment method and status, delivery address or table number, and order timeline showing when each status change happened.

### Page 5: Menu Management Page

Show all menu items in a table with photo, name, category, price, availability toggle (on/off), and action buttons (Edit, Delete). Add a big **"Add New Item"** button at the top. Include bulk actions like enable/disable multiple items at once.

### Page 6: Add / Edit Menu Item Page

A form with fields: item name, category (dropdown), description, price, photo upload, dietary tags (vegetarian, vegan, gluten-free, spicy), available options (size, extras with extra cost), and an availability toggle. Save button submits to the database.

### Page 7: Category Management Page

List all food categories (Starters, Mains, etc.) with their display order and item count. Allow admin to add, rename, reorder (drag and drop), or delete categories. Reordering here changes how categories appear on the customer menu page.

### Page 8: Table Management Page (for Walk-in)

Show a visual layout of the restaurant tables or a simple list. Each table shows its number, seating capacity, and current status (Free, Occupied, Reserved). Admin can mark tables as occupied or free. Link active orders to specific tables.

### Page 9: Delivery Management Page

Show all active delivery orders on a list or map view. Each entry shows customer name, address, assigned delivery person, and current status. Allow admin to assign orders to delivery staff. Show estimated delivery time.

### Page 10: Staff Management Page

List all staff accounts with name, role, email, phone, and status (active/inactive). Admin can add new staff, assign roles (Admin, Kitchen, Delivery), reset passwords, and deactivate accounts.

### Page 11: Customer Management Page

List all registered customers with name, email, phone, number of orders, and total spent. Admin can search, view a customer's full order history, and manually adjust or refund orders if needed.

### Page 12: Discount & Promo Code Page

Create and manage promo codes. Each code has: code name, discount type (percentage or fixed amount), minimum order value, expiry date, and usage limit. Admin can activate or deactivate codes anytime. Show how many times each code has been used.

### Page 13: Payment Management Page

List all transactions with order ID, customer, amount, payment method, and status (paid, pending, refunded). Admin can issue refunds from this page. Show a daily and monthly revenue summary at the top.

### Page 14: Reports & Analytics Page

Show charts and data that help the manager make decisions. Include: daily and weekly revenue graph, top-selling items, busiest hours of the day, order type breakdown (walk-in vs delivery), average order value, and customer return rate. Add an export button to download reports as CSV or PDF.

### Page 15: Settings Page

Manage restaurant-wide settings: restaurant name, address, phone, logo, opening hours per day, delivery radius, minimum order amount for delivery, delivery fee rules, tax rate, and notification settings (SMS/email alerts on new orders).

---

## Summary Table

| #   | Customer Pages     | Admin Pages         |
| --- | ------------------ | ------------------- |
| 1   | Home               | Login               |
| 2   | Menu               | Dashboard Overview  |
| 3   | Food Detail        | Orders Management   |
| 4   | Cart               | Order Detail        |
| 5   | Checkout           | Menu Management     |
| 6   | Order Confirmation | Add/Edit Menu Item  |
| 7   | Order Tracking     | Category Management |
| 8   | Login / Register   | Table Management    |
| 9   | Profile            | Delivery Management |
| 10  | Order History      | Staff Management    |
| 11  | Notifications      | Customer Management |
| 12  | —                  | Promo Codes         |
| 13  | —                  | Payment Management  |
| 14  | —                  | Reports & Analytics |
| 15  | —                  | Settings            |

---

## Recommended Build Order

Start with the database and backend API first, then build in this order: Admin Login → Menu Management → Customer Menu Page → Cart → Checkout → Orders Management → Order Tracking → everything else.

## Simple Tech Stack to Use

| Part                      | Technology                 |
| ------------------------- | -------------------------- |
| Frontend (what users see) | Next.js with AppRouter     |
| Backend (server logic)    | Next.js                    |
| Database (store data)     | Firebase                   |
| Real-time updates         | Firebase                   |
| Payments                  | Stripe                     |
| Hosting                   | Vercel (frontend, Backend) |

---

# Step-by-Step Build Instructions — Restaurant Food Order Website

**Tech Stack:** Next.js (Frontend + Backend) · Firebase (Database + Real-time) · Stripe (Payments) · Vercel (Hosting)

---

## PHASE 1 — PROJECT SETUP

### Step 1: Set Up Your Project

Create a new Next.js project on your computer. Set up the folder structure so you have separate folders for customer pages, admin pages, components, and API routes. Install the necessary packages: Firebase for database, Stripe for payments, and Tailwind CSS for styling. Connect your project to a GitHub repository so you can save your work and deploy later.

### Step 2: Set Up Firebase

Go to Firebase website and create a new project. Turn on **Authentication** (for login), **Firestore Database** (to store all data), and **Storage** (to store food photos). Copy the Firebase config keys and save them in your project as environment variables. These are secret keys so never share them publicly.

### Step 3: Set Up Your Database Structure

Before writing any page, plan your Firestore collections. Create these collections: `users` (customer info), `admins` (staff accounts), `categories` (food categories), `menu_items` (food items), `orders` (all orders), `tables` (restaurant tables), `promo_codes` (discount codes), `notifications` (customer alerts), and `settings` (restaurant settings). Think of each collection like a folder and each document inside it as one record.

### Step 4: Set Up Stripe

Create a Stripe account. Get your API keys (public key and secret key). Save them as environment variables in your project. You will use these later when building the checkout page.

---

## PHASE 2 — AUTHENTICATION (Both Admin & Customer)

### Step 5: Customer Login & Register Page

Build the Login/Register page for customers. Make two tabs at the top — one for Login and one for Register. The Login tab has an email and password field with a **"Login"** button. The Register tab has name, email, phone, and password fields with a **"Create Account"** button. Add a **"Login with Google"** button below both forms. Connect all buttons to Firebase Authentication. After a successful login or register, save the user info to the `users` collection in Firestore and redirect the customer to the Home page. If login fails, show a clear error message.

### Step 6: Admin Login Page

Build a separate login page only for admin staff. It has just an email and password field and a **"Login"** button — no register option here. When the admin logs in, check the `admins` collection in Firestore to confirm they are a valid staff member and what their role is (Super Admin, Kitchen, Delivery). If they are valid, redirect them to the Admin Dashboard. If not, show an "Access Denied" message. Make sure normal customers cannot reach admin pages.

### Step 7: Route Protection

Add a rule on every admin page so that only logged-in admin users can see it. If someone who is not logged in tries to visit an admin page, automatically redirect them to the Admin Login page. Do the same for customer-only pages like Profile, Order History, and Checkout — redirect non-logged-in users to the Customer Login page.

---

## PHASE 3 — ADMIN SIDE (Build Admin First So You Can Add Data)

### Step 8: Admin Layout & Navigation

Build the shared layout that all admin pages will use. This includes a sidebar on the left with links to every admin section: Dashboard, Orders, Menu, Categories, Tables, Delivery, Staff, Customers, Promo Codes, Payments, Reports, and Settings. Add the restaurant logo at the top of the sidebar and the logged-in staff name with a logout button at the bottom. This layout wraps every admin page so you don't have to rebuild navigation each time.

### Step 9: Admin Settings Page

Build this early because other pages depend on it. Create a form with fields for restaurant name, address, phone number, logo upload, opening hours for each day of the week, delivery radius, minimum order amount, delivery fee, and tax rate. Add a **"Save Settings"** button that stores everything in the `settings` collection in Firestore. You need this data before the customer-facing pages can show accurate info.

### Step 10: Category Management Page

Build the page where admin manages food categories. Show a list of all categories with their name, display order number, and item count. Add a form at the top to create a new category — just a name and an order number. Each category row has an Edit button (to rename it), a Delete button, and up/down arrows to change the display order. Save all categories to the `categories` collection in Firestore. The order you set here is the order customers will see on the Menu page.

### Step 11: Menu Management Page

Build the main page that lists all food items. Show a table with columns for photo thumbnail, item name, category, price, availability toggle, and action buttons (Edit, Delete). Add an **"Add New Item"** button at the top right. Add a search bar and a category filter dropdown. The availability toggle should update Firestore immediately when switched, so the item shows or hides on the customer menu right away without refreshing.

### Step 12: Add / Edit Menu Item Page

Build the form page that opens when admin clicks "Add New Item" or "Edit" on any item. Fields to include: item name, category (dropdown from your categories list), description, price, photo upload (saves to Firebase Storage), dietary tags as checkboxes (Vegetarian, Vegan, Gluten-Free, Spicy), a section for options like sizes or extras where admin can add option name and extra price, and an availability toggle. When saved, write the item to the `menu_items` collection in Firestore. If editing, update the existing document.

### Step 13: Table Management Page

Build the page for managing restaurant tables. Show a grid or list of all tables. Each table card shows the table number, how many seats it has, and its current status shown as a colored badge — green for Free, red for Occupied, yellow for Reserved. Admin can click a table to change its status. Add an **"Add Table"** button to create new tables with a number and seat count. Save all table data to the `tables` collection in Firestore.

### Step 14: Staff Management Page

Build the page where the Super Admin manages staff accounts. Show a list of all staff with their name, role, email, phone, and an active/inactive badge. Add an **"Add Staff"** button that opens a form asking for name, email, phone, and role. When a new staff is added, create their account in Firebase Authentication and also add their details to the `admins` collection. Add an Edit button to change role or info, and a Deactivate button to block their access without deleting the account.

### Step 15: Orders Management Page

Build the real-time order management page that kitchen and delivery staff will look at constantly. Use Firebase real-time listener so new orders appear on screen automatically without refreshing. Show orders in a list with columns for order ID, customer name, order type badge (Walk-in or Delivery), items summary, total price, time placed, and current status. Add filter tabs at the top: All, Pending, Preparing, Ready, Delivered, Cancelled. Each order row has a **"View"** button to see full details.

### Step 16: Order Detail Page (Admin)

Build the detail page that opens when admin clicks "View" on any order. Show two sections. The top section shows customer name, phone, order type, table number or delivery address, special instructions, payment method, and payment status. The bottom section shows a list of all ordered items with quantities and prices, and the order total. On the right side, show the order status timeline — a vertical list showing when each status change happened with a timestamp. Add action buttons to move the order forward: **Confirm, Start Preparing, Mark Ready, Mark Delivered, Cancel**. Only show the button for the next logical step.

### Step 17: Delivery Management Page

Build the page for tracking active delivery orders. Show a list of all orders where the type is Delivery and status is not yet Delivered. Each row shows customer name, delivery address, assigned delivery person (or "Unassigned"), and current status. Add an **"Assign"** button on each row that opens a dropdown to pick from available delivery staff. Show estimated delivery time. When the delivery person marks it as delivered, it disappears from this list.

### Step 18: Customer Management Page

Build the page listing all registered customers. Show a table with customer name, email, phone, number of total orders, and total amount spent. Add a search bar to find customers by name or email. When admin clicks on a customer row, open a side panel or new page showing their full order history, saved addresses, and account creation date. Add a **"View Orders"** button that takes admin to a filtered orders list showing only that customer's orders.

### Step 19: Discount & Promo Code Page

Build the page for creating and managing promo codes. Show a table listing all promo codes with columns for code name, discount type (percentage or fixed), discount amount, minimum order value, expiry date, usage count, and an active/inactive toggle. Add a **"Create Promo Code"** button at the top that opens a form with all those fields plus a usage limit field. Saving the form writes the promo code to the `promo_codes` collection. The toggle lets admin turn codes on or off instantly.

### Step 20: Payment Management Page

Build the page showing all payment transactions. Pull data from the `orders` collection filtered by payment info. Show a table with order ID, customer name, amount, payment method, payment status (Paid, Pending, Refunded), and date. Add a daily revenue total and monthly revenue total at the top in summary cards. Add a search bar to find by order ID or customer. Add a **"Refund"** button on paid orders that triggers a Stripe refund via your API and updates the status in Firestore.

### Step 21: Reports & Analytics Page

Build the page showing charts and business summaries. At the top show four summary cards: Total Revenue This Month, Total Orders This Month, Average Order Value, and Most Popular Item. Below show a bar chart for daily revenue over the past 7 days, a line chart for orders per hour to show busiest times, a pie chart for Walk-in vs Delivery split, and a table of the top 10 best-selling items. At the top right add an **"Export"** button that downloads the current data as a CSV file.

### Step 22: Admin Dashboard Overview Page

Build this last among admin pages because it pulls data from everything you already built. Show four big number cards at the top: Today's Orders, Today's Revenue, Pending Orders, and Active Deliveries. Below show a live orders feed (the last 5 new orders using Firebase real-time), a bar chart of orders by hour today, and a pie chart of order types. Link each card and chart to the relevant management page so admin can click through for full details.

---

## PHASE 4 — CUSTOMER SIDE

### Step 23: Customer Layout & Navigation

Build the shared navigation bar used across all customer pages. Include the restaurant logo on the left, links to Home, Menu, and Order History in the middle, and Login and a cart icon with item count badge on the right. Make the navbar sticky so it stays at the top when the customer scrolls. On mobile, collapse the links into a hamburger menu. This layout wraps all customer pages.

### Step 24: Home Page

Build the first page customers see. At the top put a full-width hero banner with a background food photo, the restaurant name, a short tagline, and two buttons: **"Order Now"** (links to Menu page) and **"View Menu"** (also links to Menu page). Below the banner show a section called "Popular Dishes" pulling the top 6 items from Firestore where you can mark items as featured. Below that show the restaurant's opening hours, address, and phone number pulled from your Settings. At the very bottom embed a Google Map showing the restaurant location.

### Step 25: Menu Page

Build the page where customers browse and order food. At the top put a search bar. Below that show category tabs (pulled from Firestore `categories` collection) — clicking a tab scrolls to or filters that section. Show food items as cards in a grid. Each card has the food photo, name, short description, price, and an **"Add to Cart"** button. Only show items where availability is set to true. When the customer clicks "Add to Cart", add the item to a cart state stored in the browser (using React state or localStorage). Show a floating cart button at the bottom right with the current item count.

### Step 26: Food Detail Page

Build the detail view that opens when a customer clicks on a food card. You can build this as a full page or a popup modal — a popup is smoother. Show a large food photo, full name, full description, ingredients, allergen info, and base price. If the item has options (size, spice level, extras), show them as selectable buttons or checkboxes. Each option that costs extra should show the additional price next to it. Show a quantity selector (+/-) and an **"Add to Cart"** button at the bottom that includes the chosen options and updated price.

### Step 27: Cart Page

Build the cart page showing everything the customer has selected. List each item with its photo, name, chosen options, quantity controls (+/-), unit price, and line total. If the customer sets quantity to zero, remove the item. Below the list add a promo code input field with an **"Apply"** button — check the code against Firestore `promo_codes` and apply the discount if valid. Show a price breakdown: subtotal, discount (if any), delivery fee (only if delivery order), tax calculated from your settings, and grand total. Add two buttons at the bottom: **"Continue Shopping"** goes back to Menu, and **"Proceed to Checkout"** goes to Checkout page.

### Step 28: Checkout Page

Build the checkout page. At the top show two tabs: **Walk-in** and **Delivery**. Walk-in tab shows fields for name, phone, table number (dropdown showing available tables from Firestore), and special instructions. Delivery tab shows fields for name, phone, street address, apartment or floor, and delivery notes. In the middle show payment method options as selectable cards: Cash, Credit/Debit Card, and Online Pay (Stripe). On the right side show the order summary with all items and the final total. At the bottom put a **"Place Order"** button. When clicked, if paying by card or online, trigger Stripe payment flow. Once payment is confirmed (or if paying cash), write the order to the `orders` collection in Firestore and redirect to the Order Confirmation page.

### Step 29: Order Confirmation Page

Build the page shown right after a successful order. Show a large green checkmark or success icon at the top. Below show the order ID (make this easy to copy), a list of all ordered items with quantities and prices, the total paid, the order type, the estimated time (pull from Settings — e.g. "Ready in 20 minutes" for walk-in, "Delivery in 45 minutes" for delivery), and the customer's name or table number. Add a big **"Track My Order"** button that links to the Order Tracking page for this order. Also send a confirmation email to the customer using an email service — this can be done through a Firebase Cloud Function or an API route in Next.js.

### Step 30: Order Tracking Page

Build the live tracking page. Show the order ID at the top. Below show a horizontal or vertical step progress bar with 5 steps: Order Placed, Confirmed, Preparing, Ready / Out for Delivery, Delivered. The current step is highlighted and all previous steps are shown as completed. Use Firebase real-time listener on the specific order document so the status updates automatically on screen without the customer needing to refresh. Show an estimated time remaining below the progress bar. Also show a summary of the ordered items at the bottom.

### Step 31: Customer Profile Page

Build the profile page for logged-in customers. Show a form with fields for name, email, and phone that the customer can edit and save. Below that show a **"Saved Addresses"** section where the customer can add, edit, or delete delivery addresses. Each address has a label (like "Home" or "Work"), full address, and a "Set as Default" option. Saving updates the `users` collection in Firestore. Add a **"Change Password"** button that sends a password reset email via Firebase Authentication.

### Step 32: Order History Page

Build the page showing the customer's past orders. Pull all orders from Firestore where the customer ID matches the logged-in user. Show them in a list sorted by newest first. Each row shows the order date, order ID, a brief summary of items (e.g. "Burger x1, Fries x2"), total price, and a status badge. Add a **"View Details"** button that expands or opens the full order. Add a **"Reorder"** button that adds the exact same items back to the cart with one click.

### Step 33: Notifications Page

Build the notifications page for the customer. Pull notifications from the `notifications` collection in Firestore filtered by the logged-in customer's ID. Show them as a list with the newest at the top. Each item shows an icon (order update, promotion, etc.), the message text, and the time it was sent. Unread notifications have a colored background or bold text. When the customer clicks a notification, mark it as read in Firestore and if it is an order update, navigate them to the Order Tracking page for that order. Show the unread count as a badge on the bell icon in the navbar.

---

## PHASE 5 — REAL-TIME & NOTIFICATIONS

### Step 34: Connect Real-Time Order Updates

Go back to the Orders Management page (Admin Step 15) and the Order Tracking page (Customer Step 30) and make sure both use Firebase real-time listeners. When an admin changes an order status on the Admin Orders page, the customer's Order Tracking page should update within seconds automatically. Also write a new notification document to the `notifications` collection every time an order status changes, so the customer sees it on their Notifications page.

### Step 35: Send Email Confirmations

Set up a simple email sending service using an API route in Next.js. When an order is placed (Step 28), call this API route with the order details and customer email. The API route uses a service like SendGrid or Resend to send a nicely formatted email showing the order confirmation. Do the same when the order is delivered — send a "Your order has been delivered" email.

---

## PHASE 6 — TESTING

### Step 36: Test the Full Customer Flow

Open your website as a regular customer. Register a new account. Browse the menu, click on a food item, add it to cart with options, go to cart, apply a promo code, go to checkout as both walk-in and delivery, complete a test payment with Stripe's test card number, see the confirmation page, watch the tracking page, and check that the notification appeared. Fix anything that breaks.

### Step 37: Test the Full Admin Flow

Log in as admin. Add a new category, add a new menu item with a photo, check it appears on the customer menu page. Go to the Orders Management page and find the test order you placed in Step 36. Move it through each status step. Confirm the customer's tracking page updates in real time. Check the Dashboard numbers updated. Test the promo code page by creating a code and using it in a customer order.

### Step 38: Test on Mobile

Open the website on a phone or use your browser's mobile view tool. Check that every page looks good on a small screen — especially the Menu page, Cart, Checkout, and the Admin Orders page. Fix any layout issues. The most important pages to be mobile-friendly are the customer-facing ones since most people order from their phone.

---

## PHASE 7 — DEPLOYMENT

### Step 39: Deploy to Vercel

Connect your GitHub repository to Vercel. Add all your environment variables in the Vercel dashboard (Firebase keys, Stripe keys, email service keys). Click Deploy. Vercel will build and publish your website automatically. Every time you push new code to GitHub, Vercel will redeploy automatically.

### Step 40: Final Checks After Deployment

Visit the live URL and go through the full order flow one more time on the real deployed site. Check that Firebase is connected, Stripe payments work in live mode (switch from test keys to live keys), emails are being sent, and real-time updates work. Share the admin URL with restaurant staff and train them on how to use the Orders Management page and Menu Management page.

---

## Build Order Summary

| Phase | Steps | What You're Building              |
| ----- | ----- | --------------------------------- |
| 1     | 1–4   | Project setup, Firebase, Stripe   |
| 2     | 5–7   | Login, Register, Route Protection |
| 3     | 8–22  | All Admin Pages                   |
| 4     | 23–33 | All Customer Pages                |
| 5     | 34–35 | Real-time updates, Email          |
| 6     | 36–38 | Testing                           |
| 7     | 39–40 | Deploy & Go Live                  |

---
