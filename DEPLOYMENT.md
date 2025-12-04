# Deployment Guide

## Prerequisites

1. GitHub account
2. Vercel account
3. Supabase account

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new repository on GitHub
3. Push your code:
```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Step 2: Set up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Run the SQL migration
6. Go to Settings > API to get your credentials:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY) - keep this secret!

## Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
   - `NEXT_PUBLIC_SITE_URL` - Your Vercel deployment URL (e.g., https://your-app.vercel.app)
6. Click "Deploy"

## Step 4: Configure Supabase Authentication

1. In Supabase dashboard, go to Authentication > URL Configuration
2. Add your Vercel URL to "Site URL"
3. Add your Vercel URL to "Redirect URLs" (e.g., `https://your-app.vercel.app/**`)

## Step 5: Set up First Admin User

After deployment, you'll need to manually create the first admin user:

1. Register a user through the app
2. In Supabase dashboard, go to Authentication > Users
3. Find your user and note their UUID
4. Go to SQL Editor and run:
```sql
INSERT INTO user_roles (id, role, shop_id, must_change_password)
VALUES ('<user-uuid>', 'admin', NULL, false)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  shop_id = NULL,
  must_change_password = false;
```

Replace `<user-uuid>` with the actual UUID from step 3.

**Note**: This query works whether you already have a user_roles entry or not.

## Step 6: Test the Application

1. Visit your Vercel deployment URL
2. Register/Login with your admin account
3. Test importing an Excel file
4. Test stock counting functionality
5. Verify reports and history are working

## Troubleshooting

### Database Connection Issues
- Verify environment variables are set correctly in Vercel
- Check Supabase project is active
- Verify RLS policies are set up correctly

### Authentication Issues
- Check redirect URLs in Supabase
- Verify Site URL is set correctly
- Check browser console for errors

### Import Issues
- Verify Excel file format matches expected structure
- Check browser console for parsing errors
- Verify API routes are accessible

## Production Considerations

1. **Security**:
   - Never expose SUPABASE_SERVICE_ROLE_KEY in client-side code
   - Use environment variables for all secrets
   - Regularly rotate API keys

2. **Performance**:
   - Enable Supabase connection pooling for production
   - Consider adding database indexes for frequently queried fields
   - Use Vercel's edge functions if needed

3. **Monitoring**:
   - Set up error tracking (e.g., Sentry)
   - Monitor Supabase usage and quotas
   - Set up Vercel analytics

4. **Backup**:
   - Regularly backup your Supabase database
   - Keep migration files in version control
   - Document any manual database changes

