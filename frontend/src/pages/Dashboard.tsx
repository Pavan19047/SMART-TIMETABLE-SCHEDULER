import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  to: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, gradient, to }) => (
  <Link to={to} className="group block">
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient}`}>
          <span className="w-5 h-5 text-white">{icon}</span>
        </div>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <p className="text-3xl font-bold text-slate-800 mb-1">{value}</p>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  </Link>
);

const statusConfig: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Approved', cls: 'badge-green' },
  LOCKED:   { label: 'Locked',   cls: 'badge-gray'  },
  DRAFT:    { label: 'Draft',    cls: 'badge-yellow' },
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ departments: 0, classrooms: 0, faculties: 0, subjects: 0, batches: 0, timetables: 0 });
  const [timetables, setTimetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [deptRes, classRes, facRes, subRes, batchRes, ttRes] = await Promise.all([
        api.get('/departments'), api.get('/classrooms'), api.get('/faculties'),
        api.get('/subjects'), api.get('/batches'), api.get('/timetables'),
      ]);
      setStats({
        departments: deptRes.data.departments?.length || 0,
        classrooms:  classRes.data.classrooms?.length  || 0,
        faculties:   facRes.data.faculties?.length     || 0,
        subjects:    subRes.data.subjects?.length      || 0,
        batches:     batchRes.data.batches?.length     || 0,
        timetables:  ttRes.data.timetables?.length     || 0,
      });
      setTimetables(ttRes.data.timetables?.slice(0, 5) || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const icons = {
    departments: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
    classrooms:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>),
    faculties:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>),
    subjects:    (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>),
    batches:     (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>),
    timetables:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  };

  const statCards = [
    { label: 'Departments',  value: stats.departments, icon: icons.departments, gradient: 'bg-indigo-500',  to: '/departments'       },
    { label: 'Classrooms',   value: stats.classrooms,  icon: icons.classrooms,  gradient: 'bg-emerald-500', to: '/classrooms'        },
    { label: 'Faculties',    value: stats.faculties,   icon: icons.faculties,   gradient: 'bg-amber-500',   to: '/faculties'         },
    { label: 'Subjects',     value: stats.subjects,    icon: icons.subjects,    gradient: 'bg-violet-500',  to: '/subjects'          },
    { label: 'Batches',      value: stats.batches,     icon: icons.batches,     gradient: 'bg-rose-500',    to: '/batches'           },
    { label: 'Timetables',   value: stats.timetables,  icon: icons.timetables,  gradient: 'bg-sky-500',     to: '/timetables'        },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{greeting()},</p>
          <h1 className="text-2xl font-bold text-slate-800">{user?.name} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your timetables today.</p>
        </div>
        <Link
          to="/generate-timetable"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Generate Timetable
        </Link>
      </div>

      {/* Stats grid */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* Recent timetables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Timetables</h2>
          <Link to="/timetables" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            View all →
          </Link>
        </div>

        {timetables.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">No timetables generated yet</p>
            <p className="text-slate-400 text-xs mt-1">Click "Generate Timetable" to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {timetables.map((tt, idx) => {
                const sc = statusConfig[tt.status] || { label: tt.status, cls: 'badge-gray' };
                return (
                  <Link
                    key={tt.id}
                    to={`/timetable/${tt.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {tt.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Semester {tt.semester}
                        {tt.score != null && <> &bull; Score: <span className="font-medium">{tt.score.toFixed(2)}</span></>}
                      </p>
                    </div>
                    <span className={sc.cls}>{sc.label}</span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
