# Smart Classroom & Timetable Scheduler - MVP

A full-stack web application for automated timetable generation in higher education institutions.

## 🎯 Features

### Core Functionality
- **Role-Based Access Control**: Admin, Scheduler, and Viewer roles
- **Data Management**: CRUD operations for Departments, Classrooms, Faculties, Subjects, and Batches
- **Intelligent Timetable Generation**: Constraint-based algorithm that generates multiple optimized timetables
- **Timetable Review**: Compare multiple timetable options with scoring
- **Approval Workflow**: Admin approval and locking mechanism
- **Export Capabilities**: Export timetables as PDF or Excel

### Constraint Handling

**Hard Constraints (Must Not Violate)**:
- No faculty overlap
- No room overlap  
- Room capacity ≥ batch size
- Fixed-slot classes stay fixed
- Max classes per day per faculty

**Soft Constraints (Optimized)**:
- Balanced faculty workload across days
- Even class distribution
- Minimize student idle hours
- Maximize classroom utilization

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Export**: PDFKit & ExcelJS

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Build Tool**: Vite

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
cd "c:/Users/pavan/OneDrive/Desktop/Soppu Dhana"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env and configure your database
# DATABASE_URL="postgresql://user:password@localhost:5432/timetable_db?schema=public"
# JWT_SECRET="your-super-secret-jwt-key-change-in-production"
# PORT=5000
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with sample data
npm run prisma:seed
```

### 4. Start Backend Server

```bash
npm run dev
```

Backend will run on http://localhost:5000

### 5. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on http://localhost:3000

## 👤 Demo Credentials

After seeding the database, use these credentials:

**Admin Account**:
- Email: `admin@college.edu`
- Password: `admin123`

**Scheduler Account**:
- Email: `scheduler@college.edu`
- Password: `scheduler123`

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile

### Departments
- `GET /api/departments` - List all departments
- `POST /api/departments` - Create department (Admin)
- `PUT /api/departments/:id` - Update department (Admin)
- `DELETE /api/departments/:id` - Delete department (Admin)

### Classrooms
- `GET /api/classrooms` - List all classrooms
- `POST /api/classrooms` - Create classroom (Admin)
- `PUT /api/classrooms/:id` - Update classroom (Admin)
- `DELETE /api/classrooms/:id` - Delete classroom (Admin)
- `POST /api/classrooms/:id/availability` - Add availability (Admin)

### Faculties
- `GET /api/faculties` - List all faculties
- `POST /api/faculties` - Create faculty (Admin)
- `PUT /api/faculties/:id` - Update faculty (Admin)
- `DELETE /api/faculties/:id` - Delete faculty (Admin)
- `POST /api/faculties/:id/subjects` - Assign subject (Admin)

### Subjects
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create subject (Admin)
- `PUT /api/subjects/:id` - Update subject (Admin)
- `DELETE /api/subjects/:id` - Delete subject (Admin)

### Batches
- `GET /api/batches` - List all batches
- `POST /api/batches` - Create batch (Admin)
- `PUT /api/batches/:id` - Update batch (Admin)
- `DELETE /api/batches/:id` - Delete batch (Admin)
- `POST /api/batches/:id/subjects` - Assign subject (Admin)

### Timetables
- `POST /api/timetables/generate` - Generate timetables (Admin/Scheduler)
- `GET /api/timetables` - List all timetables
- `GET /api/timetables/:id` - Get timetable details
- `POST /api/timetables/:id/approve` - Approve timetable (Admin)
- `GET /api/timetables/:id/export/:format` - Export (pdf/excel)

## 🏗️ Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── controllers/           # Route controllers
│   ├── middleware/            # Auth & validation
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   │   ├── timetable.service.ts   # Generation engine
│   │   └── export.service.ts      # PDF/Excel export
│   └── index.ts               # Server entry point
└── package.json

frontend/
├── src/
│   ├── components/            # Reusable components
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/               # React context
│   │   └── AuthContext.tsx
│   ├── lib/                   # Utilities
│   │   └── api.ts             # Axios instance
│   ├── pages/                 # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Departments.tsx
│   │   ├── Classrooms.tsx
│   │   ├── Faculties.tsx
│   │   ├── Subjects.tsx
│   │   ├── Batches.tsx
│   │   ├── GenerateTimetable.tsx
│   │   └── ViewTimetable.tsx
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind styles
└── package.json
```

## 🧪 Sample Data

The seed script creates:
- 2 Departments (CSE, ECE)
- 6 Classrooms (Mix of classrooms and labs)
- 5 Faculty members
- 5 Subjects (Various semesters)
- 2 Batches (Semester 3 and 5)
- 2 User accounts (Admin and Scheduler)

## 🎓 Usage Workflow

1. **Login** as Admin using provided credentials
2. **Review Data** in Dashboard to see seeded entities
3. **Manage Entities** (optional):
   - Add/edit departments, classrooms, faculties, subjects, batches
   - Assign subjects to faculties and batches
4. **Generate Timetable**:
   - Go to "Generate Timetable"
   - Enter name and select semester
   - Click "Generate Timetables"
   - System generates 3 optimized options
5. **Review Options**:
   - Compare scores and schedules
   - View detailed timetable grid
6. **Approve & Export**:
   - Admin approves best option
   - Export as PDF or Excel

## 🔧 Algorithm Details

The timetable generation uses a **constraint-based heuristic algorithm**:

1. **Initialization**: Creates empty schedule grid (5 days × 7 time slots)
2. **Fixed Slots**: Schedules any fixed-slot classes first
3. **Iterative Scheduling**: For each batch and subject:
   - Attempts to place classes in random time slots
   - Validates against all hard constraints
   - Selects available faculty and classroom
   - Updates schedule to prevent conflicts
4. **Scoring**: Calculates optimization score based on:
   - Workload distribution variance
   - Classroom utilization rate
   - Student idle time penalties
5. **Multiple Options**: Generates 3 different timetables through randomization
6. **Ranking**: Sorts options by score (higher is better)

## 🚨 Error Handling

The system provides clear error messages for:
- Insufficient classrooms or time slots
- Faculty/classroom conflicts
- Capacity mismatches
- Constraint violations

## 📝 Development Notes

### Database Migrations

```bash
# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

### TypeScript

Both frontend and backend use strict TypeScript with full type safety.

### Code Organization

- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Middleware**: Authentication and validation
- **Routes**: Define API endpoints

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based authorization
- Input validation with express-validator
- SQL injection prevention via Prisma ORM

## ⚡ Performance

- Connection pooling via Prisma
- Efficient database queries with proper indexing
- Lazy loading of related entities
- Client-side caching of auth state

## 🐛 Known Limitations (Out of MVP Scope)

- No AI/ML prediction models
- No student preference optimization
- No mobile app
- No real-time attendance integration
- No auto-rescheduling on faculty leave
- No conflict resolution UI beyond regeneration

## 📈 Future Enhancements

- Genetic algorithm for better optimization
- Multi-campus support
- Real-time collaboration
- Mobile application
- Analytics dashboard
- Calendar integration
- Automated notifications

## 🤝 Contributing

This is an MVP project. For production use, consider:
- Adding comprehensive tests
- Implementing rate limiting
- Adding request logging
- Database backup strategy
- Load balancing for scalability
- Monitoring and alerting

## 📄 License

This project is for educational purposes.

## 👨‍💻 Development

Built with TypeScript, React, Node.js, Express, PostgreSQL, and Prisma.

---

**Success Criteria Met**:
✅ Timetables generate without clashes  
✅ Multiple optimized options produced  
✅ Admin can approve and export timetables  
✅ System explains failures when constraints conflict

For support or questions, please refer to the inline code documentation.
