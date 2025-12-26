# Troubleshooting Guide

## Common Issues and Solutions

### 1. Database Connection Errors

**Error**: "Can't reach database server"

**Solutions**:
- Ensure PostgreSQL is installed and running
- Check if PostgreSQL service is started:
  ```powershell
  # Windows
  Get-Service postgresql*
  
  # If not running, start it:
  Start-Service postgresql-x64-14
  ```
- Verify DATABASE_URL in backend/.env
- Default PostgreSQL port is 5432
- Test connection:
  ```powershell
  psql -U postgres -h localhost
  ```

**Error**: "Database 'timetable_db' does not exist"

**Solution**:
```powershell
# Create database manually
psql -U postgres
CREATE DATABASE timetable_db;
\q

# Then run migrations
cd backend
npm run prisma:migrate
```

### 2. Port Already in Use

**Backend Port 5000 in use**:
```powershell
# Option 1: Kill the process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Option 2: Change port in backend/.env
PORT=5001
```

**Frontend Port 3000 in use**:
```powershell
# Option 1: Kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Change port in frontend/vite.config.ts
server: { port: 3001 }
```

### 3. Prisma Client Errors

**Error**: "Prisma Client not generated"

**Solution**:
```powershell
cd backend
npm run prisma:generate
```

**Error**: "Schema mismatch"

**Solution**:
```powershell
cd backend
# Option 1: Create new migration
npm run prisma:migrate

# Option 2: Reset database (WARNING: Deletes all data)
npx prisma migrate reset
npm run prisma:seed
```

### 4. Module Not Found Errors

**Error**: "Cannot find module 'X'"

**Solution**:
```powershell
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, clear npm cache
npm cache clean --force
npm install
```

### 5. TypeScript Errors

**Error**: "Cannot find type definitions"

**Solution**:
```powershell
# Install missing types
npm install --save-dev @types/node @types/express

# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P, search "TypeScript: Restart TS Server"
```

### 6. CORS Errors in Browser

**Error**: "CORS policy blocked"

**Check**:
- Backend CORS is configured in src/index.ts
- Frontend proxy is set in vite.config.ts
- Both servers are running
- Using correct API URL

### 7. Authentication Issues

**Error**: "Invalid token" or "Token expired"

**Solution**:
- Clear browser localStorage
- Login again
- Check JWT_SECRET is same in .env
- Token expires after 24h

**Manual Fix**:
```javascript
// In browser console:
localStorage.removeItem('token');
localStorage.removeItem('user');
location.reload();
```

### 8. Timetable Generation Fails

**Error**: "No timetables generated"

**Possible Causes**:
1. **No batches for semester**: Create batches for the selected semester
2. **No subjects assigned**: Assign subjects to batches
3. **No faculties available**: Create faculties and assign subjects
4. **No classrooms**: Create at least one classroom
5. **Insufficient time slots**: Too many classes for available slots

**Debug Steps**:
```powershell
# Check data exists
cd backend
npx prisma studio
# Verify: departments, classrooms, faculties, subjects, batches
```

### 9. Export Not Working

**PDF Export Issues**:
- Check if PDFKit is installed: `npm list pdfkit`
- Ensure proper Buffer handling in export service

**Excel Export Issues**:
- Check if ExcelJS is installed: `npm list exceljs`
- Verify file downloads in browser settings

### 10. Frontend Build Errors

**Error**: "Failed to parse source"

**Solution**:
```powershell
cd frontend
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

**Error**: "Unexpected token"

**Solution**:
- Check for syntax errors in TSX files
- Ensure all imports are correct
- Verify tailwind.config.js is valid

### 11. Seed Data Issues

**Error**: "Seed failed"

**Solution**:
```powershell
cd backend
# Check error message in console
# Common issues:
# - Database not empty: Reset first
npx prisma migrate reset
npm run prisma:seed

# - Foreign key violations: Check seed order
# - Duplicate keys: Drop and recreate database
```

### 12. Development Server Won't Start

**Backend**:
```powershell
cd backend
# Check for syntax errors
npm run build

# If build succeeds but dev fails:
rm -rf dist
npm run dev
```

**Frontend**:
```powershell
cd frontend
# Clear cache and restart
rm -rf node_modules/.vite dist
npm run dev
```

## Performance Issues

### Slow Timetable Generation

**Optimization Tips**:
- Reduce number of subjects per batch
- Limit weekly classes required
- Increase classroom availability
- Add more classrooms
- Check faculty availability constraints

### Database Queries Slow

**Solutions**:
- Add indexes in schema.prisma
- Use Prisma's query optimization
- Enable connection pooling
- Check database size and clean old data

## Environment-Specific Issues

### Windows

**Path Issues**:
- Use forward slashes in paths
- Avoid spaces in folder names
- Run PowerShell as Administrator if needed

**PostgreSQL Service**:
```powershell
# Check service status
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-14

# Set to auto-start
Set-Service postgresql-x64-14 -StartupType Automatic
```

### WSL/Linux

**PostgreSQL Connection**:
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Allow password authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Change peer to md5 for local connections
```

## Getting Help

### Check Logs

**Backend Logs**:
- Console output shows errors
- Check for stack traces
- Verify database connection messages

**Frontend Logs**:
- Browser DevTools Console (F12)
- Network tab for API call failures
- React error overlay in dev mode

### Debugging Steps

1. **Isolate the issue**:
   - Backend only? Test with Postman/curl
   - Frontend only? Check browser console
   - Database? Use Prisma Studio

2. **Check versions**:
   ```powershell
   node --version  # Should be v18+
   npm --version   # Should be 9+
   psql --version  # Should be 14+
   ```

3. **Verify installation**:
   ```powershell
   cd backend && npm list
   cd frontend && npm list
   ```

4. **Reset everything** (last resort):
   ```powershell
   # Backend
   cd backend
   rm -rf node_modules dist
   npm install
   npx prisma migrate reset
   npm run prisma:seed
   
   # Frontend
   cd frontend
   rm -rf node_modules dist .vite
   npm install
   ```

## Still Having Issues?

1. Check the main README.md for setup instructions
2. Review PROJECT_SUMMARY.md for expected behavior
3. Ensure all prerequisites are installed
4. Try the Quick Start guide from scratch
5. Check Node.js and PostgreSQL versions

## Preventive Measures

- Always run `npm install` after pulling updates
- Keep backend and frontend servers running simultaneously
- Don't modify .env while servers are running
- Commit .env.example, never .env (sensitive data)
- Regularly backup database before migrations
- Use Prisma Studio to verify data integrity
