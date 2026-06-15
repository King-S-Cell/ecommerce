# ecommerce

Modern e-commerce starter with a React storefront and an Express API.

## Stack

- Frontend: React + Vite
- Backend: Express
- Styling: custom CSS with a responsive storefront layout

## Layout

- `client/` React storefront
- `server/` Express API
- `shared/` reserved for future cross-app utilities

## Run

1. Install dependencies: `npm install`
2. Start both apps: `npm run dev`
3. Build the client: `npm run build`

The API runs on `http://localhost:4000` and the client runs on `http://localhost:5173` during development.

## Auth

- Customer accounts can register and sign in from the app.
- Admin access is seeded with `admin@nimbus.local` / `Admin123!`.
- Checkout requires a signed-in user token.