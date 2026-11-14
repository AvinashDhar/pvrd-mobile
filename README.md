# OM PVRD

iOS and Android catalogue. It reads products, images, and accounts from the website API at `/api/v1`. Store releases live in this repository. The website stays in its own repository.

## Run

This app needs Node.js 22.13 or newer.

1. Start the website so it is reachable on port 3000.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
3. From this folder, run `npm start`, then open iOS or Android.

Guests see MRP. A signed-in retailer or carpenter sees the dealer rate. A contractor account stays pending until an administrator approves it on the website.
