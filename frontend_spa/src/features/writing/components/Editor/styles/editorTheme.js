// FILE: src/components/Editor/styles/editorTheme.js

export const editorTheme = {
  // --- BASE ---
  ltr: 'text-left',
  rtl: 'text-right',
  paragraph: 'mb-3 text-[15px] leading-[1.8] text-gray-800 dark:text-gray-200 font-serif', // Spasi 1.8 (Standar Skripsi)

  // --- HEADINGS ---
  heading: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white mb-4 mt-8 border-b border-gray-200 dark:border-white/10 pb-2 capitalize',
    h2: 'text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 mt-6',
    h3: 'text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2 mt-4',
    h4: 'text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2 mt-3',
    h5: 'text-base font-bold text-gray-500 dark:text-gray-400 mb-1 mt-2',
  },

  // --- TEXT FORMATTING ---
  text: {
    bold: 'font-bold text-gray-900 dark:text-white',
    italic: 'italic',
    underline: 'underline decoration-gray-400 underline-offset-4', // Offset biar gak nempel huruf g/y/j
    strikethrough: 'line-through text-gray-400 opacity-80',
    underlineStrikethrough: 'underline line-through',
    subscript: 'align-sub text-[0.8em]',
    superscript: 'align-super text-[0.8em]',
    code: 'bg-gray-100 dark:bg-white/10 font-mono text-[0.9em] px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400',
  },

  // --- LISTS ---
  list: {
    ul: 'list-disc list-outside mb-4 ml-6 space-y-1', // Jarak antar item diberi spasi sedikit
    ol: 'list-decimal list-outside mb-4 ml-6 space-y-1',
    listitem: 'pl-1',
    nested: {
      listitem: 'list-none', // Safety nesting
    },
    checklist: 'list-none ml-2',
  },

  // --- QUOTE (Kutipan Langsung) ---
  quote: 'border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4 bg-gray-50 dark:bg-white/5 py-3 rounded-r-lg shadow-sm',

  // --- CODE BLOCK ---
  code: 'bg-[#1E1E1E] text-gray-200 block p-4 rounded-lg font-mono text-sm overflow-x-auto my-4 shadow-inner border border-gray-700',
  codeHighlight: {
    atrule: 'text-[#C792EA]',
    attr: 'text-[#FFCB6B]',
    boolean: 'text-[#FF5370]',
    bottom: 'text-[#82AAFF]',
    comment: 'text-[#546E7A] italic',
    constant: 'text-[#F78C6C]',
    control: 'text-[#89DDFF]',
    function: 'text-[#82AAFF]',
    keyword: 'text-[#C792EA]',
    operator: 'text-[#89DDFF]',
    property: 'text-[#80CBC4]',
    punctuation: 'text-[#89DDFF]',
    string: 'text-[#C3E88D]',
    variable: 'text-[#f07178]',
  },

  // --- LINKS ---
  link: 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition-colors',

  // --- IMAGES (Custom Node) ---
  image: 'block max-w-full h-auto rounded-lg shadow-md my-4 border border-gray-200 dark:border-white/10 mx-auto', 

  // --- TABLES (Native Lexical Table) ---
  table: 'border-collapse border border-gray-300 dark:border-gray-700 w-full my-4 text-sm',
  tableCell: 'border border-gray-300 dark:border-gray-700 px-4 py-2 min-w-[50px] align-top',
  tableCellHeader: 'bg-gray-100 dark:bg-gray-800 font-bold text-gray-900 dark:text-white text-left',
  tableRow: 'hover:bg-gray-50 dark:hover:bg-white/5 transition-colors',

  // --- SEPARATOR (HR) ---
  hr: 'my-8 border-t-2 border-gray-200 dark:border-white/10 border-dashed',

  // --- CUSTOM NODES (OnThesis Specific) ---
  
  // 1. Citation Node (Chip Sitasi)
  citation: 'inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 rounded cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800 text-[0.9em]',
  
  // 2. Review/Comment Node (Highlight)
  review: 'bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-gray-100 px-0.5 rounded cursor-comment border-b-2 border-yellow-400',

  // 3. Bibliography Node (Hanging Indent) [PENTING]
  // Pastikan class .hanging-indent ada di src/index.css
  bibliography: 'hanging-indent', 
};