# 1. Sidebar — role-filtered navigation (Sidebar.tsx)

Each nav item now declares which roles can see it:

| Nav item                                                                             | super_admin | kitchen | delivery |
| ------------------------------------------------------------------------------------ | ----------- | ------- | -------- |
| Dashboard                                                                            | ✓           | ✓       | ✓        |
| Orders                                                                               | ✓           | ✓       | ✓        |
| Delivery                                                                             | ✓           | ✗       | ✓        |
| Menu, Categories, Tables, Staff, Customers, Promo Codes, Payments, Reports, Settings | ✓           | ✗       | ✗        |

---

# 2. AdminGuard — route protection (AdminGuard.tsx)

If a kitchen or delivery user navigates directly to a restricted URL, they are immediately redirected to /admin/orders. No changes needed in individual pages.

kitchen allowed routes: /admin/dashboard, /admin/orders
delivery allowed routes: /admin/dashboard, /admin/orders, /admin/delivery

---

# 3. Orders page — role-appropriate tabs (orders/page.tsx)

Tabs are filtered based on who's viewing:

| Tab                                      | super_admin | kitchen | delivery |
| ---------------------------------------- | ----------- | ------- | -------- |
| All                                      | ✓           | ✓       | ✓        |
| Pending / Confirmed / Preparing          | ✓           | ✓       | ✗        |
| Ready                                    | ✓           | ✓       | ✓        |
| Out for Delivery / Delivered / Cancelled | ✓           | ✗       | ✓        |
