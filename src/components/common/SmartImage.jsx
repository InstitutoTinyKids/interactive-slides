import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SmartImage = ({ src, alt, className, style }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src) return;
        const img = new Image();
        img.src = src;
        img.onload = () => setLoaded(true);
        img.onerror = () => setError(true);
    }, [src]);

    if (!src || error) {
        return (
            <div className={className} style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.3)'
            }}>
                {src ? '⚠️ Error' : '🖼️ No Image'}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
            <AnimatePresence>
                {!loaded && (
                    <motion.div
                        key="shimmer"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s infinite linear'
                        }}
                    />
                )}
            </AnimatePresence>

            <motion.img
                src={src}
                alt={alt}
                className={className}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: style?.objectFit || 'cover',
                    display: loaded ? 'block' : 'none'
                }}
            />

            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};
