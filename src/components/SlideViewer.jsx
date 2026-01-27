import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Paintbrush, Move, Type, Target, ChevronLeft, ChevronRight, Undo2, Eraser, CheckCircle2, Volume2 } from 'lucide-react';

export default function SlideViewer({ slide, alias, currentIndex, totalSlides, onComplete, onNext, onPrev, isFirst, isLast }) {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Tools State
    const [tool, setTool] = useState('draw');
    const [color, setColor] = useState('#ef4444');
    const [lineWidth, setLineWidth] = useState(8);

    // Interaction Data
    const [paths, setPaths] = useState([]);
    const [stamps, setStamps] = useState([]);
    const [textValues, setTextValues] = useState({});
    const [dragItems, setDragItems] = useState([]);

    // Interaction State
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const headerHeight = isMobile ? '50px' : '60px';
    const footerHeight = isMobile ? '70px' : '80px';

    // Initial Load
    useEffect(() => {
        setPaths([]);
        setStamps([]);
        setTextValues({});

        const draggables = slide?.elements?.filter(e => e.type === 'drag').map(e => ({
            ...e,
            currentX: (e.x / 100) * 1920,
            currentY: (e.y / 100) * 1080
        })) || [];
        setDragItems(draggables);

        const types = slide?.elements?.map(e => e.type) || [];
        if (types.includes('draw')) setTool('draw');
        else if (types.includes('drag')) setTool('drag');
        else if (types.includes('stamp')) setTool('stamp');
        else if (types.includes('text')) setTool('text');
    }, [slide]);

    // Canvas Rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        paths.forEach(path => {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            path.points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });

        stamps.forEach(s => {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.arc(s.x, s.y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.stroke();
        });
    }, [paths, stamps]);

    const getCoords = (e) => {
        const rect = stageRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: ((clientX - rect.left) / rect.width) * 1920,
            y: ((clientY - rect.top) / rect.height) * 1080
        };
    };

    const handleStart = (e) => {
        // Prevent scrolling on touch
        if (e.type === 'touchstart') {
            // e.preventDefault(); // This can cause issues with some browsers if not passive: false
        }

        const { x, y } = getCoords(e);
        if (tool === 'draw') {
            setIsDrawing(true);
            setPaths([...paths, { color, width: lineWidth, points: [{ x, y }] }]);
        } else if (tool === 'stamp') {
            setStamps([...stamps, { x, y }]);
        }
    };

    const handleMove = (e) => {
        if (!isDrawing && draggingIdx === null) return;

        const { x, y } = getCoords(e);
        if (isDrawing) {
            const newPaths = [...paths];
            newPaths[newPaths.length - 1].points.push({ x, y });
            setPaths(newPaths);
        } else if (draggingIdx !== null) {
            const newItems = [...dragItems];
            newItems[draggingIdx].currentX = x;
            newItems[draggingIdx].currentY = y;
            setDragItems(newItems);
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
        setDraggingIdx(null);
    };

    const undo = () => {
        if (tool === 'draw' && paths.length > 0) setPaths(paths.slice(0, -1));
        if (tool === 'stamp' && stamps.length > 0) setStamps(stamps.slice(0, -1));
    };

    return (
        <div
            style={{
                height: '100vh',
                width: '100vw',
                background: '#050510',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                touchAction: 'none' // Global touch action prevention
            }}
            className="anim-up"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* COMPACT PREMIUM HEADER */}
            <header style={{ height: headerHeight, padding: isMobile ? '0 15px' : '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,25,0.8)', backdropFilter: 'blur(10px)', zIndex: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px' }}>
                    <div style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>LÁMINA {currentIndex + 1}</div>
                    <h2 style={{ fontSize: isMobile ? '0.75rem' : '0.9rem', color: 'white', fontWeight: 600, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '120px' : 'none' }}>{alias}</h2>
                </div>

                <div style={{ display: 'flex', gap: isMobile ? '8px' : '15px' }}>
                    {tool === 'draw' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '15px' }}>
                            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px' }}>
                                {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff', '#000000'].map(c => (
                                    <button key={c} onClick={() => setColor(c)} style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px', borderRadius: '50%', background: c, border: color === c ? '2px solid white' : 'none', cursor: 'pointer' }} />
                                ))}
                            </div>
                            {!isMobile && <input type="range" min="2" max="40" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} style={{ width: '70px', accentColor: '#7c3aed' }} />}
                            <button onClick={undo} className="btn-outline" style={{ padding: isMobile ? '4px 8px' : '6px 12px', fontSize: isMobile ? '8px' : '9px', display: 'flex', alignItems: 'center', gap: '3px' }}><Undo2 size={isMobile ? 10 : 12} /> {isMobile ? '' : 'Deshacer'}</button>
                        </div>
                    )}
                </div>
            </header>

            {/* RESPONSIVE MAIN STAGE */}
            <main style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '5px' : '10px 20px',
                overflow: 'hidden',
                background: 'radial-gradient(circle at center, #0a0a1f, #050510)'
            }}>
                <div
                    ref={stageRef}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxWidth: `calc((100vh - ${isMobile ? 120 : 180}px) * 16 / 9)`,
                        maxHeight: `calc(100vh - ${isMobile ? 120 : 180}px)`,
                        aspectRatio: '16/9',
                        background: '#000',
                        borderRadius: isMobile ? '12px' : '24px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        containerType: 'size', // Enable container query units
                        touchAction: 'none'    // Prevent browser gestures
                    }}
                >
                    {slide?.image_url && <img src={slide.image_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}

                    {/* Text Layer - Scaled by container size */}
                    {slide?.elements?.filter(e => e.type === 'text').map(el => (
                        <div
                            key={el.id}
                            style={{
                                position: 'absolute',
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: el.width ? `${(el.width / 900) * 100}%` : '40%',
                                height: el.height ? `${(el.height / 506) * 100}%` : '15%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 40
                            }}
                        >
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <textarea
                                    className="premium-input"
                                    style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        backdropFilter: 'blur(5px)',
                                        border: '2px solid white',
                                        padding: isMobile ? '8px' : '12px 15px',
                                        borderRadius: '16px',
                                        width: '100%',
                                        height: '100%',
                                        textAlign: 'center',
                                        color: '#000',
                                        fontSize: 'clamp(10px, 2.5cqw, 18px)',
                                        lineHeight: '1.2',
                                        fontWeight: 800,
                                        resize: 'none',
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                                    }}
                                    placeholder={el.text || "Escribe aquí..."}
                                    value={textValues[el.id] || ''}
                                    onChange={(e) => setTextValues({ ...textValues, [el.id]: e.target.value })}
                                />
                                {textValues[el.id] && (
                                    <div style={{ position: 'absolute', right: '10px', top: '10px', color: '#059669' }}><CheckCircle2 size={isMobile ? 14 : 18} /></div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Drag Layer */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: tool === 'drag' ? 'auto' : 'none' }}>
                        {dragItems.map((item, idx) => (
                            <div
                                key={item.id}
                                style={{ position: 'absolute', left: `${(item.currentX / 1920) * 100}%`, top: `${(item.currentY / 1080) * 100}%`, transform: 'translate(-50%, -50%)', cursor: tool === 'drag' ? 'grab' : 'default', pointerEvents: 'auto', touchAction: 'none' }}
                                onMouseDown={(e) => { if (tool === 'drag') setDraggingIdx(idx); }}
                                onTouchStart={(e) => { if (tool === 'drag') setDraggingIdx(idx); }}
                            >
                                {item.url ? (
                                    <img src={item.url} style={{ width: 'min(150px, 12vw)', height: 'min(150px, 12vw)', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))', pointerEvents: 'none' }} />
                                ) : (
                                    <div style={{ width: 'min(80px, 8vw)', height: 'min(80px, 8vw)', background: '#7c3aed', borderRadius: '16px', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Move color="white" size={24} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <canvas ref={canvasRef} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 30, cursor: tool === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }} onMouseDown={handleStart} onTouchStart={handleStart} />

                    {/* Pear Deck Bottom Bar - Transparent & Proportional */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '9cqh', background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', padding: '0 1.5cqw', gap: '1cqw', zIndex: 100, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '4cqh', height: '4cqh', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Play fill="white" size="50%" color="white" /></div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ color: '#0f172a', fontWeight: 900, fontSize: '2.5cqh', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {tool === 'draw' ? 'Dibujo' : tool === 'drag' ? 'Arrastrar' : tool === 'stamp' ? 'Selección' : 'Texto'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5cqw', background: 'rgba(15, 23, 42, 0.05)', padding: '0.4cqh', borderRadius: '1cqh', overflow: 'auto' }}>
                            {Array.from(new Set(slide.elements?.map(e => e.type))).map(type => (
                                <button key={type} onClick={() => setTool(type)} style={{ padding: '0.6cqh 1.5cqh', borderRadius: '0.8cqh', border: 'none', background: tool === type ? 'white' : 'transparent', color: tool === type ? '#7c3aed' : '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: '1.8cqh', textTransform: 'uppercase', boxShadow: tool === type ? '0 2px 5px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* COMPACT LOWER CONTROL BAR */}
            <footer style={{ height: footerHeight, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 15px' : '0 40px', background: 'rgba(15,15,25,0.9)', zIndex: 200, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: isMobile ? '50px' : '150px' }}>
                    {slide?.audio_url && (
                        <button
                            onClick={() => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}
                            className="btn-premium"
                            style={{ width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', borderRadius: '50%', padding: 0, boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
                        >
                            {isPlaying ? <Pause size={isMobile ? 18 : 22} /> : <Volume2 size={isMobile ? 18 : 22} />}
                            <audio ref={audioRef} src={slide.audio_url} onEnded={() => setIsPlaying(false)} />
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '15px' : '25px' }}>
                    <button onClick={onPrev} disabled={isFirst} className="btn-outline" style={{ width: isMobile ? '36px' : '48px', height: isMobile ? '36px' : '48px', borderRadius: '50%', padding: 0, opacity: isFirst ? 0.2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={isMobile ? 20 : 24} />
                    </button>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '0.8rem' : '1rem', minWidth: isMobile ? '40px' : '60px', textAlign: 'center' }}>{currentIndex + 1} / {totalSlides}</div>
                    <button onClick={onNext} disabled={isLast} className="btn-outline" style={{ width: isMobile ? '36px' : '48px', height: isMobile ? '36px' : '48px', borderRadius: '50%', padding: 0, opacity: isLast ? 0.2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={isMobile ? 20 : 24} />
                    </button>
                </div>

                <div style={{ width: isMobile ? '120px' : '150px', display: 'flex', justifyContent: 'flex-end', gap: isMobile ? '5px' : '10px' }}>
                    {!isMobile && <button onClick={() => { setPaths([]); setStamps([]); setTextValues({}); }} className="btn-outline" style={{ height: '40px', padding: '0 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}><RotateCcw size={14} /> Reiniciar</button>}
                    <button onClick={() => onComplete({ paths, stamps, textValues, dragItems })} className="btn-premium" style={{ height: isMobile ? '36px' : '40px', padding: isMobile ? '0 12px' : '0 20px', borderRadius: '12px', fontSize: isMobile ? '0.75rem' : '0.9rem', whiteSpace: 'nowrap' }}>
                        {isLast ? 'Finalizar' : 'Sig.'}
                    </button>
                </div>
            </footer>
        </div>
    );
}
