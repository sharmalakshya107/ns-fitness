# Database Migrations

## Remove Position Column Migration

This migration removes the `postion` column that was previously added for the drag-and-drop feature (which has been removed).

### How to Run:

**Option 1: Run migration script (Recommended)**
```bash
cd backend
node migrations/remove-position-column.js
```

**Option 2: Run SQL manually**
```sql
ALTER TABLE members DROP COLUMN IF EXISTS postion;
```

### When to Run:
- Run this **once** after deploying the latest changes
- Safe to run multiple times (checks if column exists first)
- No data loss - only removes unused column

### For Render (Production):

1. Go to Render Dashboard
2. Navigate to your PostgreSQL database
3. Click "Connect" → Copy the connection string
4. Use a tool like pgAdmin or psql to connect
5. Run the SQL:
   ```sql
   ALTER TABLE members DROP COLUMN IF EXISTS postion;
   ```

### Verification:

After running, verify the column is removed:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'members';
```

The `postion` column should not appear in the results.

