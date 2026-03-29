async function requestJson(endpoint, options = {}) {
    const response = await fetch(endpoint, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!response.ok) {
        let message = `Request gagal (${response.status})`;
        try {
            const data = await response.json();
            message = data?.message || data?.error || message;
        } catch (_) {
            // ignore
        }
        throw new Error(message);
    }

    return response.json();
}

function serializeMessage(msg) {
    return {
        role: msg.role,
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now(),
        intent: msg.intent || null,
        plan_id: msg.plan_id || null,
    };
}

function deserializeMessage(msg) {
    const timestamp = typeof msg.timestamp === 'string' && msg.timestamp.includes('T')
        ? new Date(msg.timestamp).getTime()
        : (msg.timestamp || Date.now());

    return {
        role: msg.role,
        content: msg.content || '',
        timestamp,
    };
}

function normalizeSession(projectId, session) {
    if (!session) return null;
    const messages = Array.isArray(session.messages) ? session.messages.map(deserializeMessage) : [];
    return {
        id: session.id || `project:${projectId}`,
        title: session.title || 'Chat Agent',
        messages,
        createdAt: session.createdAt || Date.now(),
        updatedAt: session.updatedAt || Date.now(),
    };
}

export async function saveAgentSession(projectId, _sessionId, messages, title) {
    if (!projectId) return null;
    const payload = {
        title: title || 'Chat Agent',
        messages: (messages || [])
            .filter(message => message?.role === 'user' || message?.role === 'assistant' || message?.role === 'system')
            .map(serializeMessage),
    };
    const response = await requestJson(`/api/agent/history/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return normalizeSession(projectId, response?.session);
}

export async function loadAgentSession(projectId, _sessionId) {
    if (!projectId) return null;
    const response = await requestJson(`/api/agent/history/${projectId}`, { method: 'GET' });
    return normalizeSession(projectId, response?.session);
}

export async function listAgentSessions(projectId) {
    if (!projectId) return [];
    const response = await requestJson(`/api/agent/history/${projectId}`, { method: 'GET' });
    const sessions = Array.isArray(response?.sessions) ? response.sessions : [];
    return sessions.map(session => normalizeSession(projectId, session)).filter(Boolean);
}

export async function deleteAgentSession(projectId, _sessionId) {
    if (!projectId) return;
    await requestJson(`/api/agent/history/${projectId}`, { method: 'DELETE' });
}

export async function clearAllAgentSessions(projectId) {
    if (!projectId) return;
    await requestJson(`/api/agent/history/${projectId}`, { method: 'DELETE' });
}
