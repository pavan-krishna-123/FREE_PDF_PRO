package com.openpdf.app.engine

import android.content.Context
import android.net.Uri
import com.tom_roush.pdfbox.multipdf.PDFMergerUtility
import com.tom_roush.pdfbox.multipdf.Splitter
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.encryption.AccessPermission
import com.tom_roush.pdfbox.pdmodel.encryption.StandardProtectionPolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

object PdfEngine {

    /**
     * Merge multiple PDF files into one
     */
    suspend fun mergePdfs(context: Context, uris: List<Uri>, outputFile: File): Result<File> =
        withContext(Dispatchers.IO) {
            runCatching {
                val merger = PDFMergerUtility()
                merger.destinationFileName = outputFile.absolutePath

                val tempFiles = mutableListOf<File>()
                for (uri in uris) {
                    val temp = File(context.cacheDir, "merge_temp_${System.currentTimeMillis()}_${tempFiles.size}.pdf")
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        FileOutputStream(temp).use { output -> input.copyTo(output) }
                    }
                    tempFiles.add(temp)
                    merger.addSource(temp)
                }

                merger.mergeDocuments(null)
                tempFiles.forEach { it.delete() }
                outputFile
            }
        }

    /**
     * Split a PDF into separate single-page documents
     */
    suspend fun splitPdf(context: Context, uri: Uri, outputDir: File): Result<List<File>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val inputStream: InputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open document")
                val document = PDDocument.load(inputStream)
                val splitter = Splitter()
                val pages = splitter.split(document)

                val resultFiles = mutableListOf<File>()
                pages.forEachIndexed { index, doc ->
                    val pageFile = File(outputDir, "Split_Page_${index + 1}.pdf")
                    doc.save(pageFile)
                    doc.close()
                    resultFiles.add(pageFile)
                }
                document.close()
                resultFiles
            }
        }

    /**
     * Encrypt PDF with standard 128-bit password protection
     */
    suspend fun protectPdf(context: Context, uri: Uri, userPassword: String, outputFile: File): Result<File> =
        withContext(Dispatchers.IO) {
            runCatching {
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open document")
                val document = PDDocument.load(inputStream)

                val accessPermission = AccessPermission()
                val protectionPolicy = StandardProtectionPolicy(userPassword, userPassword, accessPermission)
                protectionPolicy.encryptionKeyLength = 128
                document.protect(protectionPolicy)

                document.save(outputFile)
                document.close()
                outputFile
            }
        }

    /**
     * Decrypt password-protected PDF
     */
    suspend fun unlockPdf(context: Context, uri: Uri, password: String, outputFile: File): Result<File> =
        withContext(Dispatchers.IO) {
            runCatching {
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open document")
                val document = PDDocument.load(inputStream, password)

                document.isAllSecurityToBeRemoved = true
                document.save(outputFile)
                document.close()
                outputFile
            }
        }

    /**
     * Rotate pages in a PDF by delta degrees (e.g. 90, 180, 270)
     */
    suspend fun rotatePdf(context: Context, uri: Uri, rotationDegrees: Int, outputFile: File): Result<File> =
        withContext(Dispatchers.IO) {
            runCatching {
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open document")
                val document = PDDocument.load(inputStream)

                for (page in document.pages) {
                    page.rotation = (page.rotation + rotationDegrees) % 360
                }

                document.save(outputFile)
                document.close()
                outputFile
            }
        }

    /**
     * Delete specific pages from a PDF (0-indexed set)
     */
    suspend fun deletePages(context: Context, uri: Uri, pageIndicesToDelete: Set<Int>, outputFile: File): Result<File> =
        withContext(Dispatchers.IO) {
            runCatching {
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open document")
                val document = PDDocument.load(inputStream)

                pageIndicesToDelete.sortedDescending().forEach { index ->
                    if (index < document.numberOfPages) {
                        document.removePage(index)
                    }
                }

                document.save(outputFile)
                document.close()
                outputFile
            }
        }
}
