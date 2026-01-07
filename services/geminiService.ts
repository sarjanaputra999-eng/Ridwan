
import { GoogleGenAI } from "@google/genai";
import { ProgressRecord, Student, Grade } from "../types";

export const generateStudentReportAI = async (student: Student, records: ProgressRecord[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const recordSummary = records.map(r => 
    `- Tanggal: ${r.date}, Penilaian: ${r.grade}, Catatan: ${r.notes}`
  ).join('\n');

  const prompt = `
    Berikan analisis singkat dan motivasi islami untuk perkembangan belajar Al-Qur'an siswa berikut:
    Nama: ${student.name}
    Kelas: ${student.classType}
    Halaqoh: ${student.halaqoh}
    
    Data Rekaman Belajar:
    ${recordSummary}

    Tolong buatkan narasi dalam Bahasa Indonesia yang menyemangati dan memberikan saran perbaikan yang konstruktif.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI report:", error);
    return "Gagal memuat analisis cerdas saat ini.";
  }
};
