import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Sidebar = ({
    isOpen,
    onClose,
    title,
    children,
    side = 'right',
    width = '350px',
    isMobile = false,
    hideClose = false
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    {isMobile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)',
                                zIndex: 1000
                            }}
                        />
                    )}

                    <motion.div
                        initial={{ x: side === 'right' ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: side === 'right' ? '100%' : '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="glass"
                        style={{
                            position: isMobile ? 'fixed' : 'relative',
                            top: isMobile ? 0 : 0,
                            [side]: 0,
                            height: isMobile ? '100%' : '100%',
                            width: isMobile ? '90%' : width,
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: side === 'right' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            borderRight: side === 'left' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            borderRadius: 0
                        }}
                    >
                        <div style={{
                            padding: '25px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', margin: 0 }}>{title}</h2>
                            {!hideClose && (
                                <button onClick={onClose} className="btn-outline" style={{ padding: '8px' }}>
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
