# SentinelX V7 Ultimate — 29-Day Hackathon Submission & Mobile Build Blueprint

This master plan guides you through:
1. **Building the Mobile App:** How to compile the iOS app (from Windows via cloud builds) and compile the Android app locally (using your local Android SDK).
2. **The 29-Day Unbeatable Sprint Roadmap:** A day-by-day plan to elevate SentinelX from a stellar Hackathon MVP to a top-tier winner before the deadline on **July 22, 2026 (11:59 PM)**.

---

## 🛠️ Part 1: Mobile App Compilation Guide

Since your development PC is running **Windows** and has the **Android SDK** installed, follow these instructions to generate app builds:

### A. How to Build the Android App locally (.APK)
You can compile the Expo React Native app directly into a standalone Android APK using your local SDK environment:

1. **Install Dependencies:**
   Navigate to the mobile directory and install Node modules:
   ```bash
   cd apps/citizen-mobile
   npm install
   ```
2. **Generate Native Android Workspace:**
   Expo handles native folder scaffolding automatically:
   ```bash
   npx expo prebuild --platform android
   ```
   *This creates a fully configured `/android` folder in `apps/citizen-mobile`.*
3. **Compile the APK:**
   Use Gradle to assemble the package:
   ```bash
   cd android
   .\gradlew.bat assembleRelease
   ```
   *The compiled release package will be located at:*  
   `apps/citizen-mobile/android/app/build/outputs/apk/release/app-release.apk`

---

### B. How to Build the iOS App on Windows (.IPA)
Because iOS compilation requires Xcode (exclusive to macOS), you cannot build `.ipa` files locally on Windows. However, you can use **EAS Build (Expo Application Services)** to compile your iOS app in the cloud from your Windows machine:

1. **Install EAS CLI:**
   Install the Expo cloud builds client globally:
   ```bash
   npm install -g eas-cli
   ```
2. **Login to Expo:**
   Log in to your free Expo account:
   ```bash
   eas login
   ```
3. **Configure EAS Project:**
   Initialize the build configurations:
   ```bash
   eas build:configure
   ```
4. **Trigger Cloud iOS Build:**
   Start the cloud builder (Expo spins up a virtual macOS runner, compiles the iOS package, and generates a download link/QR code):
   ```bash
   eas build --platform ios
   ```
   *For ad-hoc installs on registered test devices, run:* `eas build --platform ios --profile preview`

---

## 📅 Part 2: The 29-Day Unbeatable Hackathon Roadmap
*Submission Window Ends: July 22, 2026, 11:59 PM (Exactly 29 days from today).*

```
   [Days 1-7]           [Days 8-14]           [Days 15-21]          [Days 22-26]        [Days 27-29]
  DB Hardening        Mobile Native         Deep Tech & AI        Polish & Pitch       Load Test &
 & Integrations      Feature Bindings      Features (Bhashini)   Demo Video Record      Submission
```

### 🏃‍♂️ Week 1 (Days 1–7): Backend Database & Graph Hardening
* **Day 1-2: PostgreSQL Linkage** — Replace microservice in-memory mock fallbacks with real DB integrations. Bind incoming reports and geocoded coordinates to PostgreSQL tables via Prisma.
* **Day 3-4: Live Socket Stream** — Set up Socket.io on the Express API Gateway to stream transcript text dynamically from the simulator mock dialer directly to the dashboard, removing manual page reloads.
* **Day 5-6: Neo4j Graph Data Science (GDS)** — Configure Cypher queries in `fraud-graph` to execute active Weakly Connected Components (WCC) and cycle-detection algorithms rather than static patterns.
* **Day 7: Consensus Tuning** — Tune the MCDA (Multi-Criteria Decision Analysis) consensus threshold in `threat-fusion` to trigger warnings with high accuracy.

### 📱 Week 2 (Days 8–14): Mobile Native Bindings & Local Packaging
* **Day 8-9: Mobile App Setup** — Run local npm installs, run Expo Prebuilds, and verify Android emulator bindings.
* **Day 10-11: Call Telemetry Hooks** — Integrate `react-native-call-detector` or a custom Native Module to trigger background alerts when an incoming call matches blacklisted CLI ranges.
* **Day 12-13: Local APK Generation** — Compile your first release APK locally (`.\gradlew.bat assembleRelease`) and install it on a physical test device to confirm fluid rendering.
* **Day 14: Translation Bridging** — Integrate language selection configurations on the mobile app, linking to the localized `citizen-shield` backend.

### 🧠 Week 3 (Days 15–21): Deep Tech Features (Voice Deepfakes & Bhashini)
* **Day 15-17: Acoustic Deepfake Classifier** — Expand `counterfeit-detection` or add a voice analysis module in FastAPI. Utilize librosa/numpy to extract voice formant characteristics, flagging synthetic/AI-generated audio.
* **Day 18-19: Bhashini REST Integration** — Connect real API credentials for Bhashini translation modules to translate Hindi/Gujarati/Marathi reports into English analytics pipelines.
* **Day 20-21: Cryptographic Ledger HSM Seal** — Implement standard PyCryptodome cryptographic envelope signing inside the `evidence-generator` service to output digitally signed forensics.

### 🎨 Week 4 (Days 22–26): UI/UX Polish & Unbeatable Video Pitch
* **Day 22-23: Dashboard Polish** — Refine leaf Map CSS styling: Add glowing neon marker rings, live clustering, and customized warning audio buzzers on the dashboard when critical threats occur.
* **Day 24: Simulator Hardening** — Integrate progress bars, flashing siren overlays, and terminal log tickers inside the **Incident Simulator** to create an unforgettable demo.
* **Day 25-26: The "WOW" Pitch Video** — Record a high-impact, professional 5-minute video demonstrating the entire unified response: *Citizen gets scam call -> Mobile warns -> NPCI locks -> HSM signs -> Map glows.*

### 🏁 Final Sprint (Days 27–29): Verification, DevOps & Submission
* **Day 27: Load Testing** — Run Locust or Autocannon test configurations on the Express Gateway to prove SentinelX handles up to 5,000 concurrent RPS (judges love scalability).
* **Day 28: Git Cleanup & Documentation** — Compile the Pitch Deck Slide Show, write clear API Swagger documentation, and format the final README layout.
* **Day 29 (July 22, 2026): Submission Day** — Double-check the Docker-compose build on a clean environment, push all files to GitHub, submit the dashboard links, and lock in the win!
