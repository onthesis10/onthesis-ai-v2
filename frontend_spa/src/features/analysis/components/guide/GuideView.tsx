import { BookOpen, Search, ArrowLeft, CheckCircle2, Sigma, BarChart2, TrendingUp, PieChart, GitCompare, Activity, Layers, Scale, GraduationCap, Quote, Database, Network, Lightbulb, Link2, GitBranch, Share2, Focus } from 'lucide-react'
import { useState } from 'react'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface GuideItem {
    id: string
    title: string
    duration: string
    icon: React.ReactNode
    category: string
    content: React.ReactNode
}

export const GuideView = () => {
    const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const { theme } = useThemeStore()

    // --- THEME CONFIG (Ultra Premium, Expansive, Glassmorphic) ---
    const activeConfig = {
        light: {
            toolbar: "bg-white/90 border-transparent shadow-sm backdrop-blur-xl ring-1 ring-black/5",
            cardBase: "bg-white/80 border-transparent ring-1 ring-black/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300",
            cardHeader: "bg-slate-50/50 border-black/5",
            cardContent: "bg-white text-slate-700",
            textMain: "text-slate-900",
            textMuted: "text-slate-500",
            accentIcon: "bg-[#007AFF]/10 text-[#007AFF]",
            accentText: "text-[#007AFF]",
            btnPrimary: "bg-[#007AFF] text-white hover:bg-blue-600 shadow-sm border-transparent",
            btnSecondary: "text-slate-500 hover:text-slate-900 hover:bg-black/5",
            searchInput: "bg-black/5 border-transparent text-slate-800 focus:bg-white focus:ring-1 focus:ring-black/10 placeholder:text-slate-400",
            badge: "bg-black/5 text-slate-700 border-transparent",
            infoBox: "bg-slate-50 border-slate-200/50 text-slate-700",
            divider: "border-black/5",
        },
        dark: {
            toolbar: "bg-[#0B1120]/90 border-b border-white/5 shadow-sm backdrop-blur-xl",
            cardBase: "bg-[#1E293B]/40 border border-white/5 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-white/10 hover:bg-[#1E293B]/60 transition-all duration-300",
            cardHeader: "bg-white/[0.02] border-white/5",
            cardContent: "bg-[#0B1120]/60 text-slate-300",
            textMain: "text-white",
            textMuted: "text-slate-400",
            accentIcon: "bg-white/5 text-white",
            accentText: "text-white",
            btnPrimary: "bg-white text-black hover:opacity-90 shadow-sm border-transparent",
            btnSecondary: "text-slate-400 hover:text-white hover:bg-white/10",
            searchInput: "bg-white/5 border-transparent text-white focus:bg-white/10 focus:ring-1 focus:ring-white/20 placeholder:text-slate-500",
            badge: "bg-white/10 text-slate-200 border-transparent",
            infoBox: "bg-white/[0.02] border-white/10 text-slate-300",
            divider: "border-white/10",
        },
        happy: {
            toolbar: "bg-white/90 border-b border-stone-200 shadow-sm backdrop-blur-xl",
            cardBase: "bg-white/80 border border-stone-200/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300",
            cardHeader: "bg-stone-50/50 border-stone-100",
            cardContent: "bg-white text-stone-700",
            textMain: "text-stone-900",
            textMuted: "text-stone-500",
            accentIcon: "bg-orange-50 text-orange-600",
            accentText: "text-stone-900",
            btnPrimary: "bg-stone-900 text-white hover:bg-stone-800 shadow-sm border-transparent",
            btnSecondary: "text-stone-500 hover:text-stone-900 hover:bg-stone-100",
            searchInput: "bg-stone-100 border-transparent text-stone-800 focus:bg-white focus:ring-1 focus:ring-stone-200 placeholder:text-stone-400",
            badge: "bg-stone-100 text-stone-800 border-transparent",
            infoBox: "bg-stone-50 border-stone-200 text-stone-700",
            divider: "border-stone-100",
        }
    }[theme as ThemeMode || 'dark']

    const guides: { category: string, items: GuideItem[] }[] = [
        {
            category: "Eksplorasi Konsep Fundamental",
            items: [
                {
                    id: 'what-is-data-analysis',
                    title: "Filosofi & Konsep Analisis Data",
                    icon: <Layers className="w-6 h-6" />,
                    duration: "8 mnt",
                    category: "Pendahuluan",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Esensi Analisis Data dalam Konteks Akademik</h3>
                                <p>
                                    Menurut Sugiyono (2019), analisis data merupakan proses mencari dan menyusun secara sistematis data yang relevan agar hasilnya dapat mudah dipahami dan temuan baru dapat diinformasikan kepada orang lain.
                                    Lebih jauh lagi, proses ini bukanlah serangkaian penghitungan mekanis belaka, melainkan sebuah instrumen pembuktian (evidence-based) untuk menguji kebenaran empiris dari suatu teori atau hipotesis yang diajukan peneliti.
                                </p>
                                <p>
                                    Data mentah (raw data)—betapapun besarnya kuantitasnya—tidak memiliki makna jika tidak ada *treatment* analisis yang tepat. Ada pola tersembunyi, hubungan kausal, maupun signifikansi prediksi di baliknya yang harus diekstraksi melalui berbagai alat uji statistik yang kredibel.
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm", activeConfig.cardHeader)}>
                                <div className="relative z-10">
                                    <h4 className="font-semibold text-xl mb-8 flex items-center gap-3">
                                        <Database className="w-6 h-6 opacity-70" /> 3 Pilar Klasifikasi Analisis Data
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white/60 dark:bg-black/20 p-8 rounded-2xl border shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                                <BarChart2 className="w-6 h-6" />
                                            </div>
                                            <h5 className="font-semibold mb-3">Deskriptif</h5>
                                            <p className="text-sm opacity-80 leading-relaxed">Menjawab pertanyaan fundamental "Apa yang terjadi?". Bertujuan merangkum sifat dasar data sampel secara demografik (misal: Mean, Median, Standar Deviasi, Frekuensi) (Ghozali, 2018).</p>
                                        </div>
                                        <div className="bg-white/60 dark:bg-black/20 p-8 rounded-2xl border shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                                <TrendingUp className="w-6 h-6" />
                                            </div>
                                            <h5 className="font-semibold mb-3">Komparatif/Asosiatif</h5>
                                            <p className="text-sm opacity-80 leading-relaxed">Menjawab "Adakah hubungan atau perbedaan?". Merujuk pada relasi antara variabel (Korelasi) maupun perbedaan tendensi antar 2 atau lebih grup (Uji-T, ANOVA).</p>
                                        </div>
                                        <div className="bg-white/60 dark:bg-black/20 p-8 rounded-2xl border shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-1">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                                <Network className="w-6 h-6" />
                                            </div>
                                            <h5 className="font-semibold mb-3">Prediktif/Kausal</h5>
                                            <p className="text-sm opacity-80 leading-relaxed">Menjawab "Sejauh mana pengaruh ke depan?". Penggunaan permodelan matematis kompleks seperti Regresi atau SEM untuk meramalkan dependen merujuk probabilitas dari variabel independen historiknya.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className={cn("font-bold text-2xl border-b pb-4 mt-8", activeConfig.divider, activeConfig.textMain)}>Tingkat Ketat (Rigorousness) dalam Riset</h3>
                                <p className="leading-relaxed opacity-90 text-lg">
                                    Analisis yang kredibel ditandai dengan kemampuannya menahan pengujian bias maupun outliers. Oleh karenanya, dunia riset memegang teguh hukum probabilitas untuk menolak atau menerima Null Hypothesis (H₀). Tuntutan seperti Uji Asumsi Klasik ataupun Uji Validitas bukanlah formality, melainkan syarat mutlak untuk menghindari kesimpulan prematur (Type I atau Type II errors).
                                </p>
                            </div>

                            <div className={cn("mt-16 pt-8 border-t", activeConfig.divider, activeConfig.textMuted)}>
                                <h5 className={cn("font-semibold text-sm flex items-center gap-2 mb-4 tracking-wide uppercase", activeConfig.textMain)}>
                                    <Quote className="w-4 h-4 opacity-70" /> Referensi Akademik
                                </h5>
                                <ul className="space-y-3 opacity-80 text-sm">
                                    <li>Sugiyono. (2019). <i>Metode Penelitian Kuantitatif Kualitatif dan R&D</i>. Alfabeta.</li>
                                    <li>Ghozali, I. (2018). <i>Aplikasi Analisis Multivariate Dengan Program IBM SPSS 25</i> (9th ed.). Badan Penerbit Universitas Diponegoro.</li>
                                </ul>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            category: "Statistik Deskriptif & Preparasi Data",
            items: [
                {
                    id: 'descriptive-summary',
                    title: "Statistik Deskriptif & Frekuensi",
                    icon: <BarChart2 className="w-6 h-6" />,
                    duration: "6 mnt",
                    category: "Deskriptif",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Potret Profil Data (Profiling)</h3>
                                <p>
                                    Statistik deskriptif adalah metode-metode yang berkaitan dengan pengumpulan dan penyajian suatu gugus data sehingga memberikan informasi yang berguna. Menurut Walpole (1995), fungsi utama statistika deskriptif pada dasarnya adalah <b>mereduksi data</b> ke dalam wujud simplifikasi agar tabulasi ribuan respons dapat dibaca maknanya secara manusiawi.
                                </p>
                                <p>
                                    Berbeda dengan Inferensial, analisis ini <b>tidak digunakan untuk mengambil kesimpulan yang digeneralisasi pada level populasi</b>, melainkan sepenuhnya hanya melukiskan keadaan subjek secara apa adanya (<i>as is</i>).
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm", activeConfig.cardHeader)}>
                                <h4 className="font-semibold text-xl mb-6 flex items-center gap-3">
                                    <Database className="w-6 h-6 opacity-70" /> Metrik Pengukuran Sentral
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>Ukuran Pemusatan (Central Tendency)</b>
                                        <ul className="list-disc list-inside space-y-2 opacity-80 text-sm">
                                            <li><b>Mean (Rata-rata):</b> Titik pusat gravitasi data rasio/interval.</li>
                                            <li><b>Median:</b> Nilai ekuator/tengah, aman dari outlier (nilai ekstrem).</li>
                                            <li><b>Mode (Modus):</b> Nilai probabilitas muncul tertinggi/tersering. Cocok untuk data nominal kategori.</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>Ukuran Penyebaran (Dispersion)</b>
                                        <ul className="list-disc list-inside space-y-2 opacity-80 text-sm">
                                            <li><b>Variance & Std. Deviation:</b> Standar deviasi mengukur keragaman. Jika sangat tinggi, heterogenitas sampel riset terbukti membesar.</li>
                                            <li><b>Range / IQR:</b> Bentangan perbedaan absolut antar skor tertinggi dan terendah.</li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm md:col-span-2">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>Distribusi Frekuensi & Crosstab</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Menampilkan proporsi kategori tunggal berupa persentase. Dalam laporan riset (Skripsi/Tesis), tabel profil demografi (usia, gender, dll.) hampir pasti memakai Frequency Table yang dipadu Bar/Pie Chart.</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn("mt-16 pt-8 border-t", activeConfig.divider, activeConfig.textMuted)}>
                                <h5 className={cn("font-semibold text-sm flex items-center gap-2 mb-4 tracking-wide uppercase", activeConfig.textMain)}>
                                    <Quote className="w-4 h-4 opacity-70" /> Referensi Akademik
                                </h5>
                                <ul className="space-y-3 opacity-80 text-sm">
                                    <li>Walpole, R. E. (1995). <i>Pengantar Statistika</i> (Edisi 3). PT Gramedia Pustaka Utama.</li>
                                    <li>Sekaran, U., & Bougie, R. (2016). <i>Research Methods for Business: A Skill Building Approach</i> (7th ed.). John Wiley & Sons.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'normality',
                    title: "Uji Asumsi: Normalitas Parameter",
                    icon: <Activity className="w-6 h-6" />,
                    duration: "10 mnt",
                    category: "Asumsi Klasik",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Landasan Kurva Gaussian (Bell Curve)</h3>
                                <p>
                                    Normalitas adalah prasyarat atau asas tunggal yang menentukan apakah peneliti diizinkan melakukan uji beda *parametrik* yang bertenaga besar (T-Test, Anova) atau terpaksa menurunkan kelasnya ke non-parametrik (Mann-Whitney, dsj). Normalitas mengukur apakah distribusi *Standard Error* dari populasi ditaksir simetris mengikuti kurva lonceng.
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm", activeConfig.cardHeader, theme === 'happy' ? "border-t-orange-500/50" : "border-t-[#007AFF]/50 dark:border-t-[#0EA5E9]/50", "border-t-[4px]")}>
                                <div className="relative z-10">
                                    <h4 className="font-semibold text-xl mb-6 flex items-center gap-3">
                                        <Lightbulb className="w-6 h-6 opacity-70" /> Kaidah Pengambilan Keputusan Klinis
                                    </h4>
                                    <p className="text-lg opacity-90 leading-relaxed mb-6">
                                        Berbeda dengan uji lain yang H₀-nya sering dibantah, di Uji Kolmogorov/Shapiro-Wilk, kita *justru berharap* model gagal menolak H₀. Perumusannya:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-xl border bg-white/50 dark:bg-black/20 text-sm font-medium"><span className="font-bold">H₀:</span> Data tersinkronisasi / berdistribusi Normal.</div>
                                        <div className="p-4 rounded-xl border bg-white/50 dark:bg-black/20 text-sm font-medium"><span className="font-bold">H₁:</span> Data deviatif (TIDAK Normal).</div>
                                    </div>
                                    <div className="mt-8 bg-white/60 dark:bg-black/30 p-6 rounded-2xl border shadow-sm text-base leading-relaxed">
                                        Oleh karena itu, wajib hukumnya output <b>Sig. p-value &gt; 0.05</b> (lebih besar dari margin alpha 5%) agar data dianggap valid didistribusikan normal.
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 mt-12">
                                <h3 className={cn("font-bold text-xl border-b pb-4", activeConfig.divider)}>Instrumen Deteksi Primer</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>Shapiro-Wilk (W)</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Menurut Royston (1992), Shapiro-Wilk adalah metode presisi akut untuk sampel berskala sangat kecil (<b className={activeConfig.textMain}>n &lt; 50</b>). Sensitivitasnya pada skewness (kemiringan tail) sangat tinggi.</span>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>Kolmogorov-Smirnov (K-S)</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Digunakan massal pada data bervolume jumbo (<b className={activeConfig.textMain}>n &gt; 50</b>). Membandingkan rentangan fungsional antara distribusi sampel realitas vs CDF absolut teoritis.</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn("mt-16 pt-8 border-t", activeConfig.divider, activeConfig.textMuted)}>
                                <h5 className={cn("font-semibold text-sm flex items-center gap-2 mb-4 tracking-wide uppercase", activeConfig.textMain)}>
                                    <Quote className="w-4 h-4 opacity-70" /> Referensi Akademik
                                </h5>
                                <ul className="space-y-3 opacity-80 text-sm">
                                    <li>Royston, P. (1992). Approximating the Shapiro-Wilk W-Test for non-normality. <i>Statistics and Computing</i>, 2(3), 117-119.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'reliability-validity',
                    title: "Uji Kualitas Instrumen: Reliabilitas & Validitas",
                    icon: <CheckCircle2 className="w-6 h-6" />,
                    duration: "10 mnt",
                    category: "Validitas & Reliabilitas",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Akurasi Kuesioner dan Skala Ukur</h3>
                                <p>
                                    Data murni (primer) mutlak diuji keandalannya sebelum dimasak ke tahapan analisis kausalitas. Terdapat dua kutub krusial dalam instrumen buatan peneliti: Validitas dan Reliabilitas. Kausalitas regresi tidak ada harganya sama sekali, jika data dihasilkan dari alat ukur yang cacat atau bias pengisian (Nunnally, 1978).
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm", activeConfig.cardHeader)}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className={cn("font-bold text-lg mb-4 flex items-center gap-3 border-b pb-3", activeConfig.textMain)}>
                                            <Share2 className="w-5 h-5 opacity-70" /> 1. Validitas (Pearson/CFA)
                                        </h4>
                                        <p className="text-sm opacity-80 leading-relaxed">
                                            <b>Mengukur Keketatan Sasaran:</b> "Apakah kuesioner Anda benar-benar menangkap makna dari konsep yang mau Anda teliti?". Variabel Stress Kerja butir-butirnya tak boleh tercampur maknanya atau *multicol* dengan variabel Burnout.
                                        </p>
                                        <p className="text-sm opacity-80 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-4 border rounded-xl">
                                            Syarat mutlak di lapangan: R Hitung item wajib &gt; (lebih besar dari) nilai signifikansi konstan Tabel R *degrees of freedom* atau Sig(2-tailed) &lt; 0.05. Jika melanggar, item spesifik wajib disingkirkan/dihapus (<i>Drop Out</i>).
                                        </p>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className={cn("font-bold text-lg mb-4 flex items-center gap-3 border-b pb-3", activeConfig.textMain)}>
                                            <GitBranch className="w-5 h-5 opacity-70" /> 2. Reliabilitas (Cronbach Alpha)
                                        </h4>
                                        <p className="text-sm opacity-80 leading-relaxed">
                                            <b>Mengukur Konsistensi Internal:</b> "Bila saya memberikan alat kuesioner ini lagi ke populasi sasaran besok lusa, apakah rentang angkanya tetap homogen atau fluktuatif ngasal?".
                                        </p>

                                        <div className="space-y-3">
                                            <div className={cn("flex justify-between items-center p-3 rounded-lg border bg-white/50 dark:bg-black/20 shadow-sm", activeConfig.divider)}>
                                                <span className="font-mono font-medium">α ≥ 0.90</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase">Sangat Reliabel</span>
                                            </div>
                                            <div className={cn("flex justify-between items-center p-3 rounded-lg border bg-white/50 dark:bg-black/20 shadow-sm", activeConfig.divider)}>
                                                <span className="font-mono font-medium">0.70 ≤ α</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase">Batas Amankah (Acceptable)</span>
                                            </div>
                                            <div className={cn("flex justify-between items-center p-3 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 shadow-sm", activeConfig.divider)}>
                                                <span className="font-mono font-medium text-rose-600">α &lt; 0.60</span>
                                                <span className="text-rose-600 font-semibold text-xs uppercase">Invalid (Ditolak)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={cn("mt-16 pt-8 border-t", activeConfig.divider, activeConfig.textMuted)}>
                                <h5 className={cn("font-semibold text-sm flex items-center gap-2 mb-4 tracking-wide uppercase", activeConfig.textMain)}>
                                    <Quote className="w-4 h-4 opacity-70" /> Referensi Akademik
                                </h5>
                                <ul className="space-y-3 opacity-80 text-sm">
                                    <li>Nunnally, J. C. (1978). <i>Psychometric Theory</i>. McGraw-Hill.</li>
                                </ul>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            category: "Analisis Komparatif Parametrik (Uji-T & ANOVA)",
            items: [
                {
                    id: 'independent-ttest',
                    title: "Uji Independent Sample T-Test",
                    icon: <GitCompare className="w-6 h-6" />,
                    duration: "8 mnt",
                    category: "Parametrik Beda",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Uji Beda Dua Kelompok Terpisah</h3>
                                <p>
                                    Uji Independent Sample T-Test merupakan alat komparatif fundamental yang mutlak dilandasi parameter distribusi Normal. Ini bukan tentang mencari "sebab-akibat", melainkan menjawab <b>"Apakah terdapat perbedaan rata-rata (Mean) yang definitif antara KELOMPOK A dengan subjek independen KELOMPOK B?"</b>.
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm", activeConfig.cardHeader, theme === 'happy' ? "border-t-orange-500/50" : "border-t-[#007AFF]/50 dark:border-t-[#0EA5E9]/50", "border-t-[4px]")}>
                                <div className="relative z-10">
                                    <h4 className="font-semibold text-xl mb-4 flex items-center gap-3">
                                        <Lightbulb className="w-6 h-6 opacity-70" /> Syarat Klinis Utama
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 mb-6 text-sm">
                                        <div className="p-4 rounded-xl border bg-white/50 dark:bg-black/20 flex flex-col gap-2">
                                            <b className="text-base">1. Skala Pengukuran Valid:</b>
                                            <span className="opacity-80">Variabel uji Dependent harus bertipe Skala Kontinu/Metrik (Rasio & Interval), sementara sumbu independennya spesifik 2 kategori kategorikal yang terpisah persilangan anggotanya (misal: "Laki-laki" vs "Perempuan", "Perusahaan Manufaktur" vs "Retail").</span>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-white/50 dark:bg-black/20 flex flex-col gap-2">
                                            <b className="text-base">2. Levene’s Test of Equality of Variances:</b>
                                            <span className="opacity-80">Sebelum T-Test dapat diterima, harus dikonfirmasi melalui nilai uji Levene; menguji jika sebaran sampel dari kelompoknya bersifat <i>homogen</i> (Sig. &gt; 0,05) ataukah <i>Heterogen</i> berantakan. Tergantung hasil asumsi ini, SPSS/sistem akan membacakan baris perhitungan "Equal variances assumed" vs "Not assumed" pada laporan akhirnya.</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 bg-white/60 dark:bg-black/30 p-6 rounded-2xl border shadow-sm text-base leading-relaxed">
                                        Bila <b>Sig. p-value &lt; 0.05</b> terdeteksi pada *T-Test for Equality of Means*, maka hipotesis nol DITOLAK: Secara absolut terbukti ada perbedaan signifikan yang mendasari dua kutub kelompok studi tersebut.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'paired-ttest',
                    title: "Uji Paired Sample T-Test",
                    icon: <Link2 className="w-6 h-6" />,
                    duration: "6 mnt",
                    category: "Parametrik Beda",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Evaluasi Historis Kelompok (Pre-Post)</h3>
                                <p>
                                    Uji beda Paired (Subjek Bergabung) menganut sistem pengujian T dimana sasaran subjek objek dari data kelurahan awal, <i>sama persis</i> alias tidak pindah orang, dengan data objek yang akan dinilai pada akhir pengujian (<i>Time-Series Repeats</i>).
                                </p>
                            </div>

                            <div className={cn("p-10 rounded-[2rem] border shadow-sm text-center", activeConfig.infoBox)}>
                                <h4 className="font-bold mb-4 text-xl">Ilustrasi Klasik</h4>
                                <p className="text-base opacity-90 leading-relaxed max-w-2xl mx-auto italic mb-6">
                                    "Apakah intervensi modifikasi nutrisi jenis X efektif mengakselerasi tingkat metabolisme basal dari **(PASIEN RAWAT JALAN KLINIK A - Evaluasi BUKAN PASIEN BARU Melainkan Pasien Lama yang Sama)** jika disandingkan hasil labnya antara observasi 3 bulan lalu vs pengukuran ulang hari ini?"
                                </p>
                                <div className="text-sm font-semibold opacity-70 uppercase tracking-widest border-t border-current pt-4">Rancangan Pre-Test versus Post-Test Design</div>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'oneway-anova',
                    title: "Uji Analisis Varians Dini (One-Way ANOVA)",
                    icon: <Layers className="w-6 h-6" />,
                    duration: "8 mnt",
                    category: "Parametrik Beda",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Beyond the Twin Group</h3>
                                <p>
                                    Fisher's Analysis of Variance (ANOVA 1 Arah/Faktor Tunggal), dalam bahasa akademisnya, difungsikan mengatasi limitasi absolut dari metode Independent T-Test yang mengkapitulasi maksimal pengujian di margin **dua kelompok**. Begitu populasi observasi dipecah menjadi *tiga segregasi atau lebih ganda* secara parsial murni, ANOVA dipanggil beraksi.
                                </p>
                            </div>

                            <div className="bg-white/50 dark:bg-black/20 border p-8 rounded-[2rem] shadow-sm">
                                <h4 className="font-bold text-lg mb-4 text-amber-600 dark:text-amber-400">Kasus Penggandaan Skew (Alpha Inflation Error)</h4>
                                <p className="text-base leading-relaxed opacity-90">
                                    Jika misalnya 10 Merk Produk dibandingkan satu-satu selayaknya Turnamen Eliminasi kompetisi olahraga memakai deretan `Uji T-Test` tunggal, margin probabilitas melakukan *False Positive Decision* (Type 1 Error Bias) membengkak tanpa kendali dari 0.05 limit ke skala astronomis gilirannya. ANOVA Omnibus F-Test langsung **mengkarantinasinya menyeluruh via hitungan rasio Varians 'Between Groups' dan 'Within Groups'** sejalan dan serentak pada sekali hentakan algoritma (Omnibus Protection) (Field, 2013).
                                </p>
                            </div>

                            <div className={cn("p-8 rounded-[2rem] border shadow-sm", activeConfig.cardHeader)}>
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-3">
                                    <Focus className="w-5 h-5 opacity-70" /> Post-Hoc: Eksekusinya Setengah Jalan
                                </h4>
                                <p className="text-base opacity-90 leading-relaxed mb-4">
                                    Hasil ANOVA dengan f-value signifikan <b>hanya merincikan bahwa PASTI ADA satu pasangan (minimum) yang nilainya bertolak-belakang / kontras signifikan secara Mean</b>. Sayangnya, Omnibus Test tidak mendikte <i>di kelompok spesifik merk mana yang menjadi pemicunya.</i>
                                </p>
                                <p className="text-sm opacity-80 leading-relaxed bg-black/5 dark:bg-white/5 p-4 rounded-xl">Oleh karena itu langkah derivatifnya, peneliti akademis menggunakan ekstensi perlakuan <b>Post Hoc Multiple Comparisons (Tukey, Bonferroni, Tamhane, LSD)</b> guna "meyidang paksa" satu demi satu pelaku tanpa menginflasi skor alpha awalnya.</p>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            category: "Analisis Non-Parametrik Independen",
            items: [
                {
                    id: 'mann-whitney',
                    title: "Uji Mann-Whitney U",
                    icon: <Scale className="w-6 h-6" />,
                    duration: "6 mnt",
                    category: "Komparasi Non-Parametrik",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Alternatif Kesalahan Distribusi</h3>
                                <p>
                                    Siklus krisis riset acap kali melanda sewaktu Uji Asumsi Klasik Anda rontok secara menyebalkan: Distribusi miring, Kurtosis tinggi, Normalitas hancur. Dalam kerangka kerja komparatif dua subjek independen, ketika data rasio tersebut berderai cacat tak terbaca, komparasi digabungkan ulang menjadi mode Rank Orders melalui senjata <b>Uji Mann-Whitney U</b>.
                                </p>
                                <p>
                                    (Metode Ekuator Ekivalen: Ini adalah kloningan Independent T-Test, ditranslasikan dalam alam Median, bukan Mean).
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'wilcoxon',
                    title: "Uji Wilcoxon Signed-Rank",
                    icon: <Link2 className="w-6 h-6" />,
                    duration: "5 mnt",
                    category: "Komparasi Non-Parametrik",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Pengalibrasi Pasangan (Paired) Tak Lazim</h3>
                                <p>
                                    Setali selaras dengan filosofi adaptasi statistika non-parametrik, Wilcxon Signed menjadi pelindung (<i>back-up</i>) apabila eksperimen observasi Pre-Test dan Post-Test (Paired T-Sample) peneliti terserang wabah pencilan Ekstrem (<i>Outlier Outrage</i>) maupun anomali Normalitas yang brutal sehingga melanggar syarat absolut.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'kruskal-wallis',
                    title: "Uji Kruskal-Wallis H",
                    icon: <Layers className="w-6 h-6" />,
                    duration: "8 mnt",
                    category: "Komparasi Non-Parametrik",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>ANOVA untuk Rasio Abnormal</h3>
                                <p>
                                    Analog dari One-Way ANOVA manakala set sampel berasal bukan pada trah parametrik. Kruskal diturunkan untuk mendeteksi varians peringkat di rentang minimum 3 golongan populasi. Data observasional diekstraksi seluruhnya tanpa embel label kelompok, diranking berderet vertikal selayaknya membariskan tentara dari skor mini ke maksi, baru sesudahnya disortir ulang per resimen untuk melacak divergensi median kumulatifnya.
                                </p>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            category: "Asosiasi (Hubungan & Kolerasi)",
            items: [
                {
                    id: 'correlation-analysis',
                    title: "Korelasi Bivariat (Pearson & Rank Spearman)",
                    icon: <GitBranch className="w-6 h-6" />,
                    duration: "8 mnt",
                    category: "Korelasi Hubungan",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Interkonektivitas Linearisitas</h3>
                                <p>
                                    Asosiasi koefisien dirancang tunggal untuk mencaritahu, menaksir mutu, memodelkan *kerekatan* benang-merah relasional. Dalam konteks Pearson Product-Moment—dan non-parametrik padanannya, Spearman's Rho (ρ)—koefisien merating dari kutub mutlak (r = 1.0) hingga kemustahilan sinkron (r = 0.0). Korelasi tidak menunjuk jari "siapa membunuh siapa" maupun "X melahirkan Y" (ketiadaan relasi kausalitas/sebab-akibat deterministik; itu peran sakral Regresi).
                                </p>
                            </div>

                            <div className={cn("p-10 border rounded-[2rem] shadow-sm max-w-3xl mx-auto", activeConfig.cardHeader)}>
                                <h4 className={cn("font-bold mb-6 text-lg uppercase tracking-wider border-b pb-4 text-center", activeConfig.textMain)}>Buku Pedoman Interpretasi Indeks Hubungan (Guilford)</h4>

                                <div className="space-y-3">
                                    <div className={cn("flex justify-between items-center p-4 rounded-xl border bg-white/70 dark:bg-black/30 shadow-sm", activeConfig.divider)}>
                                        <span className="font-mono text-lg font-medium"> ± 0.80 s.d 1.00</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">Sangat Peket/Tinggi</span>
                                    </div>
                                    <div className={cn("flex justify-between items-center p-4 rounded-xl border bg-white/70 dark:bg-black/30 shadow-sm", activeConfig.divider)}>
                                        <span className="font-mono text-lg font-medium"> ± 0.60 s.d 0.79</span>
                                        <span className="text-sky-600 dark:text-sky-400 font-bold uppercase">Relasi Kuat Tinggi</span>
                                    </div>
                                    <div className={cn("flex justify-between items-center p-4 rounded-xl border bg-white/70 dark:bg-black/30 shadow-sm", activeConfig.divider)}>
                                        <span className="font-mono text-lg font-medium"> ± 0.40 s.d 0.59</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-bold uppercase">Agak Tinggi Sedang</span>
                                    </div>
                                    <div className={cn("flex justify-between items-center p-4 rounded-xl border bg-white/70 dark:bg-black/30 shadow-sm opacity-70", activeConfig.divider)}>
                                        <span className="font-mono text-lg font-medium"> ± 0.20 s.d 0.39</span>
                                        <span className="text-slate-500 font-medium uppercase">Relasi Lemah / Rendah</span>
                                    </div>
                                    <div className={cn("flex justify-between items-center p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 shadow-sm opacity-50", activeConfig.divider)}>
                                        <span className="font-mono text-lg font-medium text-slate-500"> ± 0.00 s.d 0.19</span>
                                        <span className="text-slate-400 font-semibold uppercase">Sangat Lemah (Bisa dihiraukan)</span>
                                    </div>
                                </div>
                                <p className="text-sm opacity-70 mt-4 text-center leading-relaxed">Mekanisme relasi minus "-" dan plus "+" sekadar mendikte laju kemudi; apakah selaras bersama-sama naik, atau bertegangan paradoks (satu terpacu naik berbanding lurus komponen lawannya hancur merosot).</p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'chi-square',
                    title: "Uji Kai Kuadrat (Chi-Square) Kategorikal",
                    icon: <PieChart className="w-6 h-6" />,
                    duration: "6 mnt",
                    category: "Asosiasi Non-Metrik",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Cross-Tabulation of Nominal Factors</h3>
                                <p>
                                    Chi-Square (χ²) Independence dimandatir mutlak bilamana matriks komparasi variabel dependen maupun independen sama-sama terjebak dalam kasta hierarki informasi tipe 'Kategorikal' Murni (Level Nominal, atau setara level Ordinal bertingkat kasar).
                                </p>
                            </div>
                            <div className={cn("p-8 rounded-[2rem] border shadow-sm text-center", activeConfig.infoBox)}>
                                <h4 className="font-bold mb-4 text-xl">Ilustrasi Analitis Demografik Crosstab</h4>
                                <p className="text-base opacity-90 leading-relaxed max-w-2xl mx-auto italic mb-6">
                                    "Apakah terdapat deviasi tabiat kecenderungan/keterikatan signifikan dari para konsumen yang disejajarkan menurut (LAKI LAKI vs PEREMPUAN) mengenai opsi polarisasi (BELI ONLINE vs BELI LANGSUNG DI PASAR KONVENSIONAL)?"
                                </p>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            category: "Analisis Kausal Prediktif Konkret",
            items: [
                {
                    id: 'linear-regression',
                    title: "Regresi Linear Tunggal",
                    icon: <TrendingUp className="w-6 h-6" />,
                    duration: "9 mnt",
                    category: "Kausal Fundamental",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Determining the Future Path</h3>
                                <p>
                                    Simple Linear Regression bukan sekadar menelusuri asosiasi korelasi belaka, namun menspesifikasikan nilai definit suatu respons dependen *Y* dikomodiri dari unit independen pencetus *X*.
                                </p>
                                <p>
                                    Uji ini mencari sebuah model persetujuan "Garis Linearisasi Paling Fit (Least-Squares Line)", meredam total sisa kesalahan *error (ε)* agar peneliti leluasa memanen peramalan deterministik layaknya: "Apabila promosi ditambahkan Rp.10.000 (X), niscaya konversi persentase penjualan produk merangkak sejumlah koefisien spesifiknya (Y)".
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'regression-multi',
                    title: "Regresi Linear Berganda & Asumsi Parametrik",
                    icon: <TrendingUp className="w-6 h-6" />,
                    duration: "12 mnt",
                    category: "Prediktif Utama",
                    content: (
                        <div className={cn("space-y-12 text-justify", activeConfig.cardContent)}>
                            <div className="prose prose-lg max-w-none text-inherit leading-relaxed">
                                <h3 className={cn("text-2xl font-bold mb-6", activeConfig.textMain)}>Multiple Linear Regression (MLR)</h3>
                                <p>
                                    Banyak fenomena alam, makroekonomi, maupun perilaku manusia terlalu kompleks untuk dijelaskan hanya dengan korelasi variabel tunggal (Bivariate). Dalam konteks yang lebih mutakhir, Multiple Linear Regression (MLR) digunakan untuk mengevaluasi simultanitas pengaruh antara lebih dari satu variabel independen (X₁, X₂, Xₙ) terhadap sebuah variabel dependen tunggal berskala rasio/interval (Y).
                                </p>
                                <p>
                                    Sependapat dengan Gujarati & Porter (2009), regresi adalah cikal bakal analisis prediktif yang melahirkan estimasi terotomatisasi (Machine Learning). Ia menyediakan wawasan tentang: variabel bebas mana yang berkontribusi paling kuat secara parsial, serta mengetahui kapabilitias representasi model secara utuh melalui koefisien matriks R-Square (R²).
                                </p>
                            </div>

                            <div className={cn("p-12 border rounded-[2.5rem] shadow-sm max-w-4xl mx-auto", activeConfig.cardBase)}>
                                <div className="text-center mb-12">
                                    <div className={cn("inline-block font-mono text-2xl md:text-3xl font-semibold mb-4 bg-black/5 dark:bg-white/5 px-8 py-4 rounded-3xl", activeConfig.textMain)}>
                                        Y = α + β₁X₁ + β₂X₂ + ... + ε
                                    </div>
                                    <p className={cn("text-sm font-medium uppercase tracking-wide mt-4", activeConfig.textMuted)}>Struktur Persamaan Prediktif Formal OLS (Ordinary Least Squares)</p>
                                </div>

                                <h4 className={cn("font-bold mb-8 text-lg uppercase tracking-wider border-b pb-4 mt-12", activeConfig.textMain)}>Fase Validasi Asumsi Klasik Ekstensif</h4>
                                <p className="mb-8 text-base opacity-80 leading-relaxed">Sebelum menafsirkan output Beta (β) maupun Signifikansi t/F rasio, model Anda secara esensial harus bebas dari bias. Syarat absolut untuk menjaga integritas MLR dalam estimasi estimator-nya disebut BLUE (<i>Best Linear Unbiased Estimator</i>).</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>1. Normalitas Residual</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Kesalahan baku (error term) wajib terdistribusi simetris Gaussian, bukan data absolut X maupun Y-nya. Uji validasi dapat ditembus menggunakan visual p-plot atau algoritma Kolmogorov-Smirnov exact statistics.</span>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>2. Multikolinearitas</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Dilarang total eksistensi korelasi linear sempurna berganda antar independennya. Variance Inflation Factor (VIF) batas kelonggarannya harus tidak meroket lebih dari markah &lt; 10.</span>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>3. Heteroskedastisitas</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Menguji pergelangan stabilitas varians. Plot skatter residual standar *zpred* vs *sresid* dituntut berbentuk rimbunan konstelasi bintang acak. Tidak diizinkan membuat alur simpul corong, garis tebal terpusat, atau alunan spiral ombak.</span>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-6 rounded-2xl border shadow-sm">
                                        <b className={cn("block mb-3 text-lg font-semibold", activeConfig.textMain)}>4. Autokorelasi Residual</b>
                                        <span className="opacity-80 leading-relaxed block text-sm">Dilacak via komputasi koefisien mutlak Durbin-Watson statistic (dW). Memeriksa ada tidaknya infeksi korelasi berantai sisaan waktu (hanya dominan menggerogoti stabilitas Time-Series data harian/tahunan bursa keuangan historik).</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn("space-y-6 mt-16 p-10 rounded-[2rem] border shadow-sm", activeConfig.infoBox)}>
                                <h3 className={cn("font-semibold text-xl border-b pb-4 mb-6 border-current opacity-50")}>Tiga Tumpuan Hipotesis & Output Pelaporan</h3>
                                <ul className="space-y-6 text-base opacity-90 leading-relaxed">
                                    <li><b>A. Goodness of Fit F-Test (Kelayakan):</b> Menjamin bahwa perpaduan keseluruhan variabel bebas X₁ sampai dengan variabel penutup Xₙ, dengan irama kolaborasi harmonis dapat memicu regresi ke variabel Y dan bukan murni random probabilitas alam. (Sig. Anova F-ratio &lt; 0.05 mutlak terpenuhi).</li>
                                    <li><b>B. Analisis Bebas Parsial t-Test:</b> Pemilahan bedah pisau variabel. Menentukan nasib signifikansi setiap anak variabel X secara terisolasi seberapa tajam efektivitas deterministik per satuannya kala mendikte sang Y.</li>
                                    <li><b>C. Proporsi Ketepatan (Koefisien R² & Adj R):</b> Persentase determinasi varians. Jika R² meraih skor estimasi representasi `.745` ; berarti 74.5% dari seluruh gejala fluktuasi/dinamika Y memang telah dikendalikan dan mampu ditafsir utuh mutlak memalui desain variabel di riset jurnal skripsi ilmuwan Anda saat ini. (Persen residu lepas dihiraukan menjadi efek perantara eksternal).</li>
                                </ul>
                            </div>

                            <div className={cn("mt-16 pt-8 border-t", activeConfig.divider, activeConfig.textMuted)}>
                                <h5 className={cn("font-semibold text-sm flex items-center gap-2 mb-4 tracking-wide uppercase", activeConfig.textMain)}>
                                    <Quote className="w-4 h-4 opacity-70" /> Referensial Literatur (Citation Framework)
                                </h5>
                                <ul className="space-y-3 opacity-80 text-sm">
                                    <li>Gujarati, D. N., & Porter, D. C. (2009). <i>Basic Econometrics</i> (5th ed.). McGraw-Hill Education.</li>
                                    <li>Montgomery, D. C., Peck, E. A., & Vining, G. G. (2021). <i>Introduction to Linear Regression Analysis</i> (6th ed.). John Wiley & Sons.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
            ]
        }
    ]

    const filteredGuides = searchQuery
        ? guides.map(g => ({
            ...g,
            items: g.items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
        })).filter(g => g.items.length > 0)
        : guides

    if (selectedGuide) {
        return (
            <div className="h-full w-full flex flex-col relative bg-transparent overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                <div className={cn("sticky top-0 z-50 p-4 md:px-8 xl:px-12 border-b flex flex-wrap gap-4 items-center justify-between", activeConfig.toolbar)}>
                    <button
                        onClick={() => setSelectedGuide(null)}
                        className={cn("flex items-center gap-3 text-sm font-medium transition-colors py-2 px-4 rounded-xl", activeConfig.btnSecondary)}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali ke Repositori</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <button className={cn("text-xs font-medium flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-sm", activeConfig.btnPrimary)}>
                            Tandai Telah Dibaca
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full px-4 md:px-8 xl:px-12 py-10 flex flex-col items-center">
                    <div className={cn("w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-sm border mb-24", activeConfig.cardBase)}>

                        <div className="pt-16 pb-12 px-8 md:px-14 lg:px-20 border-b flex flex-col justify-end" style={{ borderColor: 'inherit' }}>
                            <div className="relative z-10 w-full">
                                <span className={cn("inline-block px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider mb-6 border uppercase", activeConfig.badge)}>
                                    {selectedGuide.category}
                                </span>
                                <h1 className={cn("text-3xl md:text-5xl font-bold tracking-tight leading-[1.2]", activeConfig.textMain)}>
                                    {selectedGuide.title}
                                </h1>
                                <div className={cn("flex flex-wrap items-center gap-4 mt-8 text-sm", activeConfig.textMuted)}>
                                    <span className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-transparent px-3 py-1.5 rounded-lg"><BookOpen className="w-4 h-4" /> Referensi Akademik</span>
                                    <span className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-transparent px-3 py-1.5 rounded-lg"><Activity className="w-4 h-4" /> Estimasi Baca {selectedGuide.duration}</span>
                                </div>
                            </div>
                        </div>

                        <div className={cn("p-8 md:p-14 lg:p-20", activeConfig.cardContent)}>
                            {selectedGuide.content}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full flex flex-col relative bg-transparent pb-24 overflow-y-auto custom-scrollbar">
            <div className="px-4 md:px-8 xl:px-12 pt-8 sticky top-0 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className={cn("px-6 py-5 rounded-[1.5rem] flex flex-col xl:flex-row items-center justify-between gap-6 w-full shadow-sm", activeConfig.toolbar)}>
                    <div className="flex items-center gap-5 w-full xl:w-auto">
                        <div className={cn("w-12 h-12 rounded-[1rem] flex items-center justify-center border shadow-sm", activeConfig.accentIcon, "border-transparent")}>
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className={cn("text-xl md:text-2xl font-bold tracking-tight", activeConfig.textMain)}>
                                Repositori Literatur Akademik
                            </h2>
                            <p className={cn("text-xs font-medium uppercase tracking-wider mt-1", activeConfig.textMuted)}>Materi Referensi Pengolahan Data Skripsi</p>
                        </div>
                    </div>

                    <div className="relative group w-full xl:w-auto">
                        <Search className={cn("w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300", activeConfig.textMuted, "group-focus-within:" + activeConfig.textMain.split(" ")[0])} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari materi pembelajaran..."
                            className={cn("h-12 pl-12 pr-6 rounded-[1rem] text-sm outline-none w-full xl:w-[400px] transition-all duration-300", activeConfig.searchInput)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full px-4 md:px-8 xl:px-12 mt-10 z-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {!searchQuery && (
                        <div className={cn("col-span-1 md:col-span-2 lg:col-span-3 rounded-[2rem] p-8 md:p-12 lg:p-16 relative overflow-hidden group shadow-sm border", activeConfig.cardBase)}>
                            <div className="relative z-10 max-w-3xl">
                                <span className={cn("inline-block px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider mb-5 border uppercase", activeConfig.badge)}>
                                    Eksplorasi Konsep Fundamental
                                </span>
                                <h3 className={cn("text-3xl md:text-5xl font-bold mb-5 tracking-tight leading-tight", activeConfig.textMain)}>Pusat Keilmuan Uji Statistik</h3>
                                <p className={cn("text-base md:text-lg leading-relaxed opacity-80", activeConfig.textMuted)}>
                                    Data bukan sekadar sekumpulan skor mentah, melainkan fenomena yang harus dibuktikan instrumen ilmiahnya. Eksplorasi literatur <b>14+ metodologi pengolahan data terlengkap</b> untuk menunjang fondasi argumen dan pengerjaan skripsi Anda.
                                </p>
                            </div>
                        </div>
                    )}

                    {filteredGuides.map((section, idx) => (
                        <div key={idx} className="col-span-1 md:col-span-2 lg:col-span-3 space-y-6 mt-8">
                            <h4 className={cn("text-sm font-semibold uppercase tracking-wider flex items-center gap-4", activeConfig.textMain)}>
                                {section.category}
                                <div className={cn("h-[1px] flex-1 opacity-20 bg-current")} />
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedGuide(item)}
                                        className={cn("p-8 rounded-[1.5rem] flex flex-col justify-between gap-8 cursor-pointer group shadow-sm border transition-all duration-300", activeConfig.cardBase)}
                                        style={{ minHeight: '240px' }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105", activeConfig.cardHeader, activeConfig.textMain)}>
                                                {item.icon}
                                            </div>
                                            <div className={cn("p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0", activeConfig.infoBox)}>
                                                <ArrowLeft className="w-5 h-5 rotate-180" strokeWidth={2.5} />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <h5 className={cn("font-bold text-xl mb-3 leading-snug", activeConfig.textMain)} title={item.title}>
                                                {item.title}
                                            </h5>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("text-xs font-medium px-3 py-1.5 rounded-lg", activeConfig.badge)}>
                                                    Durasi: {item.duration}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}