# API bridge

The public frontend calls `/api/*` on the main domain. `index.php` forwards those requests to the Cloudflare Worker backend, keeping the browser on the same origin.
