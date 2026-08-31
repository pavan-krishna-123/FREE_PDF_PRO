package com.openpdf.app.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "audit_logs")
data class AuditLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val actionType: String,
    val description: String,
    val timestamp: Long = System.currentTimeMillis(),
    val status: String = "SUCCESS"
)

@Dao
interface AuditDao {
    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC")
    fun getAllLogs(): Flow<List<AuditLog>>

    @Insert
    suspend fun insertLog(log: AuditLog)
}

@Database(entities = [AuditLog::class], version = 1, exportSchema = false)
abstract class AuditDatabase : RoomDatabase() {
    abstract fun auditDao(): AuditDao

    companion object {
        @Volatile private var instance: AuditDatabase? = null

        fun getDatabase(context: Context): AuditDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AuditDatabase::class.java,
                    "openpdf_audit.db"
                ).build().also { instance = it }
            }
    }
}
