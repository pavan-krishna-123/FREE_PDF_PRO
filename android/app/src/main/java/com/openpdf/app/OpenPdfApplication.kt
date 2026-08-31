package com.openpdf.app

import android.app.Application
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader

class OpenPdfApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Apache PDFBox Android native runtime
        PDFBoxResourceLoader.init(applicationContext)
    }
}
