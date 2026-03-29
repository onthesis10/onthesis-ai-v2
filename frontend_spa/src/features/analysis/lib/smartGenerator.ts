
// Smart Logic for AI Data Generator

export type VariableType = 'numeric' | 'likert' | 'nominal';

export interface VariableTemplate {
    name: string;
    type: VariableType;
    params: any;
}

export const inferTypeByName = (name: string): VariableType | null => {
    const lower = name.toLowerCase();

    // Likert keywords
    if (lower.match(/(motivasi|kepuasan|sikap|persepsi|minat|kepercayaan|loyalitas|setuju|skala|satisfaction|trust|attitude)/)) {
        return 'likert';
    }

    // Nominal keywords
    if (lower.match(/(gender|kelamin|kategori|jenis|fakultas|jurusan|prodi|status|metode|kelas|department|job|role|yes|no)/)) {
        return 'nominal';
    }

    // Numeric keywords
    if (lower.match(/(nilai|score|skor|umur|usia|tinggi|berat|gaji|income|pendapatan|jumlah|total|waktu|durasi|age|height|weight|salary|price)/)) {
        return 'numeric';
    }

    return null; // No inference
};

export const getFieldTemplates = (field: string): VariableTemplate[] => {
    const f = field.toLowerCase();

    // 1. Education
    if (f === 'education' || f === 'pendidikan') {
        return [
            { name: 'Motivasi Belajar', type: 'likert', params: { scale: 5 } },
            { name: 'Prestasi Akademik', type: 'numeric', params: { mean: 80, std: 10, min: 0, max: 100 } },
            { name: 'Metode Pembelajaran', type: 'nominal', params: { options: ['Daring', 'Luring', 'Hybrid'] } }
        ];
    }

    // 2. Health
    if (f === 'health' || f === 'kesehatan') {
        return [
            { name: 'Tekanan Darah (Sistolik)', type: 'numeric', params: { mean: 120, std: 15, min: 90, max: 160 } },
            { name: 'Kualitas Tidur', type: 'likert', params: { scale: 5 } },
            { name: 'Riwayat Penyakit', type: 'nominal', params: { options: ['Ada', 'Tidak Ada'] } }
        ];
    }

    // 3. Marketing
    if (f === 'marketing' || f === 'pemasaran') {
        return [
            { name: 'Brand Image', type: 'likert', params: { scale: 5 } },
            { name: 'Keputusan Pembelian', type: 'likert', params: { scale: 5 } },
            { name: 'Kategori Promosi', type: 'nominal', params: { options: ['Diskon', 'Cashback', 'Bundling'] } }
        ];
    }

    // 4. Psychology
    if (f === 'psychology' || f === 'psikologi') {
        return [
            { name: 'Tingkat Kecemasan', type: 'likert', params: { scale: 5 } },
            { name: 'Skor Resiliensi', type: 'numeric', params: { mean: 65, std: 10, min: 0, max: 100 } },
            { name: 'Coping Mechanism', type: 'nominal', params: { options: ['Adaptive', 'Maladaptive'] } },
        ];
    }

    // 5. Agriculture
    if (f === 'agriculture' || f === 'pertanian') {
        return [
            { name: 'Hasil Panen (Ton/Ha)', type: 'numeric', params: { mean: 5, std: 1.5, min: 1, max: 12 } },
            { name: 'Penggunaan Pupuk (Kg)', type: 'numeric', params: { mean: 200, std: 50, min: 50, max: 500 } },
            { name: 'Jenis Irigasi', type: 'nominal', params: { options: ['Tetes', 'Curah', 'Permukaan'] } }
        ];
    }

    // 6. Computer Science
    if (f === 'computer science' || f === 'ilmu komputer') {
        return [
            { name: 'System Response Time (ms)', type: 'numeric', params: { mean: 150, std: 40, min: 20, max: 1000 } },
            { name: 'Usability Score (SUS)', type: 'numeric', params: { mean: 75, std: 12, min: 0, max: 100 } },
            { name: 'Algoritma', type: 'nominal', params: { options: ['A-Star', 'Dijkstra', 'Greedy'] } }
        ];
    }

    // 7. Economics
    if (f === 'economics' || f === 'ekonomi') {
        return [
            { name: 'Pertumbuhan Ekonomi (%)', type: 'numeric', params: { mean: 5.2, std: 1.1, min: -2, max: 10 } },
            { name: 'Tingkat Inflasi (%)', type: 'numeric', params: { mean: 3.5, std: 0.8, min: 0, max: 15 } },
            { name: 'Sektor Industri', type: 'nominal', params: { options: ['Manufaktur', 'Jasa', 'Pertanian'] } }
        ];
    }

    // 8. Engineering
    if (f === 'engineering' || f === 'teknik') {
        return [
            { name: 'Kuat Tekan Beton (MPa)', type: 'numeric', params: { mean: 25, std: 3, min: 15, max: 40 } },
            { name: 'Efisiensi Mesin (%)', type: 'numeric', params: { mean: 85, std: 5, min: 50, max: 99 } },
            { name: 'Material Uji', type: 'nominal', params: { options: ['Baja', 'Komposit', 'Aluminium'] } }
        ];
    }

    // 9. Law
    if (f === 'law' || f === 'hukum') {
        return [
            { name: 'Tingkat Kesadaran Hukum', type: 'likert', params: { scale: 5 } },
            { name: 'Lama Putusan (Bulan)', type: 'numeric', params: { mean: 8, std: 3, min: 1, max: 36 } },
            { name: 'Jenis Perkara', type: 'nominal', params: { options: ['Pidana', 'Perdata', 'TUN'] } }
        ];
    }

    // 10. Public Administration
    if (f === 'public administration' || f === 'administrasi publik') {
        return [
            { name: 'Kualitas Pelayanan Publik', type: 'likert', params: { scale: 5 } },
            { name: 'Kepuasan Masyarakat', type: 'likert', params: { scale: 5 } },
            { name: 'Jenis Layanan', type: 'nominal', params: { options: ['Online', 'Offline', 'Drive-Thru'] } }
        ];
    }

    // 11. Social Science
    if (f === 'social science' || f === 'ilmu sosial') {
        return [
            { name: 'Interaksi Sosial', type: 'likert', params: { scale: 5 } },
            { name: 'Kohesi Masyarakat', type: 'likert', params: { scale: 5 } },
            { name: 'Status Ekonomi', type: 'nominal', params: { options: ['Bawah', 'Menengah', 'Atas'] } }
        ];
    }

    // 12. Management
    if (f === 'management' || f === 'manajemen') {
        return [
            { name: 'Gaya Kepemimpinan', type: 'likert', params: { scale: 5 } },
            { name: 'Kinerja Pegawai', type: 'numeric', params: { mean: 85, std: 8, min: 0, max: 100 } },
            { name: 'Departemen', type: 'nominal', params: { options: ['HRD', 'Keuangan', 'Operasional'] } }
        ];
    }

    // Default Fallback
    return [
        { name: 'Variabel X (Independen)', type: 'likert', params: { scale: 5 } },
        { name: 'Variabel Y (Dependen)', type: 'numeric', params: { mean: 50, std: 10, min: 0, max: 100 } }
    ];
};
