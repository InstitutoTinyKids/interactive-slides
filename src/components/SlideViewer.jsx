import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Paintbrush, Move, Type, Target, ChevronLeft, ChevronRight, Undo2, Eraser, CheckCircle2, Volume2, Settings2 } from 'lucide-react';

export default function SlideViewer({ slide, alias, currentIndex, totalSlides, onComplete, onNext, onPrev, isFirst, isLast, role, onRestart, onHome }) {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Tools State
    const [tool, setTool] = useState('draw');
    const [color, setColor] = useState('#ef4444');
    const [lineWidth, setLineWidth] = useState(8);
    const [activeMenu, setActiveMenu] = useState('none'); // 'none', 'color', 'width'

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

        // Preload Next Slide Image
        if (onNext) {
            // This is a bit tricky since we don't have the next slide object here directly, 
            // but we can infer it or just rely on the parent.
            // However, SlideViewer is key-ed by currentSlideIdx in App.jsx, 
            // so we might want to do preloading in App.jsx instead.
        }
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
                            bottom: slide?.format === '1/1' ? '2.5cqh' : 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: slide?.format === '1/1' ? '90%' : '100%',
                            height: 'auto',
                            minHeight: isMobile ? '13cqh' : '11cqh',
                            background: 'rgba(15, 15, 35, 0.98)',
                            backdropFilter: 'blur(30px)',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 100,
                            borderRadius: slide?.format === '1/1' ? '3cqh' : 0,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            border: slide?.format === '1/1' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            touchAction: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                            overflow: 'visible'
                        }}
                    >
                        {/* Main Content Area - Strictly Centered */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '0 3cqw' : '0 4cqw',
                            height: isMobile ? '12cqh' : '10cqh',
                            width: '100%'
                        }}>
                            {/* Left Group: Back + Audio + Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '2cqw' : '3cqw', flexShrink: 0 }}>
                                {/* 1. Botón Atrás */}
                                <button
                                    onClick={onPrev}
                                    disabled={isFirst}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        opacity: isFirst ? 0.2 : 0.9,
                                        width: '6cqh',
                                        height: '6cqh',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: isFirst ? 'default' : 'pointer',
                                        transition: '0.2s'
                                    }}
                                >
                                    <ChevronLeft size="90%" />
                                </button>

                                {/* 2. Botón Audio */}
                                {slide?.audio_url && (
                                    <button
                                        onClick={() => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}
                                        style={{ background: isPlaying ? 'rgba(124, 58, 237, 0.2)' : 'none', border: 'none', width: '6cqh', height: '6cqh', borderRadius: '50%', color: isPlaying ? '#a78bfa' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
                                    >
                                        {isPlaying ? <Pause size="60%" /> : <Volume2 size="60%" />}
                                        <audio ref={audioRef} src={slide.audio_url} onEnded={() => setIsPlaying(false)} />
                                    </button>
                                )}

                                {/* 3. Info del Usuario */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginLeft: '1cqw' }}>
                                    <span style={{ fontSize: isMobile ? '2.2cqh' : '2.4cqh', fontWeight: 900, color: 'white', lineHeight: 1 }}>{alias}</span>
                                    <span style={{ fontSize: isMobile ? '1.4cqh' : '1.6cqh', color: '#a78bfa', fontWeight: 700, opacity: 0.8 }}>PAG {currentIndex + 1}/{totalSlides}</span>
                                </div>
                            </div>

                            {/* Middle Group: Drawing Tools */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '3cqw' : '5cqw' }}>
                                {tool === 'draw' && (
                                    <>
                                        {/* Undo */}
                                        <button onClick={undo} style={{ background: 'none', border: 'none', width: '6cqh', height: '6cqh', color: 'white', opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <Undo2 size="65%" />
                                        </button>

                                        {/* Grosor (Settings) */}
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === 'width' ? 'none' : 'width')}
                                                style={{ background: 'none', border: 'none', width: '6cqh', height: '6cqh', color: activeMenu === 'width' ? '#a78bfa' : 'white', opacity: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 300 }}
                                            >
                                                <Settings2 size="3.8cqh" />
                                            </button>
                                            {activeMenu === 'width' && (
                                                <div className="glass anim-up" style={{ position: 'absolute', bottom: '9cqh', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10, 10, 26, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2cqh', padding: '2cqh', zIndex: 200, boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                                                    <div style={{ height: '18cqh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1cqh' }}>
                                                        <div style={{ width: '4cqh', height: '4cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: `${Math.max(3, lineWidth / 2.2)}px`, height: `${Math.max(3, lineWidth / 2.2)}px`, background: 'white', borderRadius: '50%' }} />
                                                        </div>
                                                        <input type="range" min="2" max="30" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} style={{ width: '12cqh', height: '6px', transform: 'rotate(-90deg)', accentColor: '#7c3aed', cursor: 'pointer', marginTop: '4cqh' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Color */}
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === 'color' ? 'none' : 'color')}
                                                style={{ width: '6cqh', height: '6cqh', borderRadius: '50%', background: color, border: activeMenu === 'color' ? '3px solid white' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', transition: '0.2s' }}
                                            />
                                            {activeMenu === 'color' && (
                                                <div className="glass anim-up" style={{ position: 'absolute', bottom: '9cqh', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10, 10, 26, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2cqh', padding: '2cqh', zIndex: 200, boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1cqh' }}>
                                                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff', '#000000'].map(c => (
                                                            <button key={c} onClick={() => { setColor(c); setActiveMenu('none'); }} style={{ width: '5cqh', height: '5cqh', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxShadow: color === c ? `0 0 20px ${c}` : 'none' }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reiniciar (Reset) */}
                                        <button
                                            onClick={() => { setPaths([]); setStamps([]); setTextValues({}); }}
                                            style={{ background: 'none', border: 'none', color: 'white', width: '6cqh', height: '6cqh', opacity: 0.9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <RotateCcw size="60%" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Right Group: Next / Finish */}
                            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <button
                                    onClick={() => onComplete({ paths, stamps, textValues, dragItems })}
                                    style={{
                                        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                        border: 'none',
                                        color: 'white',
                                        height: '6.5cqh',
                                        padding: '0 4cqw',
                                        borderRadius: '1.2cqh',
                                        fontWeight: 900,
                                        fontSize: isMobile ? '2cqh' : '2.2cqh',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '10cqw',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)',
                                        transition: '0.2s'
                                    }}
                                >
                                    {isLast ? 'FIN' : 'SIG'}
                                </button>
                            </div>
                        </div>

                        {/* Bottom Safe Area Padding (iPhone) */}
                        {isMobile && slide?.format !== '1/1' && (
                            <div style={{ height: 'env(safe-area-inset-bottom)', width: '100%', background: 'transparent' }} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
