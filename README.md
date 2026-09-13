# Innovative Masterminds — Multi-Page GitHub Website

## Home page
`index.html` shows only:
- Profile / hero
- About
- Contact information

## Separate navigation pages
- `services.html` — Verticals
- `reviews.html` — Reviews
- `tuition.html` — Private Tuitions
- `gallery.html` — Gallery

## Profile photo
The new navy-blazer photo is already embedded as `assets/abhilash.jpg`.

## GitHub Pages upload
Upload all files and the `assets` folder into the repository root.
Then use:
Settings → Pages → Deploy from branch → main → /(root)


## Permanent Supabase Gallery version

This package now includes a real cloud-backed Gallery.

New files:
- `gallery-supabase.js`
- `supabase-config.js`
- `supabase-setup.sql`
- `SUPABASE_SETUP.md`

Before the permanent Gallery can work:
1. Create a Supabase project.
2. Run `supabase-setup.sql`.
3. Create the admin Auth user `im.abhilash.ssas@gmail.com`.
4. Put only the Project URL and browser-safe Publishable/anon key into `supabase-config.js`.
5. Upload the updated site to GitHub Pages.

Never put a Supabase `service_role` or secret key in this public website.
