// FILE: src/components/AssistantPanel.jsx
// Redesign: Agent-only right panel — no Writer/Reviewer tabs.
// All review & writing tools have been moved to Command Palette.

import React from 'react';
import AgentPanel from './Assistant/AgentPanel';

export default function AssistantPanel(props) {
    return (
        <div className="flex flex-col h-full bg-transparent transition-colors duration-300">
            <AgentPanel
                editorRef={props.editorRef}
                projectId={props.projectData?.id}
                activeChapterId={props.activeChapterId}
                onPendingDiffsChange={props.onPendingDiffsChange}
            />
        </div>
    );
}