import React, { useState, useEffect, useRef } from 'react';
import { User, Layers, Trash2, ChevronLeft, ChevronRight, Activity, Calendar, Clock, BarChart2 } from 'lucide-react';
import { dbService } from '../services/db';
import { useApp } from '../context/AppContext';
import { Header } from './common/Header';

export default function ResultadosView({ project, onBack }) {
    const { notify } = useApp();
    const [interactions, setInteractions] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [slides, setSlides] = useState([]);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [project.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const slideData = await dbService.getSlides(project.id);

            if (slideData) {
                setSlides(slideData);

                const slideIds = slideData.map(s => s.id);
                const interactionData = await dbService.getInteractions(slideIds);

                if (interactionData) {
                    setInteractions(interactionData);
                    const uniqueStudents = [...new Set(interactionData.map(i => i.alias))];
                    setStudents(uniqueStudents);
                    if (uniqueStudents.length > 0) setSelectedStudent(uniqueStudents[0]);
                }
            }
        } catch (err) {
            console.error('Error loading results:', err);
            notify.error('Error al cargar resultados');
        }
        setLoading(false);
    };

    const drawInteractions = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentSlideInteractions = interactions.filter(i =>
            i.alias === selectedStudent &&
            i.slide_id === slides[selectedSlideIndex]?.id
        );

        currentSlideInteractions.forEach(interaction => {
            // Dibujos
            if (interaction.drawings && Array.isArray(interaction.drawings)) {
                interaction.drawings.forEach(path => {
                    if (path.points && path.points.length > 0) {
                        ctx.beginPath();
                        ctx.strokeStyle = path.color || '#3b82f6';
                        ctx.lineWidth = path.width || 3;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        path.points.forEach((point, i) => {
                            if (i === 0) ctx.moveTo(point.x, point.y);
                            else ctx.lineTo(point.x, point.y);
                        });
                        ctx.stroke();
                    }
                });
            }

            // Sellos (stamps)
            if (interaction.stamps && Array.isArray(interaction.stamps)) {
                interaction.stamps.forEach(s => {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                    ctx.arc(s.x, s.y, 30, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 5;
                    ctx.stroke();
                });
            }
        });
    };

    useEffect(() => {
        if (selectedStudent && slides[selectedSlideIndex]) {
            drawInteractions();
        }
    }, [selectedStudent, selectedSlideIndex, interactions]);

    const handleDeleteAll = async () => {
        if (!confirm('¿Seguro que quieres borrar todos los resultados de este proyecto?')) return;
        setLoading(true);
        try {
            const slideIds = slides.map(s => s.id);
            await dbService.deleteInteractions(slideIds);
            setInteractions([]);
            setStudents([]);
            setSelectedStudent(null);
            notify.success('Resultados borrados');
        } catch (err) {
            notify.error('Error al borrar: ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <Header
                title={`Resultados: ${project.name}`}
                onBack={onBack}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, fontWeight: 700 }}>{students.length} Estudiantes</p>
                    <p style={{ fontSize: '0.7rem', color: '#a78bfa', margin: 0, fontWeight: 700 }}>{interactions.length} Interacciones</p>
                </div>
                <button
                    onClick={handleDeleteAll}
                    className="btn-outline"
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}
                >
                    <Trash2 size={18} /> Borrar Todo
                </button>
            </Header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Panel Alumnos */}
                <aside style={{ width: '350px', background: '#0a0a1a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Estudiantes ({students.length})</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {students.map(student => (
                            <button
                                key={student}
                                onClick={() => setSelectedStudent(student)}
                                style={{
                                    padding: '15px 20px',
                                    borderRadius: '15px',
                                    background: selectedStudent === student ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    border: `1px solid ${selectedStudent === student ? '#3b82f6' : 'transparent'}`,
                                    color: selectedStudent === student ? 'white' : '#94a3b8',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontWeight: selectedStudent === student ? 700 : 500
                                }}
                            >
                                <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={18} />
                                </div>
                                <span style={{ flex: 1 }}>{student}</span>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    {interactions.filter(i => i.alias === student).length} act.
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Visualizador */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', position: 'relative' }}>
                    {slides.length > 0 && (
                        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(15,15,30,0.8)', padding: '10px 20px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                            <button onClick={() => setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1))} disabled={selectedSlideIndex === 0} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: selectedSlideIndex === 0 ? 0.3 : 1 }}><ChevronLeft /></button>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a78bfa' }}>DIAPOSITIVA {selectedSlideIndex + 1} / {slides.length}</span>
                            <button onClick={() => setSelectedSlideIndex(Math.min(slides.length - 1, selectedSlideIndex + 1))} disabled={selectedSlideIndex === slides.length - 1} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: selectedSlideIndex === slides.length - 1 ? 0.3 : 1 }}><ChevronRight /></button>
                        </div>
                    )}

                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                        {slides[selectedSlideIndex] && (
                            <div style={{ position: 'relative', boxShadow: '0 0 100px rgba(0,0,0,0.8)', borderRadius: '10px', overflow: 'hidden' }}>
                                <img
                                    src={slides[selectedSlideIndex].image_url}
                                    style={{ width: '100%', maxWidth: '1000px', display: 'block' }}
                                    alt="Slide Background"
                                />
                                <canvas
                                    ref={canvasRef}
                                    width={slides[selectedSlideIndex].format === '1/1' ? 1080 : 1920}
                                    height={1080}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                                />
                            </div>
                        )}
                        {!selectedStudent && (
                            <div style={{ textAlign: 'center', color: '#64748b' }}>
                                <Activity size={60} style={{ marginBottom: '20px', opacity: 0.3 }} />
                                <p>Selecciona un alumno para ver sus trazos</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Estadísticas */}
                    <footer style={{ padding: '20px 40px', background: 'rgba(10,10,30,0.8)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <BarChart2 size={20} color="#a78bfa" />
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Vistas Diapositiva</span>
                                <p style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>{interactions.filter(i => i.slide_id === slides[selectedSlideIndex]?.id).length} interacciones</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Calendar size={20} color="#3b82f6" />
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Promedio por Alumno</span>
                                <p style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>{students.length > 0 ? (interactions.length / students.length).toFixed(1) : 0} acciones</p>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
