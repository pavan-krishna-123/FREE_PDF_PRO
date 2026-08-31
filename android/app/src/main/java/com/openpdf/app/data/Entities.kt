package com.openpdf.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "audit_logs")
data class AuditLog(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val action: String,
    val category: String,
    val status: String,
    val details: String,
    val user: String = "SYSTEM"
)

@Entity(tableName = "admin_users")
data class AdminUser(
    @PrimaryKey
    val username: String,
    val role: String, // ADMIN, OPERATOR, AUDITOR
    val lastLogin: Long = System.currentTimeMillis()
)
