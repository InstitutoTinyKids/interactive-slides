import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                // Allow escape to blur
                if (e.key === 'Escape') {
                    document.activeElement.blur();
                }
                return;
            }

            const key = e.key.toLowerCase();
            const cmd = e.metaKey || e.ctrlKey;

            Object.entries(shortcuts).forEach(([pattern, action]) => {
                const parts = pattern.toLowerCase().split('+');
                const hasCtrl = parts.includes('ctrl');
                const mainKey = parts[parts.length - 1];

                if (key === mainKey && (hasCtrl === !!cmd)) {
                    e.preventDefault();
                    action();
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
