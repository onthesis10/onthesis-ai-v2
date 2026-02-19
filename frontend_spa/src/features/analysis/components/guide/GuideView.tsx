import { BookOpen, Search, ArrowLeft, CheckCircle2, Sigma, BarChart2, TrendingUp, PieChart, GitCompare, Activity, Layers, Scale, GraduationCap, Quote } from 'lucide-react'
import { useState } from 'react'

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

    const guides: { category: string, items: GuideItem[] }[] = [
        {
            category: "Fundamen Statistika & Preparasi Data",
            items: [
                {
                    id: 'normality',
                    title: "Uji Normalitas (Normality Test)",
                    icon: <Activity className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Fundamen Statistika",
                    content: (
                        <div className="space-y-6 text-justify">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="leading-relaxed">
                                    Uji Normalitas adalah prasyarat fundamental dalam analisis statistik parametrik. Tujuannya adalah untuk menilai apakah data terdistribusi secara normal (mengikuti kurva lonceng Gaussian). Asumsi normalitas sangat krusial karena validitas uji parametrik (seperti Uji-t dan ANOVA) bergantung pada parameter populasi yang terdistribusi normal.
                                </p>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl">
                                <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" /> Signifikansi Akademik
                                </h4>
                                <ul className="list-disc list-inside text-sm text-foreground/80 space-y-2 leading-relaxed">
                                    <li><b>Distribusi Normal:</b> Mengindikasikan bahwa data sampel merepresentasikan populasi secara akurat tanpa bias ekstrem.</li>
                                    <li><b>Implikasi Pelanggaran:</b> Jika asumsi ini dilanggar, hasil uji parametrik menjadi bias dan tidak dapat diandalkan (Type I Error rate meningkat).</li>
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Metode Pengujian</h3>
                                <div className="grid gap-4">
                                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                                        <div className="font-bold text-foreground mb-1">Shapiro-Wilk (W)</div>
                                        <p className="text-sm text-muted-foreground">
                                            Direkomendasikan untuk ukuran sampel kecil hingga sedang (<b>n &lt; 50</b>). Uji ini memiliki kekuatan statistik (power) yang tinggi untuk mendeteksi penyimpangan dari normalitas.
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                                        <div className="font-bold text-foreground mb-1">Kolmogorov-Smirnov (K-S)</div>
                                        <p className="text-sm text-muted-foreground">
                                            Lebih sesuai untuk sampel besar (<b>n &gt; 50</b>). Sering digunakan dengan koreksi Lilliefors untuk akurasi yang lebih baik.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Ghasemi, A., & Zahediasl, S. (2012). Normality tests for statistical analysis: a guide for non-statisticians. <i>International Journal of Endocrinology and Metabolism</i>, 10(2), 486.</li>
                                    <li>Field, A. (2018). <i>Discovering Statistics Using IBM SPSS Statistics</i>. SAGE Publications.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'reliability',
                    title: "Uji Reliabilitas (Reliability)",
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    duration: "4 mnt",
                    category: "Fundamen Statistika",
                    content: (
                        <div className="space-y-6 text-justify">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="leading-relaxed">
                                    Validitas dan reliabilitas adalah dua pilar utama kualitas instrumen penelitian. Uji Reliabilitas mengukur sejauh mana instrumen pengukuran (seperti kuesioner) menghasilkan hasil yang konsisten (stabil) apabila dilakukan pengukuran berulang pada subjek yang sama.
                                </p>
                            </div>

                            <div className="glass-panel p-5 rounded-xl border-l-4 border-l-primary">
                                <h3 className="font-bold flex items-center gap-2 mb-3 text-primary text-lg">
                                    <Sigma className="w-5 h-5" /> Cronbach's Alpha (α)
                                </h3>
                                <p className="text-sm mb-4 leading-relaxed text-foreground/80">
                                    Koefisien reliabilitas yang paling umum digunakan untuk mengukur konsistensi internal. Nilai Alpha berkisar antara 0 hingga 1.
                                </p>
                                <div className="space-y-3 text-sm bg-background/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                        <span className="font-mono text-xs">α ≥ 0.90</span>
                                        <span className="text-green-600 dark:text-green-400 font-bold">Istimewa (Excellent)</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                        <span className="font-mono text-xs">0.80 ≤ α &lt; 0.90 </span>
                                        <span className="text-green-500 font-bold">Baik (Good)</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                        <span className="font-mono text-xs">0.70 ≤ α &lt; 0.80</span>
                                        <span className="text-yellow-600 dark:text-yellow-400 font-bold">Dapat Diterima (Acceptable)</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-1">
                                        <span className="font-mono text-xs">α &lt; 0.60</span>
                                        <span className="text-red-500 font-bold">Tidak Reliabel (Poor)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Taber, K. S. (2018). The use of Cronbach’s alpha when developing and reporting research instruments in science education. <i>Research in Science Education</i>, 48, 1273-1296.</li>
                                    <li>Hair, J. F., et al. (2019). <i>Multivariate Data Analysis</i> (8th ed.). Cengage Learning.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'descriptive',
                    title: "Statistik Deskriptif",
                    icon: <BarChart2 className="w-4 h-4" />,
                    duration: "3 mnt",
                    category: "Fundamen Statistika",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Statistik deskriptif berfungsi untuk mendeskripsikan atau memberikan gambaran terhadap objek yang diteliti melalui data sampel atau populasi sebagaimana adanya, tanpa melakukan analisis dan membuat kesimpulan yang berlaku untuk umum.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-secondary/20 rounded-xl border border-border/50">
                                    <div className="text-primary font-bold mb-1">Central Tendency</div>
                                    <p className="text-xs text-muted-foreground mb-2">Ukuran pemusatan data.</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        <li><b>Mean:</b> Rata-rata aritmatika.</li>
                                        <li><b>Median:</b> Nilai tengah data urut.</li>
                                        <li><b>Mode:</b> Nilai frekuensi tertinggi.</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-xl border border-border/50">
                                    <div className="text-primary font-bold mb-1">Dispersion</div>
                                    <p className="text-xs text-muted-foreground mb-2">Ukuran penyebaran data.</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        <li><b>Variance:</b> Variasi data.</li>
                                        <li><b>Std. Dev:</b> Akar kuadrat varians.</li>
                                        <li><b>Range:</b> Selisih Max - Min.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )
                },
            ]
        },
        {
            category: "Analisis Komparatif (Parametrik)",
            items: [
                {
                    id: 'ttest-ind',
                    title: "Independent Sample T-Test",
                    icon: <GitCompare className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Komparatif Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="leading-relaxed">
                                    Independent Sample T-Test digunakan untuk membandingkan rata-rata (mean) dari dua kelompok sampel yang saling bebas (tidak berpasangan). Uji ini bertujuan untuk mengetahui apakah terdapat perbedaan yang signifikan secara statistik antara dua kelompok tersebut.
                                </p>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl">
                                <h4 className="font-bold text-primary mb-3 text-sm uppercase tracking-wide">Asumsi Statistik (Prasyarat)</h4>
                                <ul className="space-y-2 text-sm text-foreground/80">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span><b>Normalitas:</b> Data pada kedua kelompok harus berdistribusi normal.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span><b>Homogenitas:</b> Varians antar kelompok harus homogen (Levene's Test &gt; 0.05).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span><b>Independensi:</b> Observasi harus independen satu sama lain.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Student (Gossset, W.S.) (1908). The probable error of a mean. <i>Biometrika</i>, 6(1), 1-25.</li>
                                    <li>Pallant, J. (2020). <i>SPSS Survival Manual</i>. McGraw-Hill Education.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'ttest-paired',
                    title: "Paired Sample T-Test",
                    icon: <GitCompare className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Komparatif Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="leading-relaxed">
                                    Paired Sample T-Test (Uji-t sampel berpasangan) digunakan untuk membandingkan rata-rata dua variabel untuk satu grup sampel tunggal. Uji ini sering digunakan dalam desain penelitian <i>Repeated Measures</i> atau <i>Pre-test Post-test</i>.
                                </p>
                            </div>
                            <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 italic text-sm text-muted-foreground text-center">
                                "Apakah terdapat perbedaan signifikan pada kinerja mahasiswa sebelum dan sesudah pelatihan intensif?"
                            </div>
                        </div>
                    )
                },
                {
                    id: 'anova-one',
                    title: "One-Way ANOVA",
                    icon: <Layers className="w-4 h-4" />,
                    duration: "6 mnt",
                    category: "Komparatif Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Analysis of Variance (ANOVA) satu jalur digunakan untuk menguji perbedaan rata-rata antara tiga kelompok atau lebih yang independen.
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm mb-2">Mengapa tidak menggunakan Uji-T berulang?</h4>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                                    Melakukan beberapa Uji-T (multiple comparison) secara terpisah akan meningkatkan risiko terjadinya <b>Type I Error</b> (Alpha Inflation). ANOVA mengontrol tingkat kesalahan ini dengan melakukan pengujian simultan (Omnibus Test).
                                </p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Fisher, R. A. (1925). <i>Statistical Methods for Research Workers</i>. Oliver and Boyd.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
            ]
        },
        {
            category: "Analisis Komparatif (Non-Parametrik)",
            items: [
                {
                    id: 'mann-whitney',
                    title: "Uji Mann-Whitney U",
                    icon: <Scale className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Komparatif Non-Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Alternatif non-parametrik untuk Independent Sample T-Test. Digunakan ketika data tidak memenuhi asumsi normalitas.
                            </p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p>
                                    Uji ini tidak membandingkan rata-rata (mean), melainkan membandingkan <b>Rank Sum</b> (jumlah peringkat) atau median antar kelompok. Hipotesis nol menyatakan bahwa kedua populasi identik.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'wilcoxon',
                    title: "Uji Wilcoxon Signed-Rank",
                    icon: <Scale className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Komparatif Non-Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Alternatif non-parametrik untuk Paired Sample T-Test.
                            </p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p>
                                    Uji ini digunakan untuk menganalisis perbedaan antara dua pengamatan berpasangan ketika data berskala ordinal atau interval tetapi tidak berdistribusi normal. Uji ini melihat tanda (positif/negatif) dan besarnya perbedaan antar pasangan.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'kruskal',
                    title: "Uji Kruskal-Wallis H",
                    icon: <Layers className="w-4 h-4" />,
                    duration: "6 mnt",
                    category: "Komparatif Non-Parametrik",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Perluasan dari Mann-Whitney U untuk lebih dari dua kelompok (alternatif One-Way ANOVA).
                            </p>
                            <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                                <h4 className="font-bold mb-2 text-sm">Prinsip Kerja</h4>
                                <p className="text-sm text-foreground/80">
                                    Data dari semua kelompok digabungkan dan diberi peringkat dari terkecil hingga terbesar. Kemudian, jumlah peringkat untuk setiap kelompok dibandingkan untuk melihat apakah berasal dari distribusi yang sama.
                                </p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Kruskal, W. H., & Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. <i>Journal of the American Statistical Association</i>.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
            ]
        },
        {
            category: "Analisis Asosiatif & Prediktif",
            items: [
                {
                    id: 'pearson',
                    title: "Korelasi Pearson (Product Moment)",
                    icon: <TrendingUp className="w-4 h-4" />,
                    duration: "4 mnt",
                    category: "Asosiatif",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Uji statistik parametrik untuk mengukur kekuatan dan arah hubungan linier antara dua variabel berskala interval atau rasio.
                            </p>
                            <div className="grid grid-cols-1 gap-2 text-sm bg-secondary/20 p-4 rounded-xl border border-border/50">
                                <div className="font-bold text-center mb-2 border-b border-border/50 pb-2">Interpretasi Nilai Koefisien (r)</div>
                                <div className="flex justify-between">
                                    <span>0.00 - 0.19</span>
                                    <span className="text-muted-foreground">Sangat Lemah</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>0.20 - 0.39</span>
                                    <span className="text-muted-foreground">Lemah</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>0.40 - 0.59</span>
                                    <span className="text-primary font-medium">Sedang</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>0.60 - 0.79</span>
                                    <span className="text-primary font-bold">Kuat</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>0.80 - 1.00</span>
                                    <span className="text-green-600 font-bold">Sangat Kuat</span>
                                </div>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'spearman',
                    title: "Korelasi Rank Spearman",
                    icon: <TrendingUp className="w-4 h-4" />,
                    duration: "4 mnt",
                    category: "Asosiatif",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Metode non-parametrik untuk mengukur hubungan monotonik antara dua variabel (biasanya berskala ordinal atau data interval yang tidak normal).
                            </p>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p>
                                    Berbeda dengan Pearson yang mensyaratkan hubungan linier, Spearman bekerja berdasarkan peringkat data. Ini membuatnya tahan (robust) terhadap outliers (data pencilan).
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'chi-square',
                    title: "Uji Chi-Square (Kai Kuadrat)",
                    icon: <PieChart className="w-4 h-4" />,
                    duration: "5 mnt",
                    category: "Asosiatif",
                    content: (
                        <div className="space-y-6 text-justify">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="leading-relaxed">
                                    Uji Chi-Square of Independence digunakan untuk menentukan apakah terdapat hubungan yang signifikan antara dua variabel kategorikal (Nominal/Ordinal). Uji ini membandingkan frekuensi yang diamati (<i>observed</i>) dengan frekuensi yang diharapkan (<i>expected</i>) jika kedua variabel tidak saling berhubungan.
                                </p>
                            </div>
                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                                <h4 className="font-bold text-primary mb-2 text-sm">Contoh Penelitian</h4>
                                <p className="text-sm text-foreground/80">
                                    "Hubungan antara Status Pekerjaan (Bekerja/Tidak Bekerja) dengan Tingkat Kecemasan (Rendah/Sedang/Tinggi)."
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'regression-simple',
                    title: "Regresi Linear Sederhana",
                    icon: <TrendingUp className="w-4 h-4" />,
                    duration: "6 mnt",
                    category: "Prediktif",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Analisis untuk memodelkan hubungan kausal (sebab-akibat) antara satu variabel independen (X) dan satu variabel dependen (Y).
                            </p>
                            <div className="p-5 bg-background border border-border/50 rounded-xl shadow-sm text-center">
                                <div className="font-mono text-lg font-bold text-primary mb-2">Y = a + bX + e</div>
                                <div className="grid grid-cols-2 text-left text-xs text-muted-foreground gap-y-1 max-w-xs mx-auto">
                                    <span><b>Y</b> : Variabel Dependen</span>
                                    <span><b>X</b> : Variabel Independen</span>
                                    <span><b>a</b> : Konstanta (Intercept)</span>
                                    <span><b>b</b> : Koefisien Regresi</span>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
                                <h5 className="font-bold flex items-center gap-2 mb-2 text-foreground/70"><Quote className="w-3 h-3" /> Referensi Akademik</h5>
                                <ul className="space-y-1 italic">
                                    <li>Kutner, M. H., et al. (2004). <i>Applied Linear Regression Models</i>. McGraw-Hill Irwin.</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    id: 'regression-multi',
                    title: "Regresi Linear Berganda",
                    icon: <TrendingUp className="w-4 h-4" />,
                    duration: "8 mnt",
                    category: "Prediktif",
                    content: (
                        <div className="space-y-6 text-justify">
                            <p className="lead text-lg text-muted-foreground">
                                Pengembangan dari regresi sederhana yang melibatkan dua atau lebih variabel independen untuk memprediksi satu variabel dependen.
                            </p>
                            <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl">
                                <h4 className="font-bold text-primary mb-3 text-sm uppercase tracking-wide">Uji Asumsi Klasik</h4>
                                <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                                    <li><b>Normalitas Residual:</b> Error berdistribusi normal.</li>
                                    <li><b>Multikolinearitas:</b> Tidak ada korelasi kuat antar variabel bebas (VIF &lt; 10).</li>
                                    <li><b>Heteroskedastisitas:</b> Varians residual konstan.</li>
                                    <li><b>Autokorelasi:</b> Tidak ada korelasi antar residual (hanya untuk data time series).</li>
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
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto w-full relative">
                <div className="flex-none p-4 pb-2 border-b border-border/10">
                    <button
                        onClick={() => setSelectedGuide(null)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Kembali ke Panduan
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-border/50 bg-white/60 dark:bg-black/40">
                        <div className="h-40 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-b border-border/50 flex items-end p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            <div className="relative z-10 sticky w-full">
                                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide mb-3 border border-primary/20 uppercase shadow-sm">
                                    {selectedGuide.category}
                                </span>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">{selectedGuide.title}</h1>
                                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary/70" /> Referensi Akademik</span>
                                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary/70" /> {selectedGuide.duration} baca</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 lg:p-12">
                            {selectedGuide.content}
                        </div>

                        <div className="p-6 border-t border-border/50 bg-secondary/20 flex justify-between items-center">
                            <button
                                onClick={() => setSelectedGuide(null)}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Kembali
                            </button>
                            <button className="ml-auto text-sm font-medium text-primary hover:opacity-80 flex items-center gap-2 bg-primary/10 px-5 py-2.5 rounded-full hover:bg-primary/20 transition-all shadow-sm border border-primary/10">
                                Tandai Selesai <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto w-full">
            {/* Header Toolbar */}
            <div className="glass-panel p-3 rounded-2xl flex items-center justify-between shrink-0 mx-1 mt-2">
                <div className="flex items-center gap-4 px-2">
                    {/* Window Controls Aesthetic */}
                    <div className="flex gap-1.5 mr-2 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>

                    <div className="h-6 w-px bg-border/50 mx-2" />

                    <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight text-foreground/80">
                        <div className="p-1.5 bg-blue-600/10 rounded-lg">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        Panduan Akademik
                    </h2>
                    <span className="text-xs font-bold text-muted-foreground px-2 py-0.5 bg-secondary/50 rounded-md border border-border/50 uppercase tracking-wider">
                        Dokumentasi Statistik
                    </span>
                </div>

                <div className="relative group">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari analisis..."
                        className="h-9 pl-9 pr-4 bg-white/50 dark:bg-black/20 border border-border/50 rounded-lg text-sm focus:ring-1 focus:ring-primary/50 outline-none w-64 transition-all"
                    />
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Welcome Card */}
                    {!searchQuery && (
                        <div className="md:col-span-2 glass-card rounded-2xl p-8 relative overflow-hidden group border border-blue-500/10">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000" />
                            <div className="relative z-10 max-w-3xl">
                                <h3 className="text-3xl font-bold mb-4 tracking-tight text-foreground">Pusat Referensi Statistik</h3>
                                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                                    Akses panduan komprehensif untuk analisis data skripsi dan tesis Anda. Mulai dari uji asumsi dasar hingga pemodelan regresi kompleks, dijelaskan dengan standar akademik.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Categories */}
                    {filteredGuides.map((section, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-3">
                                {section.category}
                                <div className="h-px flex-1 bg-border/40" />
                            </h4>
                            <div className="space-y-3">
                                {section.items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedGuide(item)}
                                        className="glass-card p-5 rounded-xl flex items-center gap-5 hover:border-primary/40 cursor-pointer group transition-all hover:shadow-lg hover:scale-[1.005] bg-gradient-to-b from-white/40 to-white/10 dark:from-white/5 dark:to-transparent"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm border border-border/50">
                                            {item.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{item.title}</h5>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border/50">{item.duration} baca</span>
                                            </div>
                                        </div>
                                        <ArrowLeft className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors rotate-180" />
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
