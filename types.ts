
export enum Role {
  ADMIN = 'ADMIN',
  MUSYRIF = 'MUSYRIF',
  SISWA = 'SISWA'
}

export enum ClassType {
  DASAR = 'Kelas Dasar (Anaba)',
  TAHSIN = 'Kelas Tahsin',
  TILAWAH = 'Kelas Tilawah',
  TAHFIDZ = 'Kelas Tahfidzul Qur\'an'
}

export enum Grade {
  KURANG = 'Kurang',
  CUKUP = 'Cukup',
  BAIK = 'Baik',
  BAIK_SEKALI = 'Baik Sekali'
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  classType?: ClassType;
  isLocked?: boolean;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  classType: ClassType;
  musyrifId: string;
  halaqoh: string;
}

export interface ProgressRecord {
  id: string;
  studentId: string;
  date: string;
  grade: Grade;
  notes: string;
  // Specific data based on ClassType
  dasarData?: { anabaLevel: string; page: string };
  tahsinData?: { tajwid: string; makhorijul: string; sifat: string };
  tilawahData?: { ghorib: string; maqomat: string; hukum: string };
  tahfidzData?: { surah: string; ayah: string; murojaah: string; tilawah: string };
}

export interface MonthlySummary {
  id: string;
  studentId: string;
  musyrifId: string;
  month: string; // YYYY-MM
  startStatus: string;
  endStatus: string;
  isSubmitted: boolean;
}

export interface AppState {
  users: User[];
  students: Student[];
  records: ProgressRecord[];
  monthlySummaries: MonthlySummary[];
  currentUser: User | null;
}
