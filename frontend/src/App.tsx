import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Classrooms from './pages/Classrooms';
import Faculties from './pages/Faculties';
import Subjects from './pages/Subjects';
import Batches from './pages/Batches';
import GenerateTimetable from './pages/GenerateTimetable';
import ViewTimetable from './pages/ViewTimetable';
import Layout from './components/Layout';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="departments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="classrooms"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Classrooms />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculties"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Faculties />
              </ProtectedRoute>
            }
          />
          <Route
            path="subjects"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Subjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="batches"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Batches />
              </ProtectedRoute>
            }
          />
          <Route
            path="generate-timetable"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SCHEDULER']}>
                <GenerateTimetable />
              </ProtectedRoute>
            }
          />
          <Route path="timetable/:id" element={<ViewTimetable />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
