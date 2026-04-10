import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import classroomRoutes from './routes/classroom.routes';
import facultyRoutes from './routes/faculty.routes';
import subjectRoutes from './routes/subject.routes';
import batchRoutes from './routes/batch.routes';
import departmentRoutes from './routes/department.routes';
import timetableRoutes from './routes/timetable.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/timetables', timetableRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run this to free it:  npx kill-port ${PORT}`);
    console.error(`   Or set a different PORT in your .env file.\n`);
    process.exit(1);
  } else {
    throw error;
  }
});
