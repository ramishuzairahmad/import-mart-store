# Import Mart Store — Cloudflare Pages

Live store: https://import-mart-store.onrender.com/ (project `import-mart-store` on Render, account ramishuzair3@gmail.com, connected to GitHub repo `ramishuzairahmad/import-mart-store`).

## Files
- `index.html` — storefront (navy + gold, same design as the old Import Mart store)
- `app.js` — renders products from `catalog.json`, cart + WhatsApp checkout
- `catalog.json` — the product list (single source of truth)
- `assets/` — hero + product photos
- `admin.html` — product admin (add / edit / delete / publish)

## How products update
`admin.html` (footer link "Store Admin") edits `catalog.json` and publishes it
straight to this GitHub repo with a Personal Access Token (Contents: Read and
write on this repo). Cloudflare auto-deploys on every push — live in ~1 minute.
Without a token, the admin can download `catalog.json` instead.

## Delivery terms (correct — do not revert)
- Rawalpindi / Islamabad: Cash on Delivery, Rs 200 delivery
- Baqi Pakistan: advance payment, Rs 300 delivery
- Fateh Jang: FREE delivery
- Advance payment par 5% discount (per product confirm)

## Contact
- WhatsApp: +92 301 5550121 (https://wa.me/923015550121)
- Email: importmartpakistan@gmail.com
- TikTok: @importmart6

## Notes
- Cart is session-only (static site, no server).
- This is a separate store from the old Muse-artifact "Import Mart Store"
  (`import-mart-store-design-preview`) — that one is untouched.
- Free Cloudflare Pages limits (Nov 2026): unlimited sites/bandwidth,
  500 builds/month, 100 projects/account, 25 MiB max per file.
