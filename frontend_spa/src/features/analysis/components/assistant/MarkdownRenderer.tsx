import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy, Code2 } from 'lucide-react'

// --- Copy Button for Code Blocks ---
const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200
                text-slate-400 hover:text-slate-200 hover:bg-white/10 active:scale-95"
            title="Copy code"
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                </>
            )}
        </button>
    )
}

// --- Main MarkdownRenderer ---
interface MarkdownRendererProps {
    content: string
    className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    return (
        <div className={`markdown-body ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    // --- Code Blocks & Inline Code ---
                    code({ node, className: codeClassName, children, ...props }) {
                        const match = /language-(\w+)/.exec(codeClassName || '')
                        const codeString = String(children).replace(/\n$/, '')
                        const isInline = !match && !codeString.includes('\n')

                        if (isInline) {
                            return (
                                <code
                                    className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400
                                        text-[13px] font-mono rounded-md border border-sky-100 dark:border-sky-500/20"
                                    {...props}
                                >
                                    {children}
                                </code>
                            )
                        }

                        const language = match ? match[1] : 'text'

                        return (
                            <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm group/code">
                                {/* Header Bar */}
                                <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="w-3.5 h-3.5 text-sky-400" />
                                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                                            {language}
                                        </span>
                                    </div>
                                    <CopyButton text={codeString} />
                                </div>
                                {/* Code Body */}
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={language}
                                    PreTag="div"
                                    customStyle={{
                                        margin: 0,
                                        borderRadius: 0,
                                        padding: '16px 20px',
                                        fontSize: '13px',
                                        lineHeight: '1.6',
                                        background: '#0F172A', // Slate 900 to match Ocean Dark
                                    }}
                                    showLineNumbers={codeString.split('\n').length > 5}
                                    lineNumberStyle={{
                                        color: '#475569', // Slate 500
                                        fontSize: '11px',
                                        paddingRight: '16px',
                                        minWidth: '2.5em',
                                    }}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        )
                    },

                    // --- Tables ---
                    table({ children }) {
                        return (
                            <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <table className="w-full text-sm border-collapse">
                                    {children}
                                </table>
                            </div>
                        )
                    },
                    thead({ children }) {
                        return (
                            <thead className="bg-slate-50 dark:bg-white/5 text-left">
                                {children}
                            </thead>
                        )
                    },
                    th({ children }) {
                        return (
                            <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
                                {children}
                            </th>
                        )
                    },
                    td({ children }) {
                        return (
                            <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5">
                                {children}
                            </td>
                        )
                    },
                    tr({ children }) {
                        return (
                            <tr className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                {children}
                            </tr>
                        )
                    },

                    // --- Headings ---
                    h1({ children }) {
                        return <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-white/10">{children}</h1>
                    },
                    h2({ children }) {
                        return <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2">{children}</h2>
                    },
                    h3({ children }) {
                        return <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-4 mb-2">{children}</h3>
                    },
                    h4({ children }) {
                        return <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1">{children}</h4>
                    },

                    // --- Paragraphs ---
                    p({ children }) {
                        return <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-300 mb-3 last:mb-0">{children}</p>
                    },

                    // --- Lists ---
                    ul({ children }) {
                        return <ul className="my-2 ml-1 space-y-1.5 list-none">{children}</ul>
                    },
                    ol({ children }) {
                        return <ol className="my-2 ml-1 space-y-1.5 list-none counter-reset-item">{children}</ol>
                    },
                    li({ children, node }) {
                        const parentTag = (node as any)?.parentNode?.tagName
                        const ordered = parentTag === 'ol'

                        return (
                            <li className="flex gap-2.5 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
                                <span className="mt-[2px] shrink-0 text-sky-500 dark:text-sky-400 font-bold">
                                    {ordered ? '' : '•'}
                                </span>
                                <div className="flex-1 [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</div>
                            </li>
                        )
                    },

                    // --- Blockquotes ---
                    blockquote({ children }) {
                        return (
                            <blockquote className="my-4 pl-4 border-l-[3px] border-sky-400 dark:border-sky-500 bg-sky-50/50 dark:bg-sky-500/5 py-2 pr-4 rounded-r-lg italic text-slate-600 dark:text-slate-400 [&>p]:mb-0">
                                {children}
                            </blockquote>
                        )
                    },

                    // --- Strong / Bold ---
                    strong({ children }) {
                        return <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
                    },

                    // --- Emphasis / Italic ---
                    em({ children }) {
                        return <em className="italic text-slate-600 dark:text-slate-400">{children}</em>
                    },

                    // --- Links ---
                    a({ children, href }) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 dark:text-sky-400 hover:text-sky-500 underline underline-offset-2 decoration-sky-300 dark:decoration-sky-600 transition-colors"
                            >
                                {children}
                            </a>
                        )
                    },

                    // --- Horizontal Rule ---
                    hr() {
                        return <hr className="my-5 border-t border-slate-200 dark:border-white/10" />
                    },

                    // --- Images (e.g., chart artifacts) ---
                    img({ src, alt, ...props }) {
                        return (
                            <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
                                <img
                                    src={src}
                                    alt={alt || 'Chart'}
                                    className="w-full h-auto bg-white"
                                    {...props}
                                />
                            </div>
                        )
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
