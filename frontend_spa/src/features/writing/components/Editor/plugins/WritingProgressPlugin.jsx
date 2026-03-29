import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef, useState } from "react";

const SYNC_INTERVAL_MS = 60000; // 60 seconds
const IDLE_THRESHOLD_MS = 30000; // 30 seconds idle = stop counting

export default function WritingProgressPlugin() {
  const [editor] = useLexicalComposerContext();
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);
  const activeSecondsRef = useRef(0);
  
  // Track activity
  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(() => {
      lastActivityRef.current = Date.now();
    });
    
    return unregisterListener;
  }, [editor]);

  // Heartbeat logic
  useEffect(() => {
    // Tick every 1 second
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity < IDLE_THRESHOLD_MS) {
        activeSecondsRef.current += 1;
      }

      // If active for SYNC_INTERVAL_MS, sync to backend
      if (activeSecondsRef.current >= SYNC_INTERVAL_MS / 1000) {
        syncProductivity();
        activeSecondsRef.current = 0; // reset local counter after sync
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      // Optional: sync on unmount if there's significant remaining time
      if (activeSecondsRef.current > 10) {
        syncProductivity();
      }
    };
  }, []);

  const syncProductivity = async () => {
    try {
      const duration = Math.round(activeSecondsRef.current) || (SYNC_INTERVAL_MS / 1000);
      
      const response = await fetch('/api/productivity/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration }),
      });

      if (!response.ok) {
        console.warn('Failed to sync productivity', await response.text());
      }
    } catch (error) {
      console.error('Error syncing productivity:', error);
    }
  };

  return null;
}
