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
      const taskPrefix = {
        writing: 'Bantu pengerjaan penulisan akademik berikut.',
        critique: 'Lakukan kritik akademik yang tajam namun konstruktif terhadap materi berikut.',
        concept_map: 'Bangun peta konsep tekstual dari materi berikut.',
        mind_map: 'Bangun mind map tekstual yang ringkas dari materi berikut.',
        sidang_simulation: 'Simulasikan respons sidang skripsi untuk konteks berikut.',
      };

      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterId: '',
          mode,
          task: `${taskPrefix[mode] || taskPrefix.writing}\n\n${input}`,
          context: {
            ...context,
            requestedTask: mode,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to execute orchestrator');
      if (!response.body) throw new Error('Missing SSE stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let bot = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const trimmed = rawEvent.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');
          if (!payload || payload === '[DONE]') continue;

          const event = JSON.parse(payload);
          if (event.type === 'TEXT_DELTA') {
            bot += event.delta || '';
          } else if (event.type === 'PENDING_DIFF') {
            bot += `\n\n[Pending diff]\n${event.diff?.new_text || event.diff?.after || ''}`;
          } else if (event.type === 'ERROR') {
            throw new Error(event.message || 'Agent runtime failed');
          }

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
