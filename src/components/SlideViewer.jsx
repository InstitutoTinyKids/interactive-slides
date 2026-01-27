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
                touchAction: 'pan-x pan-y pinch-zoom' // Allow zoom and scroll, block only on interaction areas
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
                padding: '0', // Full screen priority
                overflow: 'hidden',
                background: 'radial-gradient(circle at center, #0a0a1f, #050510)'
            }}>
                <div
                    ref={stageRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: `calc((100vh - ${headerHeight}) * 16 / 9)`,
                        maxHeight: `calc(100vh - ${headerHeight})`,
                        aspectRatio: '16/9',
                        background: '#000',
                        borderRadius: '0px', // Full screen look
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        containerType: 'size',
                        touchAction: 'pan-x pan-y pinch-zoom'
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

                    <canvas ref={canvasRef} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 30, cursor: tool === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }} onMouseDown={handleStart} onTouchStart={handleStart} />

                    {/* Integrated Internal Control Bar - Transparent & Proportional */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10cqh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', padding: '0 2cqw', gap: '1.5cqw', zIndex: 100, borderTop: '1px solid rgba(255,255,255,0.1)', touchAction: 'auto' }}>

                        {/* Audio Control */}
                        {slide?.audio_url && (
                            <button
                                onClick={() => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}
                                style={{ background: isPlaying ? '#7c3aed' : 'rgba(255,255,255,0.1)', border: 'none', width: '6cqh', height: '6cqh', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}
                            >
                                {isPlaying ? <Pause size="50%" /> : <Volume2 size="50%" />}
                                <audio ref={audioRef} src={slide.audio_url} onEnded={() => setIsPlaying(false)} />
                            </button>
                        )}

                        {/* Navigation */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5cqw' }}>
                            <button onClick={onPrev} disabled={isFirst} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: isFirst ? 0.2 : 0.8, width: '5cqh', height: '5cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size="80%" />
                            </button>
                            <div style={{ color: 'white', fontWeight: 800, fontSize: '1.8cqh', minWidth: '6cqw', textAlign: 'center' }}>{currentIndex + 1} / {totalSlides}</div>
                            <button onClick={onNext} disabled={isLast} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: isLast ? 0.2 : 0.8, width: '5cqh', height: '5cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size="80%" />
                            </button>
                        </div>

                        {/* Tool Selector - Compact */}
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.8cqw', background: 'rgba(255,255,255,0.05)', padding: '0.5cqh', borderRadius: '1.2cqh' }}>
                                {Array.from(new Set(slide.elements?.map(e => e.type))).map(type => {
                                    const Icon = type === 'draw' ? Paintbrush : type === 'drag' ? Move : type === 'stamp' ? Target : Type;
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setTool(type)}
                                            style={{
                                                padding: '0.8cqh 1.2cqh',
                                                borderRadius: '0.8cqh',
                                                border: 'none',
                                                background: tool === type ? 'white' : 'transparent',
                                                color: tool === type ? '#7c3aed' : 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5cqw',
                                                transition: '0.2s',
                                                boxShadow: tool === type ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
                                            }}
                                        >
                                            <Icon size="1.8cqh" />
                                            {!isMobile && <span style={{ fontSize: '1.4cqh', fontWeight: 800, textTransform: 'uppercase' }}>{type}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '1cqw', alignItems: 'center' }}>
                            <button onClick={() => { setPaths([]); setStamps([]); setTextValues({}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '1cqh 2cqh', borderRadius: '1cqh', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5cqw' }}>
                                <RotateCcw size="1.5cqh" />
                                {!isMobile && <span style={{ fontSize: '1.4cqh', fontWeight: 800 }}>Reiniciar</span>}
                            </button>
                            <button
                                onClick={() => onComplete({ paths, stamps, textValues, dragItems })}
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '1cqh 2.5cqh',
                                    borderRadius: '1cqh',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '1.6cqh',
                                    boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
                                }}
                            >
                                {isLast ? 'Finalizar' : 'Siguiente'}
                            </button>
                        </div>

                    </div>
                </div>
            </main>


        </div>
    );
}
