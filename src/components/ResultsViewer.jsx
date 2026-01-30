import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    ChevronLeft,
    User as UserIcon,
    Paintbrush,
    Target,
    MousePointer2,
    RefreshCw,
    Eye,
    Type,
    Trash2,
    Image as ImageIcon
} from 'lucide-react';

export default function ResultsViewer({ slides = [], onExit }) {
    const [interactions, setInteractions] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedSlideId, setSelectedSlideId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showStudentsPanel, setShowStudentsPanel] = useState(window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const canvasRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setShowStudentsPanel(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchInteractions = async () => {
        setLoading(true);
        try {
            const slideIds = slides.map(s => s.id);
            const { data, error } = await supabase
                .from('interactions')
                .select('*')
                .in('slide_id', slideIds)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setInteractions(data || []);
        } catch (err) {
            console.error('Error fetching interactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInteractions();
    }, []);

    const handleDeleteAll = async () => {
        if (!confirm('¿ESTÁS SEGURO? Se eliminarán todos los resultados de todos los estudiantes permanentemente.')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('interactions')
                .delete()
                .neq('alias', '_nothing_'); // Using alias as it exists in the table

            if (error) throw error;

            setInteractions([]);
            setSelectedUser(null);
            setSelectedSlideId(null);
            alert('Todos los resultados han sido eliminados correctamente.');
        } catch (err) {
            console.error('Error deleting interactions:', err);
            alert('Error al eliminar datos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const drawUserResult = (interaction) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!interaction) return;

        const paths = interaction.drawings || [];
        paths.forEach(path => {
            ctx.beginPath();
            ctx.strokeStyle = path.color || '#fff';
            ctx.lineWidth = path.width || 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            (path.points || []).forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });

        const stamps = interaction.stamps || [];
        stamps.forEach(s => {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.arc(s.x, s.y, 20, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    useEffect(() => {
        if (selectedSlideId && selectedUser) {
            const interaction = interactions.find(it => it.alias === selectedUser && it.slide_id === selectedSlideId);
            const timer = setTimeout(() => drawUserResult(interaction), 100);
            return () => clearTimeout(timer);
        }
    }, [selectedSlideId, selectedUser, interactions]);

    const userGroups = interactions.reduce((acc, item) => {
        if (!item.alias) return acc;
        if (!acc[item.alias]) acc[item.alias] = [];
        acc[item.alias].push(item);
        return acc;
    }, {});

    const selectedInteraction = interactions.find(it => it.alias === selectedUser && it.slide_id === selectedSlideId);

    if (loading && interactions.length === 0) {
        return (
            <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '15px' }} />
                    <p>Sincronizando resultados...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'auto', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
            {/* Header */}
            <header style={{ height: '70px', padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={onExit} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronLeft /></button>
                    {isMobile && (
                        <button
                            onClick={() => setShowStudentsPanel(!showStudentsPanel)}
                            style={{ background: showStudentsPanel ? 'rgba(124, 58, 237, 0.2)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px', color: showStudentsPanel ? '#a78bfa' : '#94a3b8', cursor: 'pointer' }}
                        >
                            <UserIcon size={18} />
                        </button>
                    )}
                    <h2 style={{ fontSize: '1.25rem', color: 'white' }}>Resultados</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleDeleteAll} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <Trash2 size={18} />
                        Borrar
                    </button>
                    <button onClick={fetchInteractions} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Users Sidebar */}
                {showStudentsPanel && (
                    <aside style={{ width: isMobile ? '100%' : '280px', background: '#0a0a1a', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '40vh' : 'auto', overflowY: 'auto' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>ESTUDIANTES</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.keys(userGroups).sort().map((alias) => (
                                <button
                                    key={alias}
                                    onClick={() => { setSelectedUser(alias); setSelectedSlideId(null); }}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        background: selectedUser === alias ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                        border: `1px solid ${selectedUser === alias ? '#7c3aed' : 'rgba(255,255,255,0.05)'}`,
                                        color: 'white',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: '0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserIcon size={14} /></div>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alias}</span>
                                    </div>
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '100px' }}>{userGroups[alias].length}</span>
                                </button>
                            ))}
                        </div>
                    </aside>
                )}

                {/* Main Results Display */}
                <main style={{ flex: 1, padding: '30px', background: 'radial-gradient(circle at center, #0f0f2d, #050510)', overflowY: 'auto' }}>
                    {selectedUser ? (
                        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Resultados de <span style={{ color: '#a78bfa' }}>{selectedUser}</span></h2>
                                <p style={{ color: '#94a3b8' }}>Explora todas las láminas en orden de presentación</p>
                            </div>

                            {/* Slides Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                                {slides.map((s, idx) => {
                                    const interaction = interactions.find(it => it.alias === selectedUser && it.slide_id === s.id);
                                    const isSelected = selectedSlideId === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedSlideId(s.id)}
                                            style={{
                                                background: isSelected ? '#1e1e30' : '#111',
                                                padding: '10px',
                                                borderRadius: '16px',
                                                border: `2px solid ${isSelected ? '#7c3aed' : 'transparent'}`,
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                aspectRatio: s.format === '1/1' ? '1/1' : '16/9',
                                                background: '#000',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                marginBottom: '8px',
                                                opacity: interaction ? 1 : 0.4,
                                                width: '100%'
                                            }}>
                                                {s.image_url ? <img src={s.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} opacity={0.1} /></div>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: interaction ? '#fff' : '#64748b' }}>LÁMINA {idx + 1}</span>
                                                {interaction && <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Detail View */}
                            {selectedSlideId && (
                                <div className="glass anim-up" style={{ padding: '25px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: slides.find(s => s.id === selectedSlideId)?.format === '1/1' ? '600px' : '100%',
                                        margin: '0 auto',
                                        aspectRatio: slides.find(s => s.id === selectedSlideId)?.format === '1/1' ? '1/1' : '16/9',
                                        background: '#000',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {slides.find(s => s.id === selectedSlideId)?.image_url && (
                                            <img src={slides.find(s => s.id === selectedSlideId).image_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                                        )}
                                        <canvas ref={canvasRef} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }} />

                                        {selectedInteraction?.icon_positions?.map((pos, i) => (
                                            <div key={i} style={{ position: 'absolute', left: `${(pos.x / 1920) * 100}%`, top: `${(pos.y / 1080) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 20, padding: '4px', background: 'rgba(59, 130, 246, 0.1)', border: '2px solid #3b82f6', borderRadius: '8px' }}>
                                                {pos.url && <img src={pos.url} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                        {[
                                            { label: 'Trazos', val: selectedInteraction?.drawings?.length || 0, color: '#a78bfa', icon: Paintbrush },
                                            { label: 'Marcas', val: selectedInteraction?.stamps?.length || 0, color: '#ef4444', icon: Target },
                                            { label: 'Objetos', val: selectedInteraction?.icon_positions?.length || 0, color: '#3b82f6', icon: MousePointer2 },
                                            { label: 'Textos', val: Object.keys(selectedInteraction?.text_responses || {}).length, color: '#10b981', icon: Type }
                                        ].map(item => (
                                            <div key={item.label} style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: item.color, marginBottom: '6px' }}><item.icon size={14} /><span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>{item.label}</span></div>
                                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{item.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Text Responses */}
                                    {selectedInteraction?.text_responses && Object.keys(selectedInteraction.text_responses).length > 0 && (
                                        <div style={{ background: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                                            <h3 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px' }}>Respuestas del Estudiante</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                {Object.entries(selectedInteraction.text_responses).map(([id, val]) => (
                                                    <div key={id} style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                                                        <p style={{ color: '#0f172a', whiteSpace: 'pre-wrap', fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5 }}>
                                                            {val}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                            <UserIcon size={64} color="white" />
                            <p style={{ marginTop: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', color: 'white' }}>Selecciona un estudiante para comenzar</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
