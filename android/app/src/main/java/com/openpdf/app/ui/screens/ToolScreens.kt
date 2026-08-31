package com.openpdf.app.ui.screens

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.openpdf.app.data.AppDatabase
import com.openpdf.app.data.AuditLog
import com.openpdf.app.engine.PdfBoxEngine
import com.openpdf.app.utils.FileUtils
import kotlinx.coroutines.launch
import java.io.File

// ================= MERGE SCREEN =================
@Composable
fun MergeScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AppDatabase.getDatabase(context) }
    val selectedFiles = remember { mutableStateListOf<File>() }
    var isProcessing by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        uris.forEach { uri ->
            val tempFile = FileUtils.copyUriToTempFile(context, uri, "merge_src")
            selectedFiles.add(tempFile)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Merge Multiple PDF Files",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Selected files: ${selectedFiles.size}. Add two or more PDFs to combine.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = { filePicker.launch("application/pdf") }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add PDF Files")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(modifier = Modifier.weight(1f)) {
            itemsIndexed(selectedFiles) { index, file ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${index + 1}. ${file.name}",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { selectedFiles.removeAt(index) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }

        Button(
            onClick = {
                if (selectedFiles.size < 2) {
                    Toast.makeText(context, "Please select at least 2 PDF files to merge", Toast.LENGTH_SHORT).show()
                    return@Button
                }
                isProcessing = true
                scope.launch {
                    val outFile = FileUtils.getOutputPdfFile(context, "Merged_Document")
                    val result = PdfBoxEngine.mergePdfs(selectedFiles, outFile)
                    isProcessing = false
                    result.onSuccess {
                        db.auditDao().insertLog(AuditLog(action = "MERGE_PDF", category = "MERGE", status = "SUCCESS", details = "Merged ${selectedFiles.size} files into ${it.name}"))
                        Toast.makeText(context, "Merged PDF saved successfully!", Toast.LENGTH_LONG).show()
                        FileUtils.sharePdf(context, it)
                    }.onFailure { err ->
                        db.auditDao().insertLog(AuditLog(action = "MERGE_PDF", category = "MERGE", status = "ERROR", details = "Error: ${err.message}"))
                        Toast.makeText(context, "Merge failed: ${err.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            enabled = selectedFiles.size >= 2 && !isProcessing,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isProcessing) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Merge ${selectedFiles.size} PDFs")
            }
        }
    }
}

// ================= COMPRESS SCREEN =================
@Composable
fun CompressScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AppDatabase.getDatabase(context) }
    var selectedFile by remember { mutableStateOf<File?>(null) }
    var compressionLevel by remember { mutableFloatStateOf(0.6f) }
    var isProcessing by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            selectedFile = FileUtils.copyUriToTempFile(context, it, "compress_src")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Select PDF to Compress", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = { filePicker.launch("application/pdf") }) {
                    Icon(Icons.Default.UploadFile, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(selectedFile?.name ?: "Choose File")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (selectedFile != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Compression Ratio: ${(100 - (compressionLevel * 100)).toInt()}%")
                    Slider(
                        value = compressionLevel,
                        onValueChange = { compressionLevel = it },
                        valueRange = 0.2f..0.8f,
                        steps = 3
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    val file = selectedFile ?: return@Button
                    isProcessing = true
                    scope.launch {
                        val outFile = FileUtils.getOutputPdfFile(context, "Compressed_${file.nameWithoutExtension}")
                        val result = PdfBoxEngine.compressPdf(file, outFile, compressionLevel)
                        isProcessing = false
                        result.onSuccess {
                            db.auditDao().insertLog(AuditLog(action = "COMPRESS_PDF", category = "COMPRESS", status = "SUCCESS", details = "Compressed ${file.name} to ${it.name}"))
                            Toast.makeText(context, "PDF Compressed Successfully!", Toast.LENGTH_SHORT).show()
                            FileUtils.sharePdf(context, it)
                        }.onFailure {
                            Toast.makeText(context, "Compression failed: ${it.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                enabled = !isProcessing,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isProcessing) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Compress PDF")
                }
            }
        }
    }
}
