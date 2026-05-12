# Dopamind 🌙

Gentle productivity for wandering minds.

An ADHD-friendly productivity app built with vanilla JS and wrapped in Capacitor for iOS & Android.

## Features

- 🍰 **Task Baker** — Auto-slice big tasks into tiny, doable micro-steps
- ⏳ **Soft Timer** — Visual circle timer with gentle haptics, no harsh ticking
- 🅿️ **Parking Lot** — One-tap brain dump with auto-sort by vibe
- 🫨 **Native Haptics** — Gentle pulses and success vibrations
- 🔔 **Local Notifications** — Timer completion even when app is backgrounded
- 💾 **Persistent Storage** — Your tasks survive app restarts

## Tech Stack

- Vanilla HTML/CSS/JS
- [Capacitor](https://capacitorjs.com/) for native iOS/Android wrapper
- `@capacitor/haptics` — gentle haptic feedback
- `@capacitor/local-notifications` — timer push notifications
- `@capacitor/preferences` — native key-value storage

## Project Structure

```
dopamind/
├── www/              ← Web source (HTML/CSS/JS)
├── android/          ← Android Studio project
├── ios/              ← Xcode project
└── capacitor.config.json
```

## Running Locally

```bash
cd dopamind
npx serve www -p 8080
# Open http://localhost:8080
```

## Building Mobile

**Android:**
```bash
npx cap sync
npx cap open android
```

**iOS:**
```bash
npx cap sync
npx cap open ios
```

## License

MIT
