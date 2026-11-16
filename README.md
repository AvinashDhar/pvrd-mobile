# OM PVRD

iOS and Android catalogue. It reads products, images, and accounts from the website API at `/api/v1`. Store releases live in this repository. The website stays in its own repository.

## Run

This app needs Node.js 22.13 or newer.

1. Start the website so it is reachable on port 3000.
2. Copy `.env.example` to `.env`. Leave `EXPO_PUBLIC_API_URL` as `http://127.0.0.1:3000`.
3. From this folder, run `npm start`, then open iOS or Android.

For a physical iPhone, follow [Test on an iPhone](#test-on-an-iphone). For an Android emulator, follow [Test on an Android emulator](#test-on-an-android-emulator).

Guests see MRP. A signed-in retailer or carpenter sees the dealer rate. A contractor account stays pending until an administrator approves it on the website.

## Test on an iPhone

Use Expo Go. The iPhone and the Mac need to be on the same Wi-Fi network.

### 1. Install Expo Go

On the iPhone, install Expo Go from the App Store. The first time it asks to find devices on the local network, allow that.

### 2. Use Node 22

This app needs Node.js 22.13 or newer. The Mac’s default Node may be older, which is fine for the website and too old for Expo. In the terminal you will use for the mobile commands:

```bash
nvm install 22
nvm use 22
node -v
```

`node -v` should print v22.13 or higher. Stay in that terminal for the mobile commands below.

### 3. Start the website

The phone reaches the website through the Mac’s LAN address, so bind Next.js to every interface. In a second terminal, from the website project:

```bash
npx next dev -H 0.0.0.0 -p 3000
```

Confirm the catalogue opens in the Mac browser at http://127.0.0.1:3000. Allow Node through the Mac firewall if macOS asks. Leave this terminal running.

When something is already listening on port 3000, stop it and start the website again:

```bash
kill $(lsof -t -iTCP:3000 -sTCP:LISTEN)
```

### 4. Confirm the phone can reach the API

Find the Mac’s Wi-Fi address:

```bash
ipconfig getifaddr en0
```

On the iPhone’s Safari, open `http://YOUR_MAC_IP:3000/api/v1/products`. Safari should show product JSON. The app loads products from that same server.

### 5. Sign in to the same Expo account

On a physical iPhone, Expo Go opens a project from the development server only when Expo Go and Expo CLI are signed in to the same Expo account. Create a free account at https://expo.dev/signup if you need one.

From this folder, with Node 22:

```bash
npx expo login
npx expo whoami
```

`npx expo whoami` prints the signed-in username. On the iPhone, open Expo Go, tap the account icon in the top-right, and sign in with that same account.

Signing in while `npm start` is already running is enough. Tap **Try Again** on the Expo Go error screen. Restart the development server only after switching to a different Expo account.

### 6. Start the app

Leave `.env` on `http://127.0.0.1:3000`. On a phone, the app replaces that host with the Mac address Metro is using and calls port 3000.

```bash
nvm use 22
npm start
```

The terminal prints a QR code and a Metro URL such as `exp://192.168.x.x:8081`. It should say it is using Expo Go. Press `s` in that terminal to switch to Expo Go when it offers a development build instead.

Point the iPhone Camera at the QR code and tap the banner to open Expo Go. The QR code drawn inside the editor terminal often fails to scan. In that case, open Expo Go, choose **Enter URL**, and enter the Metro URL from the terminal (`exp://YOUR_MAC_IP:8081`).

After the phone connects, the terminal prints an iOS bundle and the app appears on the phone. `This operation was aborted` is the Mac web preview closing a request. `No apps connected` means Expo Go has not opened the project yet.

### 7. What to try

Walk through Home, Categories, Products, a product page, and Catalogues. Images should be the same photos as the website. Sign up or sign in from Account. A retailer or carpenter sees the dealer rate. A guest or consumer stays on MRP.

## Test on an Android emulator

Use the Android emulator that comes with Android Studio when there is no physical Android phone. This Mac already has Android Studio and a Pixel 5 virtual device named `Pixel_5_API_34`.

The emulator needs several gigabytes of free disk space. When it exits with `Not enough disk space to run AVD`, free about 8–10 GB and start it again. Old Xcode beta downloads are a safe place to look; leave `/Applications/Xcode.app` in place.

### 1. Start the website

Use the same website server as the iPhone steps. From the website project:

```bash
npx next dev -H 0.0.0.0 -p 3000
```

Confirm the catalogue opens in the Mac browser at http://127.0.0.1:3000, and leave that terminal running.

### 2. Start the emulator

List the virtual devices:

```bash
$HOME/Library/Android/sdk/emulator/emulator -list-avds
```

Start the Pixel 5 device and wait until the Android home screen is up. The first boot can take a few minutes. Leave this terminal running.

```bash
$HOME/Library/Android/sdk/emulator/emulator -avd Pixel_5_API_34
```

### 3. Open the app

Leave `.env` on `http://127.0.0.1:3000`. On the emulator the app replaces that host with the computer running Metro. When that host is localhost, it calls `http://10.0.2.2:3000`, which is the emulator’s address for this Mac. The website has to be listening on `0.0.0.0` for that to work.

In the terminal that is already running `npm start` (Node 22), press `a`.

Expo installs Expo Go in the emulator and opens this project. The terminal then prints an Android bundle and the app appears in the emulator window. The Android emulator does not ask for the Expo account sign-in that a physical iPhone requires.

To start Metro and the emulator together next time, from this folder:

```bash
nvm use 22
npm run android
```

### 4. What to try

Walk through Home, Categories, Products, a product page, and Catalogues. Images should be the same photos as the website. Sign up or sign in from Account. A retailer or carpenter sees the dealer rate. A guest or consumer stays on MRP.
