// ─── DiffBlockComponent — VS Code-like inline diff visualization ───
// Rendered by DiffBlockNode inside the Lexical editor.
// Shows old content (red/strikethrough) vs new content (green highlight)
// with Accept/Reject buttons. Communicates via CustomEvents.

import React, { useCallback, useMemo } from 'react';
import { Check, X, PenLine, Plus, Trash2, ArrowRight } from 'lucide-react';

// ─── Event names for communication with useAgentLoop ───
export const DIFF_ACCEPT_EVENT = 'onthesis-diff-accept';
export const DIFF_REJECT_EVENT = 'onthesis-diff-reject';

// ─── Diff type config ───
const DIFF_CONFIG = {
    edit: {
        label: 'Perubahan',
        icon: PenLine,
        accentColor: 'blue',
        showOld: true,
        showNew: true,
    },
    insert: {
        label: 'Paragraf Baru',
        icon: Plus,
        accentColor: 'green',
        showOld: false,
        showNew: true,
    },
    delete: {
        label: 'Hapus Paragraf',
        icon: Trash2,
        accentColor: 'red',
        showOld: true,
        showNew: false,
    },
};

export default function DiffBlockComponent({ diffId, diffType, oldHtml, newHtml, paraId, reason }) {
    const config = DIFF_CONFIG[diffType] || DIFF_CONFIG.edit;
    const DiffIcon = config.icon;

    // ─── Accept/Reject via CustomEvent (caught by useAgentLoop) ───
    const handleAccept = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent(DIFF_ACCEPT_EVENT, {
            detail: { diffId },
        }));
    }, [diffId]);

    const handleReject = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent(DIFF_REJECT_EVENT, {
            detail: { diffId },
        }));
    }, [diffId]);

    // ─── Strip HTML tags for plain-text preview, keep whitespace ───
    const stripHtml = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    };

    const oldText = useMemo(() => stripHtml(oldHtml), [oldHtml]);
    const newText = useMemo(() => stripHtml(newHtml), [newHtml]);

    return (
        <div
            className={`thesis-diff-block diff-${diffType}`}
            contentEditable={false}
            data-diff-id={diffId}
            onClick={(e) => e.stopPropagation()}
        >
            {/* ── Left Gutter: Paragraph ID ── */}
            <div className="diff-gutter">
                <span className="diff-para-id">{paraId}</span>
            </div>

            {/* ── Main Content Area ── */}
            <div className="diff-main">
                <div className="diff-content">
                    {/* OLD Content: Red / Strikethrough */}
                    {config.showOld && oldText && (
                        <div className="diff-text-old">
                            <span dangerouslySetInnerHTML={{ __html: oldHtml }} />
                        </div>
                    )}

                    {/* NEW Content: Green / Highlighted / Default Edit Text */}
                    {config.showNew && newText && (
                        <div className="diff-text-new">
                            <span dangerouslySetInnerHTML={{ __html: newHtml }} />
                        </div>
                    )}

                    {/* Badge Indicator */}
                    <span className="diff-badge">
                        <DiffIcon size={12} className="diff-badge-icon" />
                        {diffType === 'edit' ? 'edited' : diffType === 'insert' ? 'inserted' : 'deleted'}
                    </span>
                </div>

                {/* ── Optional AI Reason ── */}
                {reason && (
                    <div className="diff-reason">
                        <span className="diff-reason-label">AI:</span> {reason}
                    </div>
                )}

                {/* ── Action Toolbar (Bottom) ── */}
                <div className="diff-toolbar">
                    <span className="diff-toolbar-id">{paraId}</span>
                    <div className="diff-toolbar-actions">
                        <button
                            className="diff-btn diff-btn-accept"
                            onClick={handleAccept}
                            title="Accept perubahan (Ctrl+Shift+Enter)"
                        >
                            <Check size={14} strokeWidth={2.5} />
                            <span>{diffType === 'delete' ? 'Accept Delete' : 'Accept'}</span>
                        </button>
                        <button
                            className="diff-btn diff-btn-reject"
                            onClick={handleReject}
                            title="Reject/Restore (Ctrl+Shift+Backspace)"
                        >
                            <X size={14} strokeWidth={2.5} />
                            <span>{diffType === 'delete' ? 'Restore' : 'Reject'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
