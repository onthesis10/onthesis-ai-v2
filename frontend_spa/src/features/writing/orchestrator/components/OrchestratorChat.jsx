import React, { useMemo, useState } from 'react';

const MODES = [
  { value: 'writing', label: 'Writing' },
  { value: 'critique', label: 'Critique' },
  { value: 'concept_map', label: 'Concept Map' },
  { value: 'mind_map', label: 'Mind Map' },
  { value: 'sidang_simulation', label: 'Sidang' },
];

export function OrchestratorChat({ projectId, projectData }) {
  const [mode, setMode] = useState('writing');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const context = useMemo(() => ({
    context_title: projectData?.title || '',
    context_problem: projectData?.problem_statement || '',
    context_method: projectData?.methodology || '',
    context_variables: projectData?.variables || projectData?.variables_indicators || '',
    context_summary: projectData?.context_summary || '',
  }), [projectData]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const user = { role: 'user', content: input };
    setMessages((prev) => [...prev, user]);
    setLoading(true);

    try {
      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          message: input,
          projectId,
          context,
        }),
      });

      if (!response.ok) throw new Error('Failed to execute orchestrator');

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: JSON.stringify(data, null, 2) }]);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bot = '';
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bot += decoder.decode(value);
          setMessages((prev) => {
            const draft = [...prev];
            draft[draft.length - 1] = { role: 'assistant', content: bot };
            return draft;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col p-3 gap-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Mode</label>
        <select className="text-xs border rounded px-2 py-1" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto border rounded p-2 bg-white/70 dark:bg-black/10">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <pre className="whitespace-pre-wrap text-xs">{m.content}</pre>
          </div>
        ))}
      </div>

      <form onSubmit={onSend} className="flex gap-2">
        <input
          className="flex-1 text-sm border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis instruksi akademik..."
        />
        <button disabled={loading} className="px-3 py-1 rounded bg-blue-600 text-white text-xs">
          {loading ? '...' : 'Kirim'}
        </button>
      </form>
    </div>
  );
}
