# OpenPDF - Native Android (Kotlin + Jetpack Compose)

This directory contains the production-ready Android Studio project for **OpenPDF**, built with Kotlin and Jetpack Compose.

## Key Technologies & Architecture
- **Language**: Kotlin 2.0.21 (Target JVM 17)
- **UI Framework**: Jetpack Compose + Material Design 3
- **PDF Engine**: `pdfbox-android` (Apache PDFBox adapted for Android)
- **Local Persistence**: Android Room Database (Audit trail & history)
- **Document Access**: Android Storage Access Framework (`ActivityResultContracts.OpenDocument`, `OpenMultipleDocuments`)
- **Sharing & Printing**: Android `FileProvider` + `PrintManager`

## Opening in Android Studio
1. Open **Android Studio** (Ladybug / Iguana / Hedgehog or newer).
2. Select **Open** and choose the `android/` directory from this project.
3. Allow Gradle to sync dependencies.
4. Run on an Android Emulator or physical device (API 24 to 35).

## Directory Structure
```
android/
├── settings.gradle.kts
├── build.gradle.kts
├── app/
│   ├── build.gradle.kts
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── res/xml/file_paths.xml
│           └── java/com/openpdf/app/
│               ├── OpenPdfApp.kt
│               ├── MainActivity.kt
│               ├── engine/PdfEngine.kt
│               └── data/AuditDatabase.kt
```
