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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
    const [stageDim, setStageDim] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const updateDim = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Breakpoints: Mobile < 768, Tablet 768-1023, Desktop >= 1024
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
            setIsLandscape(width > height);

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

        // Use dynamic canvas dimensions based on format
        const canvasWidth = slide?.format === '1/1' ? 1080 : 1920;
        const canvasHeight = 1080;

        const draggables = slide?.elements?.filter(e => e.type === 'drag').map(e => ({
            ...e,
            currentX: (e.x / 100) * canvasWidth,
            currentY: (e.y / 100) * canvasHeight
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
            // Use width-based scaling to maintain circular shape
            // The canvas is always 1920x1080 internally, but displayed at different aspect ratios
            // Using a radius relative to width ensures consistent circles
            const stampRadius = 30; // Fixed radius that looks good at 1920x1080 scale
            ctx.arc(s.x, s.y, stampRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 5;
            ctx.stroke();
        });
    }, [paths, stamps]);

    const getCoords = (e) => {
        const rect = stageRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Use dynamic canvas dimensions based on format
        const canvasWidth = slide?.format === '1/1' ? 1080 : 1920;
        const canvasHeight = 1080;

        return {
            x: ((clientX - rect.left) / rect.width) * canvasWidth,
            y: ((clientY - rect.top) / rect.height) * canvasHeight
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
            <main
                style={{
                    flex: 1,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0',
                    background: '#050510',
                    overflow: 'hidden'
                }}
                onClick={() => setActiveMenu('none')}
            >
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
                        {dragItems.map((item, idx) => {
                            // Use dynamic canvas width based on format
                            const canvasWidth = slide?.format === '1/1' ? 1080 : 1920;
                            const canvasHeight = 1080;
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${(item.currentX / canvasWidth) * 100}%`,
                                        top: `${(item.currentY / canvasHeight) * 100}%`,
                                        transform: 'translate(-50%, -50%)',
                                        cursor: tool === 'drag' ? 'grab' : 'default',
                                        pointerEvents: 'auto',
                                        touchAction: 'none',
                                        width: `${(item.imageSize || 100) / 100 * 7}cqw`,
                                        height: `${(item.imageSize || 100) / 100 * 7}cqw`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseDown={(e) => { if (tool === 'drag') setDraggingIdx(idx); }}
                                    onTouchStart={(e) => { if (tool === 'drag') setDraggingIdx(idx); }}
                                >
                                    {item.url ? (
                                        <img
                                            src={item.url}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#7c3aed', borderRadius: '16px', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Move color="white" size="50%" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <canvas
                        ref={canvasRef}
                        width={slide?.format === '1/1' ? 1080 : 1920}
                        height={1080}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 30, cursor: tool === 'draw' ? 'crosshair' : 'default', touchAction: 'none' }}
                        onMouseDown={handleStart}
                        onTouchStart={handleStart}
                    />

                    {/* IMMERSIVE CONTROL BAR - Unified style for all formats */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '100%',
                            height: 'auto',
                            // Adaptive min-height: taller in portrait, compact in landscape
                            minHeight: isMobile
                                ? (isLandscape ? 'max(44px, 10cqh)' : 'max(56px, 11cqh)')
                                : isTablet
                                    ? 'max(48px, 9cqh)'
                                    : '8cqh',
                            background: 'rgba(15, 15, 35, 0.98)',
                            backdropFilter: 'blur(30px)',
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 100,
                            borderRadius: 0,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            touchAction: 'auto',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                            overflow: 'visible'
                        }}
                    >
                        {/* Main Content Area */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '0 2cqw' : isTablet ? '0 2.5cqw' : '0 3cqw',
                            height: isMobile
                                ? (isLandscape ? 'max(42px, 9cqh)' : 'max(54px, 10cqh)')
                                : isTablet
                                    ? 'max(46px, 8cqh)'
                                    : '7cqh',
                            width: '100%'
                        }}>
                            {/* Left Group: Back + Audio + Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1.2cqw' : isTablet ? '1.8cqw' : '2.5cqw', flexShrink: 0 }}>
                                {/* 1. Botón Atrás */}
                                <button
                                    onClick={onPrev}
                                    disabled={isFirst}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        opacity: isFirst ? 0.2 : 0.9,
                                        width: isMobile ? (isLandscape ? 'max(26px, 4.5cqh)' : 'max(32px, 5.5cqh)') : isTablet ? 'max(30px, 5cqh)' : '5cqh',
                                        height: isMobile ? (isLandscape ? 'max(26px, 4.5cqh)' : 'max(32px, 5.5cqh)') : isTablet ? 'max(30px, 5cqh)' : '5cqh',
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
                                        style={{
                                            background: isPlaying ? 'rgba(124, 58, 237, 0.2)' : 'none',
                                            border: 'none',
                                            width: isMobile ? (isLandscape ? 'max(24px, 4cqh)' : 'max(30px, 5cqh)') : isTablet ? 'max(28px, 4.5cqh)' : '4.5cqh',
                                            height: isMobile ? (isLandscape ? 'max(24px, 4cqh)' : 'max(30px, 5cqh)') : isTablet ? 'max(28px, 4.5cqh)' : '4.5cqh',
                                            borderRadius: '50%',
                                            color: isPlaying ? '#a78bfa' : 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: '0.3s'
                                        }}
                                    >
                                        {isPlaying ? <Pause size="55%" /> : <Volume2 size="55%" />}
                                        <audio ref={audioRef} src={slide.audio_url} onEnded={() => setIsPlaying(false)} />
                                    </button>
                                )}

                                {/* 3. Info del Usuario */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginLeft: '0.3cqw' }}>
                                    <span style={{
                                        fontSize: isMobile
                                            ? (isLandscape ? 'max(11px, 1.8cqh)' : 'max(13px, 2.2cqh)')
                                            : isTablet ? 'max(12px, 2cqh)' : '2cqh',
                                        fontWeight: 900,
                                        color: 'white',
                                        lineHeight: 1
                                    }}>{alias}</span>
                                    <span style={{
                                        fontSize: isMobile
                                            ? (isLandscape ? 'max(8px, 1.1cqh)' : 'max(10px, 1.4cqh)')
                                            : isTablet ? 'max(9px, 1.3cqh)' : '1.4cqh',
                                        color: '#a78bfa',
                                        fontWeight: 700,
                                        opacity: 0.8
                                    }}>{currentIndex + 1}/{totalSlides}</span>
                                </div>
                            </div>

                            {/* Middle Group: Drawing Tools */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? (isLandscape ? '1.5cqw' : '2cqw') : isTablet ? '3cqw' : '4cqw' }}>
                                {tool === 'draw' && (
                                    <>
                                        {/* Undo */}
                                        <button onClick={undo} style={{
                                            background: 'none',
                                            border: 'none',
                                            width: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                            height: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                            color: 'white',
                                            opacity: 0.9,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}>
                                            <Undo2 size="60%" />
                                        </button>

                                        {/* Grosor (Settings) */}
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === 'width' ? 'none' : 'width')}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    width: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                    height: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                    color: activeMenu === 'width' ? '#a78bfa' : 'white',
                                                    opacity: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 300
                                                }}
                                            >
                                                <Settings2 size="60%" />
                                            </button>
                                            {activeMenu === 'width' && (
                                                <div
                                                    className="glass anim-up"
                                                    style={{ position: 'absolute', bottom: isMobile ? (isLandscape ? 'max(38px, 7cqh)' : 'max(48px, 9cqh)') : 'max(44px, 8cqh)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10, 10, 26, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', zIndex: 200, boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div style={{ height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: `${Math.max(3, lineWidth / 2.2)}px`, height: `${Math.max(3, lineWidth / 2.2)}px`, background: 'white', borderRadius: '50%' }} />
                                                        </div>
                                                        <input type="range" min="2" max="30" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} style={{ width: '70px', height: '6px', transform: 'rotate(-90deg)', accentColor: '#7c3aed', cursor: 'pointer', marginTop: '20px' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Color */}
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === 'color' ? 'none' : 'color')}
                                                style={{
                                                    width: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                    height: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                    borderRadius: '50%',
                                                    background: color,
                                                    border: activeMenu === 'color' ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                                                    cursor: 'pointer',
                                                    transition: '0.2s'
                                                }}
                                            />
                                            {activeMenu === 'color' && (
                                                <div className="glass anim-up" style={{ position: 'absolute', bottom: isMobile ? (isLandscape ? 'max(38px, 7cqh)' : 'max(48px, 9cqh)') : 'max(44px, 8cqh)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10, 10, 26, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', zIndex: 200, boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                                        {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff', '#000000'].map(c => (
                                                            <button key={c} onClick={() => { setColor(c); setActiveMenu('none'); }} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxShadow: color === c ? `0 0 15px ${c}` : 'none' }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reiniciar (Reset) */}
                                        <button
                                            onClick={() => { setPaths([]); setStamps([]); setTextValues({}); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                width: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                height: isMobile ? (isLandscape ? 'max(22px, 4cqh)' : 'max(28px, 5cqh)') : isTablet ? 'max(26px, 4.5cqh)' : '4.5cqh',
                                                opacity: 0.9,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <RotateCcw size="55%" />
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
                                        height: isMobile
                                            ? (isLandscape ? 'max(32px, 5cqh)' : 'max(38px, 6cqh)')
                                            : isTablet ? 'max(36px, 5.5cqh)' : '5.5cqh',
                                        padding: isMobile ? '0 2.5cqw' : isTablet ? '0 3cqw' : '0 3.5cqw',
                                        borderRadius: isMobile ? 'max(6px, 1cqh)' : '0.9cqh',
                                        fontWeight: 900,
                                        fontSize: isMobile
                                            ? (isLandscape ? 'max(10px, 1.6cqh)' : 'max(12px, 1.9cqh)')
                                            : isTablet ? 'max(11px, 1.7cqh)' : '1.8cqh',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: isMobile ? (isLandscape ? 'max(42px, 7cqw)' : 'max(50px, 9cqw)') : 'max(48px, 8cqw)',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)',
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
