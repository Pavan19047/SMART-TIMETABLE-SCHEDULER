# Quick Start Guide

## Initial Setup (First Time Only)

### Step 1: Install Backend Dependencies
```powershell
cd backend
npm install
```

### Step 2: Configure Environment
```powershell
# Copy the example env file
copy .env.example .env

# Edit .env and set your PostgreSQL connection:
# DATABASE_URL="postgresql://user:password@localhost:5432/timetable_db"
```

### Step 3: Setup Database
```powershell
# Generate Prisma client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Load sample data
npm run prisma:seed
```

### Step 4: Install Frontend Dependencies
```powershell
cd ..\frontend
npm install
```

## Running the Application

### Terminal 1 - Backend Server
```powershell
cd backend
npm run dev
```
✅ Backend running at: http://localhost:5000

### Terminal 2 - Frontend Server
```powershell
cd frontend
npm run dev
```
✅ Frontend running at: http://localhost:3000

## Login Credentials

**Admin**
- Email: admin@college.edu
- Password: admin123

**Scheduler**
- Email: scheduler@college.edu  
- Password: scheduler123

## Quick Test Workflow

1. Open http://localhost:3000
2. Login as Admin
3. Go to "Generate Timetable"
4. Enter:
   - Name: "Test Timetable"
   - Semester: 3 or 5
5. Click "Generate Timetables"
6. View and compare generated options
7. Click "View Details" on any option
8. Approve and Export as PDF/Excel

## Troubleshooting

**Database Connection Error**
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env

**Port Already in Use**
- Backend: Change PORT in backend/.env
- Frontend: Change port in frontend/vite.config.ts

**Prisma Client Error**
```powershell
cd backend
npm run prisma:generate
```

**Module Not Found**
```powershell
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

## Data Management

**Reset Database**
```powershell
cd backend
npx prisma migrate reset
npm run prisma:seed
```

**Add New Migration**
```powershell
cd backend
# Edit prisma/schema.prisma first, then:
npx prisma migrate dev --name your_migration_name
```

## Building for Production

**Backend**
```powershell
cd backend
npm run build
npm start
```

**Frontend**
```powershell
cd frontend
npm run build
# Output in dist/ folder
```

## Need Help?

Refer to the main README.md for detailed documentation.
