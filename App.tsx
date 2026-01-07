
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  Calendar,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { 
  Role, 
  ClassType, 
  User, 
  Student, 
  ProgressRecord, 
  MonthlySummary, 
  AppState,
  Grade 
} from './types';
import { generateStudentReportAI } from './services/geminiService';

// --- Components ---

const Button: React.FC<{ 
  onClick?: () => void; 
  className?: string; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  disabled?: boolean;
}> = ({ onClick, className = '', children, variant = 'primary', disabled = false }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50'
  };
  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props} 
    className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${props.className}`} 
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select 
    {...props} 
    className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${props.className}`}
  >
    {children}
  </select>
);

// --- Main App ---

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mutabaah_data');
    if (saved) return JSON.parse(saved);
    
    return {
      users: [
        { id: '1', name: 'Admin Utama', username: 'admin', role: Role.ADMIN },
        { id: '2', name: 'Ustadzah Aminah', username: 'aminah', role: Role.MUSYRIF, classType: ClassType.TAHSIN, isLocked: false },
        { id: '3', name: 'Ustadzah Fatimah', username: 'fatimah', role: Role.MUSYRIF, classType: ClassType.TAHFIDZ, isLocked: false }
      ],
      students: [
        { id: 's1', name: 'Ahmad Abdullah', className: 'A1', classType: ClassType.TAHSIN, musyrifId: '2', halaqoh: 'Subuh' },
        { id: 's2', name: 'Zaid bin Tsabit', className: 'H1', classType: ClassType.TAHFIDZ, musyrifId: '3', halaqoh: 'Maghrib' }
      ],
      records: [],
      monthlySummaries: [],
      currentUser: null
    };
  });

  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'ADMIN_USERS' | 'ADMIN_REPORTS' | 'MUSYRIF_STUDENTS' | 'STUDENT_DETAIL' | 'INPUT_PROGRESS'>('LOGIN');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('mutabaah_data', JSON.stringify(state));
  }, [state]);

  // Auth Handlers
  const handleLogin = (username: string) => {
    const user = state.users.find(u => u.username === username);
    if (user) {
      if (user.isLocked) {
        alert("Akses Anda ditutup. Silakan hubungi Admin karena keterlambatan pengisian laporan bulanan.");
        return;
      }
      setState(prev => ({ ...prev, currentUser: user }));
      setView('DASHBOARD');
    } else {
      alert("Username tidak ditemukan");
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setView('LOGIN');
    setAiReport(null);
  };

  // Logic: Locking Musyrif if Monthly Summary is Missing
  useEffect(() => {
    const checkLocks = () => {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      // Check each musyrif
      const updatedUsers = state.users.map(user => {
        if (user.role === Role.MUSYRIF) {
          const musyrifStudents = state.students.filter(s => s.musyrifId === user.id);
          const summaries = state.monthlySummaries.filter(m => m.musyrifId === user.id && m.month === lastMonthStr);
          
          // If no summary for last month and musyrif has students, lock them
          if (musyrifStudents.length > 0 && summaries.length === 0) {
            return { ...user, isLocked: true };
          }
        }
        return user;
      });

      if (JSON.stringify(updatedUsers) !== JSON.stringify(state.users)) {
        setState(prev => ({ ...prev, users: updatedUsers }));
      }
    };

    if (state.currentUser?.role === Role.ADMIN) checkLocks();
  }, [state.currentUser, state.monthlySummaries, state.students]);

  // AI Assistant Integration
  const fetchAiAnalysis = async (studentId: string) => {
    const student = state.students.find(s => s.id === studentId);
    const records = state.records.filter(r => r.studentId === studentId);
    if (!student) return;

    setIsAiLoading(true);
    const analysis = await generateStudentReportAI(student, records);
    setAiReport(analysis);
    setIsAiLoading(false);
  };

  // Render Logic
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Mutaba'ah Qur'an</h1>
          <p className="text-slate-500">Buku Kontrol Program Tahfidz & Tilawah</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <Input id="login-username" placeholder="Masukkan username..." onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
            }} />
          </div>
          <Button className="w-full justify-center" onClick={() => {
            const val = (document.getElementById('login-username') as HTMLInputElement).value;
            handleLogin(val);
          }}>
            Masuk Sekarang
          </Button>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">Pilih Akun Demo:</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleLogin('admin')} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">Admin</button>
              <button onClick={() => handleLogin('aminah')} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">Musyrifah (Aminah)</button>
              <button onClick={() => handleLogin('fatimah')} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">Musyrifah (Fatimah)</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSidebar = () => (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen fixed left-0 top-0 overflow-y-auto z-10 hidden md:block">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <BookOpen size={20} className="text-white" />
        </div>
        <span className="font-bold text-white text-lg tracking-tight">Qur'an Control</span>
      </div>
      
      <nav className="p-4 space-y-2">
        <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${view === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
          <LayoutDashboard size={20} /> <span>Dashboard</span>
        </button>

        {state.currentUser?.role === Role.ADMIN && (
          <>
            <button onClick={() => setView('ADMIN_USERS')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${view === 'ADMIN_USERS' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <Users size={20} /> <span>Data Musyrif/Siswa</span>
            </button>
            <button onClick={() => setView('ADMIN_REPORTS')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${view === 'ADMIN_REPORTS' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <ClipboardList size={20} /> <span>Laporan Bulanan</span>
            </button>
          </>
        )}

        {state.currentUser?.role === Role.MUSYRIF && (
          <>
            <button onClick={() => setView('MUSYRIF_STUDENTS')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${view === 'MUSYRIF_STUDENTS' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
              <Users size={20} /> <span>Input Mutaba'ah</span>
            </button>
          </>
        )}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs">
            {state.currentUser?.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{state.currentUser?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{state.currentUser?.role.toLowerCase()}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all text-sm">
          <LogOut size={18} /> <span>Keluar</span>
        </button>
      </div>
    </aside>
  );

  const renderDashboard = () => {
    const stats = {
      totalStudents: state.students.length,
      totalMusyrif: state.users.filter(u => u.role === Role.MUSYRIF).length,
      recentRecords: state.records.slice(-5).reverse(),
      classes: Object.values(ClassType).map(type => ({
        name: type,
        count: state.students.filter(s => s.classType === type).length
      }))
    };

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Selamat Datang, {state.currentUser?.name}!</h2>
          <p className="text-slate-500">Berikut adalah ringkasan data program Qur'an hari ini.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total Siswa</p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalStudents}</h3>
              </div>
              <Users className="text-indigo-200" size={24} />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Musyrif</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.totalMusyrif}</h3>
              </div>
              <UserPlus className="text-slate-400" size={24} />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">Input Hari Ini</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">
                  {state.records.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                </h3>
              </div>
              <CheckCircle2 className="text-emerald-500" size={24} />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">Kelas Aktif</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.classes.length}</h3>
              </div>
              <LayoutDashboard className="text-amber-500" size={24} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Riwayat Mutaba'ah Terbaru
            </h3>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Siswa</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Kelas</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nilai</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recentRecords.length > 0 ? stats.recentRecords.map(record => {
                      const student = state.students.find(s => s.id === record.studentId);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{student?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{record.date}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">{student?.classType}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                              record.grade === Grade.BAIK_SEKALI ? 'bg-emerald-100 text-emerald-700' :
                              record.grade === Grade.BAIK ? 'bg-blue-100 text-blue-700' :
                              record.grade === Grade.CUKUP ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {record.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => { setSelectedStudentId(record.studentId); setView('STUDENT_DETAIL'); }}
                              className="text-indigo-600 hover:underline text-sm font-medium"
                            >
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Belum ada rekaman mutaba'ah.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={20} className="text-indigo-600" />
              Statistik Kelas
            </h3>
            <Card className="p-6 space-y-4">
              {stats.classes.map(cls => (
                <div key={cls.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">{cls.name}</span>
                    <span className="text-slate-900 font-bold">{cls.count} Siswa</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${(cls.count / stats.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminUsers = () => {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h2>
            <p className="text-slate-500">Kelola data Musyrif, Musyrifah, dan Siswa.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => alert("Fitur Tambah Guru via Modal (Coming Soon)")}>
              <Plus size={18} /> Tambah Musyrif
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">Daftar Musyrif/Musyrifah</h3>
              <span className="bg-white px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-500 font-medium">
                {state.users.filter(u => u.role === Role.MUSYRIF).length} Orang
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {state.users.filter(u => u.role === Role.MUSYRIF).map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {user.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        {user.name} 
                        {user.isLocked && <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"><Lock size={10} /> Locked</span>}
                      </p>
                      <p className="text-xs text-slate-500">{user.classType} • @{user.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {user.isLocked ? (
                      <Button variant="outline" className="text-xs py-1 px-3" onClick={() => {
                        setState(prev => ({
                          ...prev,
                          users: prev.users.map(u => u.id === user.id ? { ...u, isLocked: false } : u)
                        }));
                      }}>
                        <Unlock size={14} /> Buka Akses
                      </Button>
                    ) : (
                      <Button variant="outline" className="text-xs py-1 px-3 border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                        setState(prev => ({
                          ...prev,
                          users: prev.users.map(u => u.id === user.id ? { ...u, isLocked: true } : u)
                        }));
                      }}>
                        <Lock size={14} /> Kunci
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">Daftar Siswa Aktif</h3>
              <Button variant="outline" className="text-xs py-1 px-3" onClick={() => alert("Fitur Tambah Siswa via Modal (Coming Soon)")}>
                <Plus size={14} /> Tambah
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {state.students.map(student => (
                <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {student.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.classType} • Halaqoh {student.halaqoh}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, students: prev.students.filter(s => s.id !== student.id) }))}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderMusyrifInput = () => {
    const myStudents = state.students.filter(s => s.musyrifId === state.currentUser?.id);
    
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Halaqoh Anda</h2>
          <p className="text-slate-500">Pilih siswa untuk menginput capaian harian atau bulanan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myStudents.map(student => (
            <Card key={student.id} className="hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer" onClick={() => {
              setSelectedStudentId(student.id);
              setView('STUDENT_DETAIL');
            }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold">
                    {student.name[0]}
                  </div>
                  <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold uppercase">{student.halaqoh}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">{student.name}</h3>
                <p className="text-slate-500 text-sm">{student.classType}</p>
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Terakhir input: 2 hari lalu</span>
                  <Button className="text-xs py-1.5 px-3">Input Data</Button>
                </div>
              </div>
            </Card>
          ))}
          {myStudents.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-200">
              Anda belum memiliki siswa yang terdaftar.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentDetail = () => {
    const student = state.students.find(s => s.id === selectedStudentId);
    const records = state.records.filter(r => r.studentId === selectedStudentId).reverse();
    const isOwner = state.currentUser?.id === student?.musyrifId || state.currentUser?.role === Role.ADMIN;

    if (!student) return null;

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <button onClick={() => setView(state.currentUser?.role === Role.ADMIN ? 'DASHBOARD' : 'MUSYRIF_STUDENTS')} className="text-sm font-medium text-indigo-600 flex items-center gap-1 hover:underline">
            &larr; Kembali
          </button>
          {isOwner && (
            <Button onClick={() => setView('INPUT_PROGRESS')}>
              <Plus size={18} /> Input Capaian Baru
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 text-center">
              <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-slate-400 border-4 border-white shadow-md">
                {student.name[0]}
              </div>
              <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
              <p className="text-slate-500 text-sm mb-4">{student.classType}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{student.halaqoh}</span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{student.className}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kehadiran</p>
                  <p className="text-lg font-bold text-slate-800">95%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Skor Rata2</p>
                  <p className="text-lg font-bold text-indigo-600">Baik</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-indigo-900 text-white overflow-hidden relative">
              <Sparkles className="absolute -right-4 -top-4 text-indigo-800 w-24 h-24 opacity-50" />
              <div className="relative z-10">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-amber-400" />
                  AI Analisis Capaian
                </h3>
                {aiReport ? (
                  <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap">
                    {aiReport}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-indigo-200 italic">Klik tombol di bawah untuk mendapatkan analisis perkembangan cerdas berbasis AI.</p>
                    <Button 
                      className="w-full justify-center bg-indigo-500 hover:bg-indigo-400 border-none"
                      onClick={() => fetchAiAnalysis(student.id)}
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? "Menganalisis..." : "Generate AI Report"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-slate-800">Riwayat Capaian Belajar</h3>
            <div className="space-y-4">
              {records.length > 0 ? records.map(record => (
                <Card key={record.id} className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="min-w-[100px] text-center md:border-r border-slate-100 md:pr-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">{new Date(record.date).toLocaleDateString('id-ID', { month: 'short' })}</p>
                    <p className="text-2xl font-black text-slate-800">{new Date(record.date).getDate()}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        record.grade === Grade.BAIK_SEKALI ? 'bg-emerald-100 text-emerald-700' :
                        record.grade === Grade.BAIK ? 'bg-blue-100 text-blue-700' :
                        record.grade === Grade.CUKUP ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.grade}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MessageCircle size={12} /> Catatan Pengajar
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm italic">"{record.notes}"</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {student.classType === ClassType.TAHFIDZ && record.tahfidzData && (
                        <>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">S: {record.tahfidzData.surah}:{record.tahfidzData.ayah}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Mur: {record.tahfidzData.murojaah}</span>
                        </>
                      )}
                      {student.classType === ClassType.TAHSIN && record.tahsinData && (
                        <>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">T: {record.tahsinData.tajwid}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">M: {record.tahsinData.makhorijul}</span>
                        </>
                      )}
                      {student.classType === ClassType.DASAR && record.dasarData && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Lvl: {record.dasarData.anabaLevel} Hal: {record.dasarData.page}</span>
                      )}
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="py-20 text-center text-slate-400 bg-white rounded-xl border-2 border-dashed border-slate-100">
                  Belum ada rekaman belajar untuk siswa ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInputProgress = () => {
    const student = state.students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      
      const newRecord: ProgressRecord = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: student.id,
        date: formData.get('date') as string,
        grade: formData.get('grade') as Grade,
        notes: formData.get('notes') as string,
      };

      // Add specific class data
      if (student.classType === ClassType.DASAR) {
        newRecord.dasarData = { 
          anabaLevel: formData.get('anabaLevel') as string, 
          page: formData.get('page') as string 
        };
      } else if (student.classType === ClassType.TAHSIN) {
        newRecord.tahsinData = { 
          tajwid: formData.get('tajwid') as string, 
          makhorijul: formData.get('makhorijul') as string,
          sifat: formData.get('sifat') as string
        };
      } else if (student.classType === ClassType.TAHFIDZ) {
        newRecord.tahfidzData = { 
          surah: formData.get('surah') as string, 
          ayah: formData.get('ayah') as string,
          murojaah: formData.get('murojaah') as string,
          tilawah: formData.get('tilawah') as string
        };
      } else if (student.classType === ClassType.TILAWAH) {
        newRecord.tilawahData = { 
          ghorib: formData.get('ghorib') as string, 
          maqomat: formData.get('maqomat') as string,
          hukum: formData.get('hukum') as string
        };
      }

      setState(prev => ({ ...prev, records: [...prev.records, newRecord] }));
      setView('STUDENT_DETAIL');
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setView('STUDENT_DETAIL')} className="text-sm font-medium text-indigo-600 hover:underline">
            &larr; Batalkan
          </button>
          <h2 className="text-xl font-bold text-slate-800">Input Capaian: {student.name}</h2>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Penilaian</label>
                <Select name="grade" required>
                  <option value={Grade.KURANG}>{Grade.KURANG}</option>
                  <option value={Grade.CUKUP}>{Grade.CUKUP}</option>
                  <option value={Grade.BAIK} selected>{Grade.BAIK}</option>
                  <option value={Grade.BAIK_SEKALI}>{Grade.BAIK_SEKALI}</option>
                </Select>
              </div>
            </div>

            {/* Class Specific Inputs */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{student.classType} Details</h4>
              
              {student.classType === ClassType.DASAR && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Jilid/Level Anaba</label>
                    <Input name="anabaLevel" placeholder="Contoh: Jilid 1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Halaman</label>
                    <Input name="page" placeholder="Contoh: 15" />
                  </div>
                </div>
              )}

              {student.classType === ClassType.TAHSIN && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tajwid</label>
                    <Input name="tajwid" placeholder="Topik..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Makhorijul</label>
                    <Input name="makhorijul" placeholder="Status..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Sifat Huruf</label>
                    <Input name="sifat" placeholder="Status..." />
                  </div>
                </div>
              )}

              {student.classType === ClassType.TAHFIDZ && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Surah</label>
                      <Input name="surah" placeholder="An-Naba" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Ayat</label>
                      <Input name="ayah" placeholder="1-10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Murojaah</label>
                    <Input name="murojaah" placeholder="Hafalan Lama..." />
                  </div>
                </div>
              )}

              {student.classType === ClassType.TILAWAH && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Ghorib</label>
                    <Input name="ghorib" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Maqomat</label>
                    <Input name="maqomat" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Hukum Bacaan</label>
                    <Input name="hukum" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
              <textarea 
                name="notes"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                placeholder="Berikan catatan singkat tentang bacaan hari ini..."
              ></textarea>
            </div>

            <Button type="submit" className="w-full justify-center py-3">Simpan Capaian</Button>
          </form>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'LOGIN') return renderLogin();
    
    return (
      <div className="min-h-screen bg-slate-50 md:pl-64">
        {renderSidebar()}
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" />
            <span className="font-bold">Qur'an Control</span>
          </div>
          <button onClick={() => alert("Menu (Coming Soon)")} className="p-2 bg-slate-100 rounded-lg">
            <LayoutDashboard size={20} />
          </button>
        </header>

        <main className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          {view === 'DASHBOARD' && renderDashboard()}
          {view === 'ADMIN_USERS' && renderAdminUsers()}
          {view === 'ADMIN_REPORTS' && (
             <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
               <h2 className="text-xl font-bold text-slate-800">Preview Pekerjaan Musyrif</h2>
               <p className="text-slate-500 mb-8">Halaman ini digunakan Admin untuk memantau akumulasi bulanan musyrif.</p>
               <Card className="max-w-2xl mx-auto p-4 text-left">
                  <div className="space-y-4">
                    {state.users.filter(u => u.role === Role.MUSYRIF).map(m => (
                      <div key={m.id} className="p-3 border-b flex justify-between">
                        <span>{m.name} ({m.classType})</span>
                        <span className="text-emerald-500 font-bold">Input Aktif</span>
                      </div>
                    ))}
                  </div>
               </Card>
             </div>
          )}
          {view === 'MUSYRIF_STUDENTS' && renderMusyrifInput()}
          {view === 'STUDENT_DETAIL' && renderStudentDetail()}
          {view === 'INPUT_PROGRESS' && renderInputProgress()}
        </main>
      </div>
    );
  };

  return (
    <div className="selection:bg-indigo-100 selection:text-indigo-700">
      {renderContent()}
    </div>
  );
};

export default App;
