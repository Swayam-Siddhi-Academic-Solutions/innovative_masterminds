# FINAL DEPLOYMENT CHECKLIST

Configured Supabase Project URL:
https://ohqyhnsrjycizmhykqcp.supabase.co

Configured browser-safe Publishable Key:
sb_publishable_1i9qcwrxWAistFqcFYnOag_3ju2FU_P

Configured Gallery admin email:
im.abhilash.ssas@gmail.com

## Before uploading to GitHub

### 1. Run the SQL setup
In Supabase:
SQL Editor → New query

Open `supabase-setup.sql`, copy the whole file into the SQL Editor, and click Run.

### 2. Create the admin Auth user
In Supabase:
Authentication → Users

Create a user with exactly:
im.abhilash.ssas@gmail.com

Set a strong password known only to you.

Do not put that password in GitHub.

### 3. Upload the website to GitHub Pages
Upload the CONTENTS of this package to the repository root.

Keep these files:
- index.html
- services.html
- reviews.html
- tuition.html
- gallery.html
- style.css
- script.js
- gallery-supabase.js
- supabase-config.js
- assets/
- .nojekyll

### 4. Test
Open the live site → Gallery.

Normal visitor:
- Can view public media.
- Cannot see upload/delete controls.

Admin:
- Click Admin Login.
- Sign in with im.abhilash.ssas@gmail.com and the Supabase Auth password.
- Upload Media / Delete / Sign Out controls should appear.

## Security
The Publishable Key is intended for browser use.
Never expose:
- service_role
- sb_secret_...
- database password
- Supabase account password
