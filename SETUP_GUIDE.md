# Stock Count App - Complete Setup Guide

## Step 1: Run the SQL Migration (ONE TIME ONLY)

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Open the file `supabase/migrations/002_user_management.sql` from your project
4. **Copy the entire contents** and paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for "Success. No rows returned" message
7. **Done!** You'll never need to edit SQL again - everything else is done through the UI

## Step 2: Set Up Your First Admin User

### Option A: Through the App (After Migration)

1. **Register an account**:
   - Go to your deployed app URL
   - Click "Register" or go to `/register`
   - Enter your email and password
   - Click "Register"

2. **Make yourself admin** (one-time SQL - this is the ONLY exception):
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Find your user email and **copy the UUID** (the long string in the "UUID" column)
   - Go to **SQL Editor** and run:
   ```sql
   INSERT INTO user_roles (id, role, shop_id, must_change_password)
   VALUES ('YOUR_UUID_HERE', 'admin', NULL, false)
   ON CONFLICT (id) 
   DO UPDATE SET 
     role = 'admin',
     shop_id = NULL,
     must_change_password = false;
   ```
   Replace `YOUR_UUID_HERE` with your actual UUID
   
   **Note**: This query works whether you already have a user_roles entry or not.

3. **Refresh the app** - You should now see "Users" in the sidebar!

### Option B: Create Admin Through UI (After First Admin Exists)

Once you have one admin, you can create all other users (including more admins) through the UI:
- Go to **Dashboard** → **Users** → **Create User**
- Enter email, set password, choose role
- Done!

## Step 3: Import Your Excel File

1. **Go to Dashboard** → **Import** (or `/dashboard/items/import`)
2. **Upload your Excel file** (the one with multiple sheets, one per shop)
3. **Select which shops to import** (or select all)
4. **Click "Import"**
5. Wait for confirmation - all shops and items will be created automatically!

## Step 4: Create User Accounts for Your Staff

1. **Go to Dashboard** → **Users** → **Create User**
2. **Enter details**:
   - Email: `staff@example.com`
   - Password: Set a temporary password (e.g., `TempPass123!`)
   - Role: Choose `Staff` or `Admin`
3. **Click "Create User"**
4. **Assign shops** to the user:
   - Click the **Edit** icon next to the user
   - Scroll to **"Shop Assignments"**
   - **Check the boxes** for shops this user should access
   - Click **"Save Assignments"**

## Step 5: Share Login Credentials

1. **For new users**:
   - Share the email and temporary password you set
   - Tell them: "You'll be asked to change your password on first login"

2. **If user forgets password**:
   - Go to **Users** → Click **Edit** on their account
   - Click **"Reset Password"**
   - A temporary password will appear - **share this with them**
   - They'll be forced to change it on next login

## Step 6: Monthly Shop Assignments

Each month, assign shops to users:

1. **Go to Users** → Click **Edit** on a user
2. **Scroll to "Shop Assignments"**
3. **Uncheck old shops**, **check new shops** for this month
4. **Click "Save Assignments"**
5. Users will immediately see only their assigned shops when they log in

## How It Works

### User Roles

- **Admin**: 
  - Can see all shops
  - Can create/manage users
  - Can assign shops to anyone
  - Can import Excel files
  - Full access to everything

- **Staff**: 
  - Can see only assigned shops
  - Can count/update stock
  - Can view reports for assigned shops

### Real-Time Sync

- All stock updates sync **instantly** across all devices
- No more data loss - changes are saved immediately to Supabase
- Multiple people can count the same shop simultaneously
- Changes appear in real-time for everyone

### Password Management

- **First Login**: User must change password immediately
- **Password Reset**: Admin generates temporary password, user changes it on next login
- **Security**: All passwords are securely hashed by Supabase

## Troubleshooting

### "I can't see the Users menu"
- Make sure you ran the SQL migration
- Make sure your user has `role = 'admin'` in the `user_roles` table

### "User can't see any shops"
- Go to Users → Edit that user
- Make sure shops are assigned in "Shop Assignments" section
- Click "Save Assignments"

### "Import isn't working"
- Check that your Excel file has the correct format:
  - Multiple sheets (one per shop)
  - Columns: Productinformatie, Verpakkings eenheid, Aantal, Losse stuks
  - Category headers in bold (IJSJES, DRANK, ETEN, etc.)

### "Real-time sync not working"
- Make sure you ran the SQL migration (it enables real-time)
- Check your Supabase project settings → Database → Replication
- Make sure `shop_stock` table has real-time enabled

## Next Steps

1. ✅ Run SQL migration
2. ✅ Create your admin account
3. ✅ Import Excel file
4. ✅ Create user accounts
5. ✅ Assign shops to users
6. ✅ Start counting!

That's it! Everything else is managed through the UI - no more SQL needed! 🎉

