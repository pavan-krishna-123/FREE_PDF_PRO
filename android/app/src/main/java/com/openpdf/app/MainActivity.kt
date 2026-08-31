package com.openpdf.app

import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openpdf.app.data.AuditDatabase
import com.openpdf.app.data.AuditLog
import com.openpdf.app.engine.PdfEngine
import kotlinx.coroutines.launch
import java.io.File

data class PdfToolItem(
    val id: String,
    val title: String,
    val description: String,
    val icon: ImageVector
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = androidx.compose.ui.graphics.Color(0xFFE11D48),
                    secondary = androidx.compose.ui.graphics.Color(0xFF2563EB)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainDashboardScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainDashboardScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AuditDatabase.getDatabase(context) }
    var isProcessing by remember { mutableStateOf(false) }

    // Multi-PDF Picker Launcher for Merge
    val mergeLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        if (uris.size >= 2) {
            scope.launch {
                isProcessing = true
                val outFile = File(context.getExternalFilesDir(null), "Merged_${System.currentTimeMillis()}.pdf")
                val result = PdfEngine.mergePdfs(context, uris, outFile)
                isProcessing = false

                result.onSuccess {
                    db.auditDao().insertLog(
                        AuditLog(actionType = "MERGE", description = "Merged ${uris.size} documents")
                    )
                    Toast.makeText(context, "Merged successfully: ${it.name}", Toast.LENGTH_LONG).show()
                }.onFailure {
                    Toast.makeText(context, "Error: ${it.message}", Toast.LENGTH_SHORT).show()
                }
            }
        } else if (uris.isNotEmpty()) {
            Toast.makeText(context, "Please select at least 2 PDFs to merge", Toast.LENGTH_SHORT).show()
        }
    }

    // Single-PDF Picker for Split
    val splitLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                isProcessing = true
                val outDir = context.getExternalFilesDir(null) ?: context.filesDir
                val result = PdfEngine.splitPdf(context, it, outDir)
                isProcessing = false

                result.onSuccess { files ->
                    db.auditDao().insertLog(
                        AuditLog(actionType = "SPLIT", description = "Split into ${files.size} pages")
                    )
                    Toast.makeText(context, "Split into ${files.size} pages!", Toast.LENGTH_LONG).show()
                }.onFailure { err ->
                    Toast.makeText(context, "Error: ${err.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    val tools = listOf(
        PdfToolItem("merge", "Merge PDF", "Combine multiple files into one", Icons.Default.MergeType),
        PdfToolItem("split", "Split PDF", "Extract pages into individual PDFs", Icons.Default.CallSplit),
        PdfToolItem("protect", "Protect PDF", "Encrypt with custom passwords", Icons.Default.Lock),
        PdfToolItem("unlock", "Unlock PDF", "Remove security and restrictions", Icons.Default.LockOpen),
        PdfToolItem("rotate", "Rotate PDF", "Fix page orientation", Icons.Default.RotateRight),
        PdfToolItem("delete", "Delete Pages", "Remove unwanted pages", Icons.Default.DeleteOutline),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "OpenPDF",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                "PDF Utilities",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            if (isProcessing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp))
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(tools) { tool ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                when (tool.id) {
                                    "merge" -> mergeLauncher.launch(arrayOf("application/pdf"))
                                    "split" -> splitLauncher.launch(arrayOf("application/pdf"))
                                    else -> Toast.makeText(context, "${tool.title} selected", Toast.LENGTH_SHORT).show()
                                }
                            },
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = tool.icon,
                                contentDescription = tool.title,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = tool.title,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = tool.description,
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
