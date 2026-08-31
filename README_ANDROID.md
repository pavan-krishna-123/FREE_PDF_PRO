# OpenPDF - Native Android Application

OpenPDF is an offline-first PDF tool suite built for Android using Kotlin and Jetpack Compose.

## Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Language** | Kotlin 2.0+ |
| **UI Framework** | Jetpack Compose with Material 3 |
| **PDF Processing** | Apache PDFBox for Android (`com.tom-roush:pdfbox-android`) |
| **Camera & Scanning** | AndroidX CameraX (`camera-camera2`, `camera-view`, `camera-lifecycle`) |
| **Local Persistence** | AndroidX Room SQLite (`room-runtime`, `room-ktx`) |
| **Navigation** | Jetpack Navigation Compose |
| **Build System** | Gradle (Kotlin DSL `build.gradle.kts` + Version Catalogs) |

---

## Directory Structure

```
android/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml
└── app/
    ├── build.gradle.kts
    └── src/
        └── main/
            ├── AndroidManifest.xml
            ├── java/com/openpdf/app/
            │   ├── OpenPdfApplication.kt      (PDFBox init & lifecycle)
            │   ├── MainActivity.kt            (Navigation & TopBar)
            │   ├── theme/                     (Material 3 Colors & Typography)
            │   ├── data/                      (Room Database, Entities, DAO)
            │   ├── engine/                    (Native PDFBox Engine Operations)
            │   ├── ui/
            │   │   ├── components/            (TopBar, ToolCard, Dialogs)
            │   │   └── screens/               (Home, Merge, Compress, Sign, Protect, Admin)
            │   └── utils/                     (File Providers & Share/Print helpers)
            └── res/
                ├── values/strings.xml
                ├── values/themes.xml
                └── xml/file_paths.xml
```

---

## Opening & Building in Android Studio

1. Download or export the project directory as a ZIP (or clone the repository).
2. Open Android Studio (Ladybug, Koala, Meerkat or newer with JDK 17).
3. Select **File > Open** and select the `android/` directory.
4. Let Gradle sync and resolve all dependencies defined in `gradle/libs.versions.toml`.
5. Run project sanity check:
   * **Build > Clean Project**
   * **Build > Rebuild Project**
6. Connect an Android device or emulator running Android 7.0+ (API 24 to 35).
7. Click **Run (`Shift + F10`)**.

---

## Technical & Security Verification Checklist

* [x] **PDFBox Android Port**: Configured `com.tom-roush:pdfbox-android:2.0.27.0` with `PDFBoxResourceLoader.init(context)` in `OpenPdfApplication.kt` (Android-safe asset and font loading).
* [x] **Real Cryptographic Encryption**: Uses `StandardProtectionPolicy` + `AccessPermission` with 128-bit key length and document security dictionaries directly via PDFBox.
* [x] **Signature Distinction**: The signing canvas generates a high-fidelity visual signature stamp positioned on the selected page via `PDPageContentStream` & `LosslessFactory`.
* [x] **Modern Scoped Storage**: Uses AndroidX `ActivityResultContracts.GetContent()` / `GetMultipleContents()` (SAF picker) and `FileProvider` with no unrestricted broad external storage permissions on Android 13+.
* [x] **Audit Log Privacy**: Room `audit_logs` records only action names, categories, and execution timestamps — never plain text passwords, signature bytes, or document payload streams.

---

## Generating Production Artifacts

### Debug APK (For local device testing)
* In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
* Output path: `android/app/build/outputs/apk/debug/app-debug.apk`

### Signed Release APK
* In Android Studio: **Build > Generate Signed Bundle / APK > APK > release**

### Google Play Store Release (AAB)
* In Android Studio: **Build > Generate Signed Bundle / APK > Android App Bundle**
* Output path: `android/app/build/outputs/bundle/release/app-release.aab`
