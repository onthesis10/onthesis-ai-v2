
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

    if (f === 'education' || f === 'pendidikan') {
        return [
            { name: 'Motivasi Belajar', type: 'likert', params: { scale: 5 } },
            { name: 'Prestasi Akademik', type: 'numeric', params: { mean: 80, std: 10, min: 0, max: 100 } },
            { name: 'Gender', type: 'nominal', params: { options: ['Laki-laki', 'Perempuan'] } },
            { name: 'Metode Pembelajaran', type: 'nominal', params: { options: ['Daring', 'Luring', 'Hybrid'] } }
        ];
    }

    if (f === 'health' || f === 'kesehatan') {
        return [
            { name: 'Tekanan Darah', type: 'numeric', params: { mean: 120, std: 15, min: 90, max: 160 } },
            { name: 'Kepuasan Pasien', type: 'likert', params: { scale: 5 } },
            { name: 'Riwayat Penyakit', type: 'nominal', params: { options: ['Ada', 'Tidak Ada'] } },
            { name: 'Usia', type: 'numeric', params: { mean: 45, std: 12, min: 18, max: 90 } }
        ];
    }

    if (f === 'marketing' || f === 'pemasaran') {
        return [
            { name: 'Brand Image', type: 'likert', params: { scale: 7 } },
            { name: 'Keputusan Pembelian', type: 'likert', params: { scale: 7 } },
            { name: 'Income Bulanan', type: 'numeric', params: { mean: 5000000, std: 2000000, min: 1000000, max: 20000000 } },
            { name: 'Loyalitas', type: 'likert', params: { scale: 7 } }
        ];
    }

    if (f === 'psychology' || f === 'psikologi') {
        return [
            { name: 'Kecemasan', type: 'likert', params: { scale: 5 } },
            { name: 'Stress Level', type: 'numeric', params: { mean: 50, std: 15, min: 0, max: 100 } },
            { name: 'Coping Mechanism', type: 'nominal', params: { options: ['Adaptive', 'Maladaptive'] } },
        ];
    }

    return [];
};
