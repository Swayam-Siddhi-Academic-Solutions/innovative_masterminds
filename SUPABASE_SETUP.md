# Supabase Permanent Gallery Setup

This website is already coded for a permanent Supabase photo/video gallery.

You only need to do this **once**.

## What the finished setup does

- Anyone visiting the website can view the Gallery.
- Only the authorised admin account can sign in.
- Only that admin can see **Upload Media** and **Delete** controls.
- Uploaded photos/videos remain online after closing the browser.
- Deleting from the Gallery permanently removes the item from Supabase Storage.
- GitHub Pages continues to host the website itself.

---

## 1. Create a Supabase project

Go to **https://supabase.com/** and create/sign in to an account.

Create a new project. Give it any sensible name, for example:

`Innovative Masterminds Gallery`

Wait for the project to finish provisioning.

---

## 2. Run the one-time SQL setup

In your Supabase project, open the **SQL Editor**.

Open the file in this website package:

`supabase-setup.sql`

Copy the entire contents into the SQL Editor and run it.

This creates:

- a public Storage bucket named `gallery`
- a 50 MB per-file limit in this website setup
- image/video MIME restrictions
- a public listing policy
- admin-only upload/delete/update policies

The authorised admin email in the supplied setup is:

`im.abhilash.ssas@gmail.com`

If you want to use a different admin email, change it in **both**:
- `supabase-setup.sql`
- `supabase-config.js`

before publishing.

---

## 3. Create your admin login

Open **Authentication > Users** in Supabase.

Create a user with:

`im.abhilash.ssas@gmail.com`

Set a strong password that only you know.

Do **not** put this password anywhere in GitHub or in the website files.

The password is entered only in the Admin Login popup on your live Gallery page.

---

## 4. Copy the browser-safe Supabase settings

In the Supabase dashboard, find your project API settings.

You need only:

1. **Project URL**
2. **Publishable Key** (or legacy browser-safe `anon` key)

Open this website file:

`supabase-config.js`

Replace:

`PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`

with your project URL.

Replace:

`PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE`

with the browser-safe Publishable/anon key.

### Never use:
- `service_role`
- secret key
- database password

Those must never be placed in a public GitHub repository.

---

## 5. Upload the updated website to GitHub

Upload the contents of this ZIP to your GitHub Pages repository root.

Important files now include:

- `gallery.html`
- `gallery-supabase.js`
- `supabase-config.js`
- `supabase-setup.sql`
- `SUPABASE_SETUP.md`

The SQL and setup guide do not affect the public website. They are included for your reference.

Commit the changes.

GitHub Pages should automatically redeploy.

---

## 6. Test as a normal visitor

Open:

`Gallery`

You should see the public gallery.

The **Upload Media** and **Sign Out** buttons should not appear unless you are logged in as admin.

---

## 7. Sign in as admin

On the Gallery page click:

`Admin Login`

Enter:

- Email: `im.abhilash.ssas@gmail.com`
- The password you created in Supabase

After successful login:

- `Admin Login` disappears
- `Upload Media` appears
- `Sign Out` appears
- Delete buttons appear for media cards

---

## 8. Upload photos/videos

Click:

`＋ Upload Media`

Choose files or drag them into the uploader.

Supported formats in this setup:

### Images
- JPEG/JPG
- PNG
- WebP
- GIF

### Videos
- MP4
- WebM
- MOV / QuickTime

This package enforces a **50 MB per-file** limit. You can change that later in the Supabase bucket settings and code if needed.

---

## Security model

The Publishable/anon key is allowed in browser code.

It does **not** grant admin upload/delete access by itself.

Upload and delete permissions are enforced by Supabase Row Level Security based on the authenticated admin email.

Never replace the Publishable/anon key with a `service_role` or secret key.
