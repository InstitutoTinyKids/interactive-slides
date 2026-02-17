import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [role, setRole] = useState('student'); // student, teacher, admin
    const [user, setUser] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const notify = {
        success: (msg) => toast.success(msg, {
            style: {
                background: '#0a0a1a',
                color: '#fff',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
            },
            iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
            },
        }),
        error: (msg) => toast.error(msg, {
            style: {
                background: '#0a0a1a',
                color: '#fff',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
            },
        }),
        info: (msg) => toast(msg, {
            icon: 'ℹ️',
            style: {
                background: '#0a0a1a',
                color: '#fff',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
            },
        })
    };

    return (
        <AppContext.Provider value={{
            role, setRole,
            user, setUser,
            selectedProject, setSelectedProject,
            isMobile,
            notify
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
