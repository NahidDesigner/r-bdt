# Design Guidelines: Multi-Tenant E-Commerce Platform

## Design Approach

**Three-Part Design Strategy:**

1. **Public Storefronts**: Reference Shopify, Etsy product pages - conversion-focused, trust-building
2. **Tenant Dashboard**: Inspired by Linear/Notion - clean, productivity-oriented
3. **Admin Panel**: Material Design approach - structured, data-dense interface

## Typography System

**Font Families:**
- Primary: Inter (body text, UI elements)
- Display: Plus Jakarta Sans (headings, CTAs)

**Hierarchy:**
- Hero headings: text-4xl md:text-5xl font-bold
- Section headings: text-2xl md:text-3xl font-semibold  
- Product titles: text-xl font-semibold
- Body text: text-base leading-relaxed
- Captions/meta: text-sm text-gray-600

## Layout System

**Spacing Scale:** Use Tailwind units of 3, 4, 6, 8, 12, 16, 20
- Component padding: p-4 md:p-6
- Section spacing: py-12 md:py-20
- Card gaps: gap-6
- Button padding: px-6 py-3

**Container Widths:**
- Storefront content: max-w-6xl
- Product pages: max-w-4xl
- Dashboards: max-w-7xl
- Forms: max-w-md

## Component Library

### Public Storefronts (Mobile-First, High-Converting)

**Product Landing Page Structure:**
1. Hero Section (80vh on desktop, auto on mobile):
   - Full-width product image with subtle overlay
   - Product name overlay (text-4xl font-bold text-white)
   - Price badge (floating, top-right)
   - Blurred-background CTA button

2. Product Details Section:
   - Two-column on desktop (image gallery | details)
   - Sticky "Add to Cart" on mobile
   - Trust badges (Cash on Delivery, Free Returns icons)
   - Product description with rich formatting

3. Quick Checkout Section:
   - Inline checkout form (not modal)
   - Three fields: Name, Phone, Address
   - Quantity selector with +/- buttons
   - Shipping calculator (Inside/Outside Dhaka toggle)
   - Total breakdown card
   - Prominent "Confirm Order (COD)" button

**Trust Elements:**
- WhatsApp floating button (bottom-right)
- Security badges (SSL, Verified Seller icons)
- Customer count indicator ("1,245+ orders delivered")

**Navigation:**
- Minimal header: Store logo + Contact button
- Sticky "Order Now" bar on scroll (mobile)

### Tenant Dashboard (Productivity Focus)

**Layout Pattern:**
- Sidebar navigation (w-64, collapsible on mobile)
- Top bar with store selector + notifications
- Main content area (p-6 md:p-8)

**Dashboard Cards:**
- Stats overview: 4-column grid (2-column mobile)
- Clean white cards with subtle shadows
- Icon + metric + trend indicator
- Hover: slight lift (shadow-lg transition)

**Data Tables:**
- Striped rows for orders list
- Status badges (rounded-full px-3 py-1)
- Action buttons (icon-only on mobile)
- Responsive: cards view on mobile, table on desktop

**Forms:**
- Floating labels pattern
- Clear validation states
- Multi-step for complex forms (product creation)
- Auto-save indicators

### Admin Panel (Enterprise Structure)

**Master-Detail Layout:**
- Left panel: Tenant list (w-80)
- Right panel: Selected tenant details
- Filters and search (sticky top)

**Control Components:**
- Toggle switches for plan features
- Dropdown selectors for plans
- Status indicators (color-coded dots)
- Bulk action toolbar

## Images

**Storefront Hero Images:**
- Full-width hero image showcasing product in use
- Aspect ratio: 16:9 on desktop, 4:3 on mobile
- Overlay gradient for text readability
- Example context: Product being used by happy customer, lifestyle setting

**Product Gallery:**
- Primary image: Large, zoomable
- Thumbnail strip: 4-5 images, horizontal scroll
- Square aspect ratio for consistency

**Dashboard:**
- Empty states: Illustration style (undraw.co aesthetic)
- Icons: Heroicons throughout
- No decorative images in admin/dashboard areas

## Form & Input Standards

**All Input Fields:**
- Border: border-2 border-gray-300
- Focus: ring-2 ring-blue-500 border-blue-500
- Padding: px-4 py-3
- Rounded: rounded-lg
- Label: text-sm font-medium mb-2

**Buttons:**
- Primary: bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold
- Secondary: bg-white border-2 border-gray-300 hover:border-gray-400
- Danger: bg-red-600 hover:bg-red-700
- Disabled: opacity-50 cursor-not-allowed

**Checkout Form (Critical):**
- Single column layout
- Large touch targets (min 44px height)
- Phone input with Bangladesh flag prefix
- Address: textarea with 3-row minimum
- Clear labels with helpful hints

## Responsive Breakpoints

- Mobile-first approach
- sm: 640px (small tablets)
- md: 768px (tablets)
- lg: 1024px (desktop)
- xl: 1280px (large desktop)

**Mobile Priorities:**
- Storefront checkout must work flawlessly on mobile
- Dashboard: hamburger menu, collapsed sidebar
- Forms stack vertically
- Tables convert to card view

## Key Principles

1. **Trust First**: Bangladesh context requires visible trust signals
2. **Speed Optimized**: Fast loading, minimal dependencies
3. **Conversion Focused**: Reduce friction in checkout
4. **Data Clarity**: Clear order tracking, shipping costs upfront
5. **Accessibility**: WCAG AA compliance, proper contrast ratios, keyboard navigation