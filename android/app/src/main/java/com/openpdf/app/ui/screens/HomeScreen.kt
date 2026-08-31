package com.openpdf.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.openpdf.app.ui.components.ToolCard

data class ToolItem(
    val id: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val color: Color
)

@Composable
fun HomeScreen(
    onNavigateToTool: (String) -> Unit
) {
    val tools = listOf(
        ToolItem("merge", "Merge PDF", "Combine multiple PDF files into one", Icons.Default.CallMerge, Color(0xFF2563EB)),
        ToolItem("split", "Split PDF", "Split pages or extract custom page intervals", Icons.Default.CallSplit, Color(0xFF7C3AED)),
        ToolItem("compress", "Compress PDF", "Reduce file size while preserving readability", Icons.Default.Compress, Color(0xFF059669)),
        ToolItem("scanner", "Scan to PDF", "Digitize documents with camera and image filters", Icons.Default.DocumentScanner, Color(0xFFD97706)),
        ToolItem("sign", "Sign Document", "Draw and stamp signature onto any page", Icons.Default.Draw, Color(0xFFDB2777)),
        ToolItem("protect", "Protect PDF", "Encrypt with password and restrict extraction", Icons.Default.Lock, Color(0xFF4F46E5)),
        ToolItem("unlock", "Unlock PDF", "Remove password security from authorized PDFs", Icons.Default.LockOpen, Color(0xFF0D9488)),
        ToolItem("rotate", "Rotate Pages", "Rotate individual or all document pages", Icons.Default.RotateRight, Color(0xFFEA580C)),
        ToolItem("extract", "Extract Pages", "Create a new document from selected pages", Icons.Default.FileOpen, Color(0xFF0284C7)),
        ToolItem("reorder", "Reorder Pages", "Rearrange page sequence intuitively", Icons.Default.SwapVert, Color(0xFF9333EA)),
        ToolItem("delete", "Delete Pages", "Remove unwanted pages permanently", Icons.Default.DeleteOutline, Color(0xFFDC2626))
    )

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 300.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(tools) { tool ->
            ToolCard(
                title = tool.title,
                description = tool.description,
                icon = tool.icon,
                iconColor = tool.color,
                onClick = { onNavigateToTool(tool.id) }
            )
        }
    }
}
