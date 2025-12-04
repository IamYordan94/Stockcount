# Stock Count App - User Guide

## 📋 Table of Contents
1. [Admin vs Staff - What's the Difference?](#admin-vs-staff)
2. [How the System Works](#how-the-system-works)
3. [Starting a Stock Count Period](#starting-a-stock-count-period)
4. [For Admins - Step by Step](#for-admins---step-by-step)
5. [For Staff - Step by Step](#for-staff---step-by-step)
6. [Common Questions](#common-questions)

---

## Admin vs Staff

### 👑 **Admin Role**
**What admins can do:**
- ✅ See **ALL shops** in the system
- ✅ Create and manage user accounts (create staff, make other admins)
- ✅ Assign shops to staff members
- ✅ Add, edit, and delete products
- ✅ View all reports and download Excel files
- ✅ Track wastage
- ✅ View inventory (all products organized by category)
- ✅ Reset passwords for any user

**What admins CANNOT do:**
- ❌ Nothing! Admins have full access to everything

### 👤 **Staff Role**
**What staff can do:**
- ✅ See **ONLY shops assigned to them** by admin
- ✅ Count stock in their assigned shops
- ✅ Update quantities (packaging units and loose pieces)
- ✅ View reports for their assigned shops only

**What staff CANNOT do:**
- ❌ Cannot see shops they're not assigned to
- ❌ Cannot create users
- ❌ Cannot download Excel files
- ❌ Cannot add/edit products
- ❌ Cannot access admin features

---

## How the System Works

### The Big Picture

1. **Admin sets up the system:**
   - Creates shops (or imports from Excel)
   - Adds products to the catalog
   - Creates staff user accounts
   - Assigns shops to staff

2. **Monthly stock count period:**
   - Admin assigns which shops each staff member will count this month
   - Staff log in and see only their assigned shops
   - Staff visit shops and count stock using their phones
   - All updates sync in real-time (no data loss!)

3. **After counting:**
   - Admin can view reports and download Excel files
   - Admin can track wastage
   - Data is ready to pass to the next team

### Real-Time Sync
- ⚡ All changes save **instantly** to the cloud
- ⚡ Multiple people can count the same shop at the same time
- ⚡ Changes appear immediately for everyone
- ⚡ No more data staying only on phones!

---

## Starting a Stock Count Period

### Overview
A "stock count period" is when you assign shops to staff for the month. You don't need to "start" anything special - just assign shops to users, and they'll see them immediately!

### The Process

**Step 1: Assign Shops to Staff**
- Go to **Users** → Click **Edit** on a staff member
- Scroll to **"Shop Assignments"**
- Check the boxes for shops this person should count this month
- Click **"Save Assignments"**
- That's it! The staff member will immediately see these shops when they log in

**Step 2: Staff Count Stock**
- Staff log in and see their assigned shops
- They click on a shop
- They count each product and update quantities
- Changes save automatically

**Step 3: Admin Downloads Reports**
- After counting is done, admin goes to **Reports**
- Can download individual shop reports or the full workbook
- Excel files are ready to share with the next team

---

## For Admins - Step by Step

### First Time Setup

#### 1. Create Your First Admin Account
- Register/login with your email
- You'll be asked to choose your role - choose **Admin**
- Set your display name and password

#### 2. Add Shops and Products
**Option A: Use Seed Data (Recommended)**
- Run the seed SQL file in Supabase (if you have one)
- All shops and products will be created automatically

**Option B: Add Manually**
- Go to **Items** → Click **"Add Product"**
- Fill in product details (name, category, packaging unit, main category)
- Products are now available for all shops

#### 3. Create Staff Accounts
1. Go to **Dashboard** → **Users** → **"Create User"**
2. Fill in:
   - **Email**: `staff@example.com`
   - **Display Name**: `John Smith` (this shows instead of email)
   - **Password**: Set a temporary password (e.g., `TempPass123!`)
   - **Role**: Choose **Staff**
3. Click **"Create User"**
4. The user will be forced to change their password on first login

#### 4. Assign Shops to Staff
1. Go to **Users** → Find the staff member → Click **Edit** (pencil icon)
2. Scroll down to **"Shop Assignments"**
3. **Check the boxes** for shops this person should count
4. Click **"Save Assignments"**
5. The staff member will immediately see these shops when they log in

### Monthly Stock Count Workflow

#### Before Counting Starts
1. **Review current assignments:**
   - Go to **Users** → Check who has which shops assigned
   
2. **Update assignments for the month:**
   - Click **Edit** on each staff member
   - Uncheck old shops, check new shops for this month
   - Click **"Save Assignments"**
   - Repeat for all staff members

3. **Notify staff:**
   - Tell them which shops they need to count
   - Share login credentials if needed

#### During Counting
- Staff will be counting stock in real-time
- You can monitor progress by checking **Reports**
- All changes sync instantly - no action needed from you

#### After Counting
1. **Download Reports:**
   - Go to **Reports**
   - Click **"Download Excel"** for individual shops
   - Or click **"Download All Shops (Excel)"** for the full workbook
   - Excel files are ready to share with the next team

2. **Track Wastage (Optional):**
   - Go to **Wastage** → Click **"Add Wastage"**
   - Enter date, shop, product, quantity, and notes
   - Download wastage Excel when needed

3. **Prepare for Next Month:**
   - Update shop assignments for next month's count
   - Clear old assignments if needed

### Managing Users

#### Create New User
1. **Users** → **"Create User"**
2. Enter email, display name, password, and role
3. Click **"Create User"**
4. Assign shops to the user (see step 4 above)

#### Reset User Password
1. **Users** → Click **Edit** on the user
2. Click **"Reset Password"**
3. A temporary password will appear
4. **Share this password with the user**
5. They'll be forced to change it on next login

#### Change User Role
1. **Users** → Click **Edit** on the user
2. Change the **Role** dropdown (Admin or Staff)
3. Click **"Save Changes"**

#### Update Shop Assignments
1. **Users** → Click **Edit** on the user
2. Scroll to **"Shop Assignments"**
3. Check/uncheck shops as needed
4. Click **"Save Assignments"**

### Managing Products

#### Add New Product
1. Go to **Items** → Click **"Add Product"**
2. Fill in:
   - **Product Name**: e.g., "OLA Raket"
   - **Category**: e.g., "IJSJES", "DRANK", "ETEN" (shop-level category)
   - **Packaging Unit Description**: e.g., "per 54 a 55 ml"
   - **Main Category**: Floor or Catering (for inventory organization)
3. Click **"Create Product"**

#### Edit Product
1. Go to **Items**
2. Find the product → Click the **Edit** icon (pencil)
3. Update any fields
4. Click **"Save Changes"**

#### View All Products
- Go to **Inventory** (admin only)
- See all products organized by main category (Floor/Catering)
- Then organized by shop category (IJSJES, DRANK, etc.)

---

## For Staff - Step by Step

### First Time Login

1. **Log in** with the email and temporary password provided by admin
2. **You'll be forced to change your password** - enter a new password
3. **Set your display name** (optional - go to Profile)
4. You're ready to go!

### Counting Stock

#### Step 1: View Your Assigned Shops
1. Log in to the app
2. Go to **Shops** (in the sidebar)
3. You'll see **only the shops assigned to you** by admin
4. If you see no shops, contact admin - they need to assign shops to you

#### Step 2: Select a Shop
1. Click on a shop card
2. You'll see a list of all products in that shop
3. Products are grouped by category (IJSJES, DRANK, ETEN, etc.)

#### Step 3: Count Stock
1. Find the product you want to count
2. Click **Edit** (or the quantity field)
3. Enter the quantities:
   - **Packaging Units**: Number of packages/boxes
   - **Loose Pieces**: Individual items not in packages
4. Click **Save** (or the checkmark)
5. ✅ **Changes save automatically** - no need to click a "Submit" button!

#### Step 4: Continue Counting
- Repeat for all products in the shop
- You can count in any order
- Changes sync in real-time (admin can see them immediately)

#### Step 5: Move to Next Shop
- Go back to **Shops**
- Select the next shop
- Repeat the counting process

### Viewing Reports

1. Go to **Reports**
2. You'll see your assigned shops
3. Click on a shop to view its stock report
4. You can see totals and all counted items

### If You Forget Your Password

1. Contact your admin
2. They'll reset your password
3. They'll give you a temporary password
4. Log in with the temporary password
5. You'll be asked to set a new password

---

## Common Questions

### Q: How do I "start" a stock count period?
**A:** There's no "start" button! Just assign shops to staff members, and they'll see them immediately. The stock count period starts when you assign shops.

### Q: Can multiple people count the same shop?
**A:** Yes! Multiple staff members can count the same shop at the same time. All changes sync in real-time.

### Q: What if a staff member needs to count a shop they're not assigned to?
**A:** Admin needs to assign that shop to them first. Go to **Users** → **Edit** → **Shop Assignments** → Check the shop → **Save**.

### Q: How do I change which shops a staff member counts?
**A:** Go to **Users** → Click **Edit** on the staff member → Scroll to **Shop Assignments** → Uncheck old shops, check new shops → Click **Save Assignments**.

### Q: Can I see who counted what?
**A:** Yes! Go to **History** to see all stock changes with timestamps and who made them.

### Q: How do I download the stock count data?
**A:** 
- **For individual shop**: Go to **Reports** → Click on a shop → Click **"Download Excel"** (admin only)
- **For all shops**: Go to **Reports** → Click **"Download All Shops (Excel)"** (admin only)

### Q: What's the difference between "Packaging Units" and "Loose Pieces"?
**A:**
- **Packaging Units**: Number of boxes, packages, or containers (e.g., 5 boxes of ice cream)
- **Loose Pieces**: Individual items not in packages (e.g., 12 loose bottles)

### Q: Can staff edit products?
**A:** No, only admins can add/edit products. Staff can only count/update stock quantities.

### Q: What happens if I lose internet connection?
**A:** Changes will save when connection is restored. The app works offline and syncs when back online.

### Q: How do I add wastage?
**A:** (Admin only) Go to **Wastage** → Click **"Add Wastage"** → Fill in date, shop, product, quantity, and notes → Click **"Add Wastage"**.

### Q: Can I export wastage data?
**A:** Yes! (Admin only) Go to **Wastage** → Click **"Download Excel"** to get all wastage entries as an Excel file.

---

## Quick Reference

### Admin Menu
- **Dashboard**: Overview and statistics
- **Shops**: View all shops
- **Items**: Add/edit products
- **Reports**: View and download stock reports
- **History**: See all stock changes
- **Inventory**: View all products by category (admin only)
- **Wastage**: Track product wastage (admin only)
- **Users**: Manage user accounts (admin only)
- **Profile**: Update your display name and password

### Staff Menu
- **Dashboard**: Overview
- **Shops**: View assigned shops only
- **Items**: View product catalog (read-only)
- **Reports**: View reports for assigned shops only
- **History**: See stock change history
- **Profile**: Update your display name and password

---

## Need Help?

If you're stuck:
1. Check this guide first
2. Contact your admin
3. Check the **History** page to see what's been happening
4. Make sure you're assigned to the correct shops (staff) or have admin access (admin)

---

**Last Updated**: December 2024

