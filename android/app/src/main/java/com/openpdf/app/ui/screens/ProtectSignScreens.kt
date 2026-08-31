package com.openpdf.app.ui.screens

import android.graphics.Bitmap
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.openpdf.app.data.AppDatabase
import com.openpdf.app.data.AuditLog
import com.openpdf.app.engine.PdfBoxEngine
import com.openpdf.app.utils.FileUtils
import kotlinx.coroutines.launch
import java.io.File

// ================= PROTECT / UNLOCK SCREEN =================
@Composable
fun ProtectScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AppDatabase.getDatabase(context) }
    var selectedFile by remember { mutableStateOf<File?>(null) }
    var password by remember { mutableStateOf("") }
    var isProcessing by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { selectedFile = FileUtils.copyUriToTempFile(context, it, "protect_src") }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Protect PDF with Password", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = { filePicker.launch("application/pdf") }) {
            Icon(Icons.Default.UploadFile, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(selectedFile?.name ?: "Select PDF File")
        }

        if (selectedFile != null) {
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Set Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = {
                    val file = selectedFile ?: return@Button
                    if (password.isBlank()) {
                        Toast.makeText(context, "Please enter a password", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    isProcessing = true
                    scope.launch {
                        val outFile = FileUtils.getOutputPdfFile(context, "Protected_${file.nameWithoutExtension}")
                        val res = PdfBoxEngine.protectPdf(file, outFile, password)
                        isProcessing = false
                        res.onSuccess {
                            db.auditDao().insertLog(AuditLog(action = "PROTECT_PDF", category = "SECURITY", status = "SUCCESS", details = "Protected ${file.name}"))
                            Toast.makeText(context, "Password added successfully!", Toast.LENGTH_SHORT).show()
                            FileUtils.sharePdf(context, it)
                        }.onFailure {
                            Toast.makeText(context, "Protection failed: ${it.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                enabled = !isProcessing && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Encrypt & Protect PDF")
            }
        }
    }
}

// ================= SIGNATURE SCREEN =================
@Composable
fun SignScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AppDatabase.getDatabase(context) }
    var selectedFile by remember { mutableStateOf<File?>(null) }
    val pathPoints = remember { mutableStateListOf<Offset>() }
    var isProcessing by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { selectedFile = FileUtils.copyUriToTempFile(context, it, "sign_src") }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Digital Document Signature", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Button(onClick = { filePicker.launch("application/pdf") }) {
            Text(selectedFile?.name ?: "Select PDF to Sign")
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Draw Signature Below:", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .background(Color.White, RoundedCornerShape(8.dp))
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { offset -> pathPoints.add(offset) },
                        onDrag = { change, _ -> pathPoints.add(change.position) }
                    )
                }
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                if (pathPoints.size > 1) {
                    for (i in 0 until pathPoints.size - 1) {
                        drawLine(
                            color = Color.Black,
                            start = pathPoints[i],
                            end = pathPoints[i + 1],
                            strokeWidth = 4.dp.toPx()
                        )
                    }
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = { pathPoints.clear() }) {
                Icon(Icons.Default.Clear, contentDescription = null)
                Text("Clear Signature")
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = {
                val file = selectedFile ?: return@Button
                if (pathPoints.isEmpty()) {
                    Toast.makeText(context, "Please draw a signature first", Toast.LENGTH_SHORT).show()
                    return@Button
                }
                isProcessing = true
                scope.launch {
                    // Create bitmap from signature
                    val bitmap = Bitmap.createBitmap(400, 200, Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    val paint = android.graphics.Paint().apply {
                        color = android.graphics.Color.BLACK
                        strokeWidth = 6f
                        style = android.graphics.Paint.Style.STROKE
                        isAntiAlias = true
                    }
                    for (i in 0 until pathPoints.size - 1) {
                        canvas.drawLine(
                            pathPoints[i].x,
                            pathPoints[i].y,
                            pathPoints[i + 1].x,
                            pathPoints[i + 1].y,
                            paint
                        )
                    }

                    val outFile = FileUtils.getOutputPdfFile(context, "Signed_${file.nameWithoutExtension}")
                    val res = PdfBoxEngine.signPdf(file, outFile, 0, bitmap, 50f, 50f, 150f, 75f)
                    isProcessing = false
                    res.onSuccess {
                        db.auditDao().insertLog(AuditLog(action = "SIGN_PDF", category = "SIGNATURE", status = "SUCCESS", details = "Signed ${file.name}"))
                        Toast.makeText(context, "Signature applied to PDF!", Toast.LENGTH_SHORT).show()
                        FileUtils.sharePdf(context, it)
                    }.onFailure {
                        Toast.makeText(context, "Signing failed: ${it.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            },
            enabled = selectedFile != null && pathPoints.isNotEmpty() && !isProcessing,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Stamp Signature & Save PDF")
        }
    }
}
