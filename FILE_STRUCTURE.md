# Project File Structure

## Complete File Tree

```
Soppu Dhana/
│
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick setup guide
├── PROJECT_SUMMARY.md             # Project overview and completion status
├── TROUBLESHOOTING.md            # Common issues and solutions
├── FILE_STRUCTURE.md             # This file
│
├── backend/                       # Node.js + Express Backend
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (13 models)
│   │   └── seed.ts               # Sample data generator
│   │
│   ├── src/
│   │   ├── controllers/          # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── department.controller.ts
│   │   │   ├── classroom.controller.ts
│   │   │   ├── faculty.controller.ts
│   │   │   ├── subject.controller.ts
│   │   │   ├── batch.controller.ts
│   │   │   └── timetable.controller.ts
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts    # JWT authentication
│   │   │
│   │   ├── routes/               # API route definitions
│   │   │   ├── auth.routes.ts
│   │   │   ├── department.routes.ts
│   │   │   ├── classroom.routes.ts
│   │   │   ├── faculty.routes.ts
│   │   │   ├── subject.routes.ts
│   │   │   ├── batch.routes.ts
│   │   │   └── timetable.routes.ts
│   │   │
│   │   ├── services/             # Business logic
│   │   │   ├── timetable.service.ts   # Generation algorithm
│   │   │   └── export.service.ts      # PDF/Excel export
│   │   │
│   │   └── index.ts              # Server entry point
│   │
│   ├── .env                      # Environment variables (create this)
│   ├── .env.example              # Environment template
│   ├── .gitignore
│   ├── package.json              # Dependencies and scripts
│   └── tsconfig.json             # TypeScript config
│
└── frontend/                     # React + TypeScript Frontend
    ├── src/
    │   ├── components/           # Reusable components
    │   │   ├── Layout.tsx        # Main layout with navigation
    │   │   └── ProtectedRoute.tsx # Auth guard component
    │   │
    │   ├── context/
    │   │   └── AuthContext.tsx   # Global auth state
    │   │
    │   ├── lib/
    │   │   └── api.ts            # Axios instance with interceptors
    │   │
    │   ├── pages/                # Page components
    │   │   ├── Login.tsx         # Login page
    │   │   ├── Dashboard.tsx     # Main dashboard
    │   │   ├── Departments.tsx   # Department CRUD
    │   │   ├── Classrooms.tsx    # Classroom CRUD
    │   │   ├── Faculties.tsx     # Faculty CRUD
    │   │   ├── Subjects.tsx      # Subject CRUD
    │   │   ├── Batches.tsx       # Batch CRUD
    │   │   ├── GenerateTimetable.tsx  # Timetable generation
    │   │   └── ViewTimetable.tsx      # Timetable viewer
    │   │
    │   ├── App.tsx               # Main app with routing
    │   ├── main.tsx              # React entry point
    │   └── index.css             # Tailwind styles
    │
    ├── index.html                # HTML template
    ├── .gitignore
    ├── package.json              # Dependencies and scripts
    ├── tsconfig.json             # TypeScript config
    ├── tsconfig.node.json        # Node TypeScript config
    ├── vite.config.ts            # Vite configuration
    ├── tailwind.config.js        # Tailwind CSS config
    └── postcss.config.js         # PostCSS config
```

## File Purposes

### Backend Files

#### Configuration Files
- **package.json**: Dependencies, scripts, project metadata
- **tsconfig.json**: TypeScript compiler options
- **.env**: Environment variables (DATABASE_URL, JWT_SECRET, PORT)
- **.gitignore**: Files to exclude from git

#### Database
- **prisma/schema.prisma**: 
  - Defines 13 models
  - Sets up relations
  - Configures PostgreSQL connection
- **prisma/seed.ts**: 
  - Creates sample data
  - 2 departments, 6 classrooms, 5 faculties, 5 subjects, 2 batches
  - 2 users (admin & scheduler)

#### Controllers (7 files)
Each handles HTTP requests for one entity:
- Request validation
- Business logic delegation
- Response formatting
- Error handling

#### Routes (7 files)
Define REST API endpoints:
- HTTP methods (GET, POST, PUT, DELETE)
- URL patterns
- Middleware application
- Input validation rules

#### Middleware
- **auth.middleware.ts**:
  - JWT token verification
  - Role-based authorization
  - Request augmentation with user data

#### Services
- **timetable.service.ts** (300+ lines):
  - Constraint-based algorithm
  - Hard constraint enforcement
  - Soft constraint optimization
  - Score calculation
  - Multiple solution generation
- **export.service.ts**:
  - PDF generation with PDFKit
  - Excel generation with ExcelJS
  - Formatted output

### Frontend Files

#### Configuration Files
- **package.json**: Dependencies, scripts
- **tsconfig.json**: TypeScript for React
- **vite.config.ts**: Dev server, proxy, build settings
- **tailwind.config.js**: Tailwind CSS customization
- **postcss.config.js**: CSS processing

#### Components
- **Layout.tsx**:
  - Navigation bar
  - Role-based menu
  - Outlet for nested routes
- **ProtectedRoute.tsx**:
  - Authentication check
  - Role-based access control
  - Redirect logic

#### Context
- **AuthContext.tsx**:
  - User state management
  - Login/logout functions
  - Token persistence
  - Loading states

#### Library
- **api.ts**:
  - Axios configuration
  - Request interceptor (adds token)
  - Response interceptor (handles errors)
  - Base URL setup

#### Pages (9 files)
Each page is a full-featured component:
- **Login.tsx**: Authentication form
- **Dashboard.tsx**: Statistics and recent items
- **Departments.tsx**: CRUD with form
- **Classrooms.tsx**: CRUD with form
- **Faculties.tsx**: CRUD with form
- **Subjects.tsx**: CRUD with form
- **Batches.tsx**: CRUD with form
- **GenerateTimetable.tsx**: Generation interface
- **ViewTimetable.tsx**: Schedule viewer with export

## Key Features by File

### Timetable Generation (Backend)
**File**: `backend/src/services/timetable.service.ts`
- 7 time slots per day
- 5 working days (Mon-Fri)
- Fixed slot handling
- Random shuffling for variety
- Constraint validation
- Score calculation

### Authentication (Backend)
**File**: `backend/src/middleware/auth.middleware.ts`
- JWT verification
- Token extraction from headers
- Role checking
- Request enrichment

### Export (Backend)
**File**: `backend/src/services/export.service.ts`
- PDF: Landscape A4, day-wise schedule
- Excel: Formatted spreadsheet with colors

### Routing (Frontend)
**File**: `frontend/src/App.tsx`
- React Router setup
- Protected routes
- Role-based access
- Layout structure

### State Management (Frontend)
**File**: `frontend/src/context/AuthContext.tsx`
- User authentication state
- Token management
- Persistent login
- Logout functionality

## Database Schema

### Core Models (13 total)
1. **User** - Authentication
2. **Department** - Academic departments
3. **Classroom** - Rooms and labs
4. **ClassroomAvailability** - Time slots
5. **Faculty** - Teachers
6. **FacultyAvailability** - Faculty time slots
7. **Subject** - Courses
8. **FacultySubject** - Assignment junction
9. **Batch** - Student groups
10. **BatchSubject** - Enrollment junction
11. **Timetable** - Generated schedules
12. **TimetableEntry** - Individual classes

### Relationships
- Department → Faculties (one-to-many)
- Department → Subjects (one-to-many)
- Department → Batches (one-to-many)
- Faculty ↔ Subjects (many-to-many via FacultySubject)
- Batch ↔ Subjects (many-to-many via BatchSubject)
- Timetable → TimetableEntries (one-to-many)

## API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/register
- GET /api/auth/profile

### Departments
- GET /api/departments
- POST /api/departments
- GET /api/departments/:id
- PUT /api/departments/:id
- DELETE /api/departments/:id

### Classrooms
- GET /api/classrooms
- POST /api/classrooms
- GET /api/classrooms/:id
- PUT /api/classrooms/:id
- DELETE /api/classrooms/:id
- POST /api/classrooms/:id/availability
- DELETE /api/classrooms/:id/availability/:availabilityId

### Faculties
- GET /api/faculties
- POST /api/faculties
- GET /api/faculties/:id
- PUT /api/faculties/:id
- DELETE /api/faculties/:id
- POST /api/faculties/:id/subjects
- DELETE /api/faculties/:id/subjects/:subjectId
- POST /api/faculties/:id/availability
- DELETE /api/faculties/:id/availability/:availabilityId

### Subjects
- GET /api/subjects
- POST /api/subjects
- GET /api/subjects/:id
- PUT /api/subjects/:id
- DELETE /api/subjects/:id

### Batches
- GET /api/batches
- POST /api/batches
- GET /api/batches/:id
- PUT /api/batches/:id
- DELETE /api/batches/:id
- POST /api/batches/:id/subjects
- DELETE /api/batches/:id/subjects/:subjectId

### Timetables
- POST /api/timetables/generate
- GET /api/timetables
- GET /api/timetables/:id
- POST /api/timetables/:id/approve
- GET /api/timetables/:id/export/pdf
- GET /api/timetables/:id/export/excel

## Technology Stack

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: jsonwebtoken, bcrypt
- **Validation**: express-validator
- **Export**: pdfkit, exceljs
- **Dev Tools**: tsx, ts-node

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP**: Axios
- **Dev Tools**: ESLint, PostCSS

## Lines of Code (Approximate)

- **Backend**: ~2,500 lines
- **Frontend**: ~1,800 lines
- **Total**: ~4,300 lines (excluding node_modules)

## Dependencies Count

- **Backend**: ~15 main dependencies
- **Frontend**: ~12 main dependencies
- **Dev Dependencies**: ~20 combined

## Generated Files (Not in Git)

### Backend
- `node_modules/` - NPM packages
- `dist/` - Compiled JavaScript
- `.env` - Environment variables (sensitive)

### Frontend
- `node_modules/` - NPM packages
- `dist/` - Production build
- `.vite/` - Vite cache

## Documentation Files

1. **README.md** - Complete project documentation
2. **QUICKSTART.md** - Fast setup guide
3. **PROJECT_SUMMARY.md** - Completion checklist
4. **TROUBLESHOOTING.md** - Common issues
5. **FILE_STRUCTURE.md** - This file

## Next Steps for Developers

1. Read QUICKSTART.md for setup
2. Follow README.md for detailed docs
3. Check TROUBLESHOOTING.md if issues arise
4. Explore code starting from:
   - Backend: `src/index.ts`
   - Frontend: `src/main.tsx`
5. Study algorithm in `backend/src/services/timetable.service.ts`

## Maintenance

### Adding New Features

**New Entity**:
1. Add model to `prisma/schema.prisma`
2. Create migration
3. Create controller in `src/controllers/`
4. Create routes in `src/routes/`
5. Add to `src/index.ts`
6. Create frontend page in `src/pages/`
7. Add route to `src/App.tsx`

**New API Endpoint**:
1. Add to appropriate routes file
2. Create controller method
3. Add validation
4. Update API documentation

**UI Changes**:
1. Edit page components in `src/pages/`
2. Update components in `src/components/`
3. Modify styles in component files

## Backup & Restore

### Database Backup
```bash
pg_dump -U postgres timetable_db > backup.sql
```

### Database Restore
```bash
psql -U postgres timetable_db < backup.sql
```

### Code Backup
- Use Git for version control
- Push to remote repository
- Tag important versions
