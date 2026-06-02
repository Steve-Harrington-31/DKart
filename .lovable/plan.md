# DKart — Build Plan

Your spec is large (30+ pages, full admin panel, payments). I want to flag two things before I start cutting code, then propose a phased delivery.

## Stack notes (small deviations from your spec)

This project is on **TanStack Start** (not Vite + React Router). That's fine — it's React + Vite under the hood — but it means:
- Routing uses file-based routes in `src/routes/` instead of `react-router-dom`. Same UX, slightly different file layout.
- Backend is **Lovable Cloud** (managed Supabase). Same Postgres + Auth + Storage + RLS you asked for, no separate account to set up.
- State: I'll use **Zustand** as you requested.
- Styling: **Tailwind v4** is already wired. I'll set up the DKart design tokens (deep green / light green / cream, Inter font, ₹ currency) in `src/styles.css`.

## Razorpay

Razorpay needs a **Key ID + Key Secret** from your Razorpay dashboard. I'll wire the integration scaffolding, but actual live checkout won't work until you paste those keys. For Phase 1 I'll stub the payment step so the order flow is testable end-to-end (creates order, marks `payment_status = 'test'`), then swap in real Razorpay once you provide credentials.

## Phased delivery

Building all 17 customer pages + 10 admin pages + payments in one shot would be a 200KB+ patch and impossible to review. I'll ship in phases, each phase usable on its own:

**Phase 1 — Foundation (this turn)**
- Enable Lovable Cloud
- Design system (colors, fonts, tokens) in `src/styles.css`
- Full Supabase schema: `profiles`, `user_roles`, `categories`, `products`, `orders`, `order_items`, `cart`, `wishlist`, `addresses`, `reviews` + RLS + grants
- Storage buckets for product images & avatars
- Auth: email/password + Google, signup with referral code, `_authenticated` guard, `_admin` guard via `has_role()`
- Zustand stores (auth, cart, wishlist)
- Shared layout: top bar, search, bottom nav, toast (sonner)
- Landing, Login, Signup, Home (with seeded categories + products), Product Detail, Cart, Wishlist — fully working

**Phase 2**
- Search page, Categories page, Product Listing with filters/sort
- Checkout (address book + new address)
- Payment page with Razorpay scaffold (test mode stub)
- Order Confirmation, My Orders, Order Detail, Address Book, Recently Viewed
- Account page

**Phase 3 — Admin panel**
- Admin login + dashboard with stats
- Product CRUD (with image upload), Categories CRUD
- Orders management + status updates
- Users management
- Reports (charts via Recharts)

**Phase 4 — Polish**
- Real Razorpay (once you provide keys)
- Reviews & ratings UI
- Real-time stock subscriptions
- Empty-state illustrations, loading skeletons everywhere
- Coupons

## Confirm before I start

1. **OK to proceed in phases?** (Phase 1 ships this turn, ~15-20 files. Each next phase ships when you reply "next" or give feedback.)
2. **Google login on signup screen** — OK to enable now, or email/password only for Phase 1?
3. **Razorpay** — do you have the Key ID + Secret ready, or should I stub payments for now and wire Razorpay in Phase 4?
4. **Seed data** — should I seed ~6 categories and ~20 sample products with placeholder images so the app looks alive immediately?
