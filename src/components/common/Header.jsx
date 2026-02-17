import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export const Header = ({ title, onBack, children }) => {
    return (
        <header className="glass" style={{
            height: '75px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 25px',
            marginBottom: '25px',
            flexShrink: 0
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                {onBack && (
                    <button onClick={onBack} className="btn-outline" style={{ padding: '8px' }}>
                        <ChevronLeft size={20} />
                    </button>
                )}
                <h1 style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0
                }}>
                    {title}
                </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                {children}
            </div>
        </header>
    );
};
