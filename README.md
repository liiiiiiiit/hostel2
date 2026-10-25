# YEREVANHUB

React 19 / Vite 8 demonstration of hostel bookings, rental inquiries, travel guides and a four-language translator.

## Development

Validated with Node 24.19.0 and npm 11.9.0. Use the committed lockfile:

```sh
npm ci
npm run dev -- --strictPort
```

The development server listens on port 3000. Run checks separately so each failure remains visible:

```sh
npm run lint
npm test
npm run build
```

`lint` runs TypeScript. Tests use Node's test runner with `tsx`. The build is emitted to `dist/`. No separate backend or database process is connected to the application.

## Demo data and accounts

Data is seeded from `src/services/mockData.ts` and saved in the browser's `yerevanhub_store_v1` localStorage entry. Language preference is stored separately. The sign-in dialog provides the existing demo account credentials. Passwords are checked; newly created accounts store a salted PBKDF2 verifier instead of a plaintext password. Web Crypto requires HTTPS or a trusted local origin such as localhost.

Existing custom accounts from the earlier passwordless implementation have no password verifier and cannot sign in using an arbitrary password. The shipped demo accounts still work. Existing custom accounts require an explicit password reset/migration; creating a new local demo account with another email also works. The application never invents a password for an existing custom account.

This is a local demonstration, not production authentication. Users can inspect and change their own browser storage and bundled mock data. Real deployment needs server-side authentication, authorization, session handling, protected guest/door-code data, and transactional booking/coupon persistence. Tracking links resolve records in the same browser; they do not provide cross-device booking access.

## Optional services

The phrasebook translator works without credentials. Gemini translation and the browser's external fonts/photos are optional. Live Gemini calls were not tested. `VITE_` variables are embedded in client JavaScript: do not use them to protect a production API secret. A production Gemini integration needs a server-side endpoint.

See [CODE_REVIEW.md](CODE_REVIEW.md) for the defects repaired and validation evidence.
