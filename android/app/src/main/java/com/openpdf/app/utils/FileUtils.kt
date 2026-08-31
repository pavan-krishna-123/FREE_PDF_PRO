package com.openpdf.app.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.print.PrintAttributes
import android.print.PrintManager
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

object FileUtils {
    fun copyUriToTempFile(context: Context, uri: Uri, prefix: String = "input"): File {
        val tempFile = File(context.cacheDir, "${prefix}_${System.currentTimeMillis()}.pdf")
        context.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(tempFile).use { output ->
                input.copyTo(output)
            }
        }
        return tempFile
    }

    fun getOutputPdfFile(context: Context, baseName: String): File {
        val docsDir = context.getExternalFilesDir("documents") ?: context.filesDir
        if (!docsDir.exists()) docsDir.mkdirs()
        return File(docsDir, "${baseName}_${System.currentTimeMillis()}.pdf")
    }

    fun sharePdf(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            file
        )
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share PDF Document"))
    }
}
