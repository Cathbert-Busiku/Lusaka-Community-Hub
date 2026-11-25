Lusaka Community Hub Ministry website (LCH Brand Kit v1.0)
==========================================================

HOSTING
Upload everything in this folder to any static web host (Netlify, Cloudflare Pages,
GitHub Pages, or a cPanel public_html folder). No server or database is needed.

PAGES
index.html, about.html, hubs.html, hubs/<hub>.html (7 Hubs), get-involved.html,
resources.html, contact.html, 404.html. PDFs are in downloads/.

EDITING
Pages and PDFs are generated from the source project (lch-website-v3-source.zip).
Edit content.py (Hub teams, contacts, email, website address, payment link, videos),
then run:  pip install reportlab pillow   and   python3 build.py
