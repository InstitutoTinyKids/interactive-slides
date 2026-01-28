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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [stageDim, setStageDim] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const updateDim = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);

            const headerH = 0; // Header is now 0 on all platforms
            const availW = window.innerWidth;
            const availH = window.innerHeight;

            // USE SLIDE FORMAT (16/9 default)
            const slideRatio = slide?.format === '1/1' ? 1 : (16 / 9);

            if (availW / availH > slideRatio) {
                setStageDim({ w: availH * slideRatio, h: availH });
            } else {
                setStageDim({ w: availW, h: availW / slideRatio });
            }
        };
        updateDim();
        window.addEventListener('resize', updateDim);
        return () => window.removeEventListener('resize', updateDim);
    }, [slide?.format]);

    const headerHeight = '0px';

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
                height: '100dvh',
                width: '100vw',
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                touchAction: 'none'
            }}
            className="anim-up"
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* RESPONSIVE MAIN STAGE */}
            <main style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                background: '#050510',
                overflow: 'hidden'
            }}>
                <div
                    ref={stageRef}
                    style={{
                        width: `${stageDim.w}px`,
                        height: `${stageDim.h}px`,
                        aspectRatio: slide?.format === '1/1' ? '1/1' : '16/9',
                        background: '#111',
                        borderRadius: isMobile ? '0' : '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        containerType: 'size',
                        boxShadow: isMobile ? 'none' : '0 40px 100px rgba(0,0,0,0.5)',
                        border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    {slide?.image_url && <img src={slide.image_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}

                    {/* Text Layer - Scaled by container size */}
                    {slide?.elements?.filter(e => e.type === 'text').map(el => (
                        <div key={el.id} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: el.width ? `${(el.width / 900) * 100}%` : '40%', height: el.height ? `${(el.height / 506) * 100}%` : '15%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <textarea
                                    className="premium-input"
                                    style={{
                                        background: 'rgba(255,255,255,0.5)', // 50% opacity
                                        backdropFilter: 'blur(5px)',
                                        border: '2px solid white',
                                        padding: isMobile ? '8px' : '15px',
                                        borderRadius: '16px',
                                        width: '100%',
                                        height: '100%',
                                        textAlign: 'center',
                                        color: '#000',
                                        fontSize: isMobile ? '12px' : 'clamp(9px, 1.8cqw, 14px)',
                                        lineHeight: '1.2',
                                        fontWeight: 800,
                                        resize: 'none',
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                                    }}
                                    placeholder={el.text || "Escribe aquí..."}
                                    value={textValues[el.id] || ''}
                                    onChange={(e) => setTextValues({ ...textValues, [el.id]: e.target.value })}
                                    onBlur={() => {
                                        // Force browser to reset any scroll position caused by keyboard/zoom
                                        window.scrollTo(0, 0);
                                    }}
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
                                    <img src={item.url} style={{ width: '12cqw', height: '12cqw', objectFit: 'contain', pointerEvents: 'none' }} />
                                ) : (
                                    <div style={{ width: '8cqw', height: '8cqw', background: '#7c3aed', borderRadius: '16px', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Move color="white" size="50%" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <canvas ref={canvasRef} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 30, cursor: tool === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }} onMouseDown={handleStart} onTouchStart={handleStart} />

                    {/* IMMERSIVE CONTROL BAR */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: slide?.format === '1/1' ? '2cqh' : 0,
                            left: slide?.format === '1/1' ? '2.5%' : 0,
                            right: slide?.format === '1/1' ? '2.5%' : 0,
                            width: slide?.format === '1/1' ? '95%' : '100%',
                            height: isMobile
                                ? (slide?.format === '1/1' ? '15cqh' : '20cqh')
                                : (slide?.format === '1/1' ? '10cqh' : '12cqh'),
                            background: slide?.format === '1/1'
                                ? 'rgba(10, 10, 26, 0.85)'
                                : 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 100%)',
                            backdropFilter: 'blur(15px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile
                                ? (slide?.format === '1/1' ? '0 3cqw' : '0 3cqw 6cqh 3cqw')
                                : '0 3cqw',
                            gap: '1.5cqw',
                            zIndex: 100,
                            borderRadius: slide?.format === '1/1' ? '2.5cqh' : 0,
                            border: slide?.format === '1/1' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            touchAction: 'auto',
                            boxShadow: slide?.format === '1/1' ? '0 10px 40px rgba(0,0,0,0.5)' : 'none'
                        }}
                    >
                        {/* Audio & Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2cqw', flexShrink: 0 }}>
                            {slide?.audio_url && (
                                <button
                                    onClick={() => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}
                                    style={{ background: isPlaying ? '#7c3aed' : 'rgba(255,255,255,0.1)', border: 'none', width: '7cqh', height: '7cqh', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
                                >
                                    {isPlaying ? <Pause size="50%" /> : <Volume2 size="50%" />}
                                    <audio ref={audioRef} src={slide.audio_url} onEnded={() => setIsPlaying(false)} />
                                </button>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '2.2cqh', fontWeight: 800, color: 'white', opacity: 0.9, lineHeight: 1 }}>{alias}</span>
                                <span style={{ fontSize: '1.6cqh', color: '#a78bfa', fontWeight: 700 }}>PAG {currentIndex + 1} / {totalSlides}</span>
                            </div>
                        </div>

                        {/* Middle Controls */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: slide?.format === '1/1' ? '1cqw' : '3cqw' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button onClick={onPrev} disabled={isFirst} style={{ background: 'none', border: 'none', color: 'white', opacity: isFirst ? 0.2 : 0.8, cursor: 'pointer', width: '8cqh', height: '8cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChevronLeft size="70%" />
                                </button>
                                <button onClick={onNext} disabled={isLast} style={{ background: 'none', border: 'none', color: 'white', opacity: isLast ? 0.2 : 0.8, cursor: 'pointer', width: '8cqh', height: '8cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChevronRight size="70%" />
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: slide?.format === '1/1' ? '1cqw' : '1.5cqw', background: 'rgba(255,255,255,0.05)', padding: '0.6cqh', borderRadius: '1.5cqh' }}>
                                {Array.from(new Set(slide.elements?.map(e => e.type))).map(type => {
                                    const Icon = type === 'draw' ? Paintbrush : type === 'drag' ? Move : type === 'stamp' ? Target : Type;
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setTool(type)}
                                            style={{ padding: '1cqh 2cqh', borderRadius: '1cqh', border: 'none', background: tool === type ? 'white' : 'transparent', color: tool === type ? '#7c3aed' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Icon size="3.5cqh" />
                                        </button>
                                    );
                                })}
                            </div>

                            {tool === 'draw' && (
                                <div style={{ display: 'flex', gap: '2cqw', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.6cqh 1.5cqh', borderRadius: '1.5cqh' }}>
                                    <button onClick={undo} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: '6cqh', height: '6cqh', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Undo2 size="60%" />
                                    </button>

                                    {/* Stroke Width Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw', padding: '0 1cqw', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: '4cqh', height: '4cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: `${Math.max(2, lineWidth / 2)}px`, height: `${Math.max(2, lineWidth / 2)}px`, background: 'white', borderRadius: '50%' }} />
                                        </div>
                                        <input
                                            type="range"
                                            min="2"
                                            max="30"
                                            value={lineWidth}
                                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                                            style={{ width: isMobile ? '60px' : '100px', accentColor: '#7c3aed', height: '4px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.8cqw' }}>
                                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff', '#000000'].map(c => (
                                            <button key={c} onClick={() => setColor(c)} style={{ width: '4cqh', height: '4cqh', borderRadius: '50%', background: c, border: color === c ? '2px solid white' : 'none' }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Actions */}
                        <div style={{ display: 'flex', gap: '2cqw', flexShrink: 0 }}>
                            <button onClick={() => { setPaths([]); setStamps([]); setTextValues({}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '1cqh 1.5cqh', borderRadius: '1cqh', cursor: 'pointer' }}>
                                <RotateCcw size="3.5cqh" />
                            </button>
                            <button onClick={() => onComplete({ paths, stamps, textValues, dragItems })} style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', border: 'none', color: 'white', padding: isMobile ? '1.5cqh 3cqh' : '1cqh 2.5cqh', borderRadius: '1.2cqh', fontWeight: 800, fontSize: '2cqh' }}>
                                {isLast ? 'FIN' : 'SIG'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
