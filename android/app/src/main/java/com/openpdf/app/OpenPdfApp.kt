package com.openpdf.app

import android.app.Application
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader

class OpenPdfApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize PDFBox with Android Application Context for font & glyph loading
        PDFBoxResourceLoader.init(applicationContext)
    }
}
