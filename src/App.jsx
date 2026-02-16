import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HomeView from './components/HomeView';
import SlideViewer from './components/GuiaPres';
import SlideEditor from './components/GuiaEditor';
import ResultadosView from './components/ResultadosView';
import QuizView from './components/QuizView';
import GaleriaView from './components/GaleriaView';
import { supabase } from './lib/supabase';
import confetti from 'canvas-confetti';

const PROJECT_ID = 'main-project';

export default function App() {
    const [view, setView] = useState('entry');
    const [role, setRole] = useState('student'); // student, teacher, admin
    const [alias, setAlias] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [slides, setSlides] = useState([]);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [lastView, setLastView] = useState('entry');
    const [cameFromGallery, setCameFromGallery] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [returnFromResults, setReturnFromResults] = useState(false);

    const [toast, setToast] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);

        const handleToast = (e) => {
            setToast(e.detail);
            setTimeout(() => setToast(null), 3000);
        };
        window.addEventListener('show-toast', handleToast);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('show-toast', handleToast);
        };
    }, []);

    // Preload Slide Assets
    useEffect(() => {
        if (slides.length > 0 && view === 'viewer') {
            const toPreload = [currentSlideIdx, currentSlideIdx + 1, currentSlideIdx + 2];
            toPreload.forEach(idx => {
                const s = slides[idx];
                if (s) {
                    if (s.image_url) { const img = new Image(); img.src = s.image_url; }
                    if (s.audio_url) { const audio = new Audio(); audio.src = s.audio_url; }
                }
            });
        }
    }, [currentSlideIdx, slides, view]);

    const loadProjectSlides = async (projectId) => {
        setLoading(true);
        try {
            const { data: slidesData } = await supabase
                .from('slides')
                .select('*')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (slidesData) {
                const processed = slidesData.map(s => {
                    const elements = s.elements || [];
                    const formatEl = elements.find(e => e.type === 'format_metadata');
                    return {
                        ...s,
                        format: formatEl ? formatEl.value : '16/9',
                        elements: elements.filter(e => e.type !== 'format_metadata')
                    };
                });
                setSlides(processed);
            }
        } catch (error) {
            console.error('Error loading project slides:', error);
        }
        setLoading(false);
    };

    const handleEnterAsStudent = async (userAlias, project) => {
        setRole('student');
        setAlias(userAlias);
        setSelectedProject(project);
        setIsActive(project.is_active);
        await loadProjectSlides(project.id);
        setCurrentSlideIdx(0);
        setView(project.id.startsWith('quiz-') ? 'quiz' : 'viewer');
    };

    const handleEnterAsTeacher = async (project) => {
        setRole('teacher');
        setAlias('Teacher');
        setSelectedProject(project);
        setIsActive(project.is_active);
        await loadProjectSlides(project.id);
        setCurrentSlideIdx(0);
        setView(project.id.startsWith('quiz-') ? 'quiz' : 'viewer');
    };

    const handleEnterAsAdmin = () => {
        setRole('admin');
        setView('gallery');
    };

    const toggleActive = async () => {
        if (!selectedProject) return;
        const newState = !isActive;
        try {
            await supabase
                .from('projects')
                .update({ is_active: newState })
                .eq('id', selectedProject.id);

            setIsActive(newState);
        } catch (error) {
            console.error('Error toggling status:', error);
            setIsActive(newState);
        }
    };

    const handleCompleteSlide = async (interactionData) => {
        // Teacher mode: Don't save to DB
        if (role !== 'teacher') {
            try {
                const currentSlide = slides[currentSlideIdx];
                const slideElementIds = currentSlide.elements.map(el => el.id);
                const filteredText = {};
                Object.entries(interactionData.textValues).forEach(([id, val]) => {
                    if (slideElementIds.includes(id)) filteredText[id] = val;
                });

                await supabase.from('interactions').insert({
                    slide_id: currentSlide.id,
                    alias: alias,
                    drawings: interactionData.paths || [],
                    stamps: interactionData.stamps || [],
                    text_responses: filteredText,
                    icon_positions: interactionData.dragItems?.map(d => ({
                        x: d.currentX, y: d.currentY, url: d.url
                    })) || []
                });
            } catch (err) {
                console.warn('Error saving interaction:', err);
            }
        }

        if (currentSlideIdx < slides.length - 1) {
            setCurrentSlideIdx(idx => idx + 1);
        } else {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            setView('results_success');
        }
    };

    if (loading && view !== 'editor') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Cargando Central TK...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            {view === 'entry' && (
                <HomeView
                    onEnter={handleEnterAsStudent}
                    onAdmin={handleEnterAsAdmin}
                    onTeacher={handleEnterAsTeacher}
                />
            )}

            {view === 'quiz' && (
                <QuizView
                    onExit={() => {
                        if (role === 'admin') {
                            setView('editor');
                            setSelectedProject(null);
                        } else {
                            window.location.href = 'https://central.institutotinykids.com/';
                        }
                        setReturnFromResults(false);
                    }}
                    isAdmin={role === 'admin'}
                    role={role}
                    project={selectedProject}
                    isActive={isActive}
                    onToggleActive={toggleActive}
                    onViewResults={() => setView('results')}
                    previewMode={previewMode}
                    onPreview={(p) => {
                        setLastView('quiz');
                        setCameFromGallery(false);
                        setSelectedProject(p);
                        setView('preview_quiz');
                        setPreviewMode(true);
                    }}
                />
            )}

            {(view === 'preview_quiz' || view === 'preview_viewer') && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#000' }}>
                    {view === 'preview_quiz' ? (
                        <QuizView
                            onExit={() => {
                                setView(lastView);
                                setPreviewMode(false);
                                if (lastView === 'editor' && cameFromGallery) {
                                    setSelectedProject(null);
                                }
                            }}
                            isAdmin={false}
                            role="student"
                            project={selectedProject}
                            isActive={true}
                            previewMode={true}
                            onToggleActive={() => { }}
                            onViewResults={() => { }}
                        />
                    ) : (
                        <SlideViewer
                            slide={slides[currentSlideIdx]}
                            alias="Preview User"
                            currentIndex={currentSlideIdx}
                            totalSlides={slides.length}
                            onComplete={() => {
                                if (currentSlideIdx < slides.length - 1) setCurrentSlideIdx(prev => prev + 1);
                                else {
                                    setView(lastView);
                                    setPreviewMode(false);
                                    if (lastView === 'editor' && cameFromGallery) setSelectedProject(null);
                                }
                            }}
                            onNext={() => { if (currentSlideIdx < slides.length - 1) setCurrentSlideIdx(prev => prev + 1); }}
                            onPrev={() => { if (currentSlideIdx > 0) setCurrentSlideIdx(prev => prev - 1); }}
                            isFirst={currentSlideIdx === 0}
                            isLast={currentSlideIdx === slides.length - 1}
                            role="student"
                            onHome={() => {
                                setView(lastView);
                                setPreviewMode(false);
                                if (lastView === 'editor' && cameFromGallery) setSelectedProject(null);
                            }}
                        />
                    )}
                    <button
                        onClick={() => {
                            setView(lastView);
                            setPreviewMode(false);
                            if (lastView === 'editor' && cameFromGallery) setSelectedProject(null);
                        }}
                        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10000, background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                    >
                        Salir Preview
                    </button>
                </div>
            )}

            {view === 'gallery' && (
                <GaleriaView
                    onOpenGuide={(p) => {
                        setSelectedProject(p);
                        setIsActive(p.is_active);
                        loadProjectSlides(p.id);
                        setView('editor');
                    }}
                    onOpenQuiz={(p) => {
                        setSelectedProject(p);
                        setIsActive(p.is_active);
                        setView('quiz');
                    }}
                    onExit={() => setView('entry')}
                    onPreview={(p, fromGallery = true) => {
                        setLastView('gallery');
                        setCameFromGallery(fromGallery);
                        setSelectedProject(p);
                        setIsActive(p.is_active);
                        if (p.id.startsWith('quiz-')) {
                            setView('preview_quiz');
                        } else {
                            loadProjectSlides(p.id).then(() => {
                                setView('preview_viewer');
                                setCurrentSlideIdx(0);
                            });
                        }
                        setPreviewMode(true);
                    }}
                />
            )}

            {view === 'editor' && (
                <SlideEditor
                    slides={slides}
                    isActive={isActive}
                    onSave={() => { }}
                    onExit={() => {
                        if (role === 'admin') {
                            setView('gallery');
                        } else {
                            setView('entry');
                        }
                    }}
                    onToggleActive={toggleActive}
                    onViewResults={() => {
                        setReturnFromResults(true);
                        setView('results');
                    }}
                    selectedProject={selectedProject}
                    onGoToGallery={() => setView('gallery')}
                    onPreview={(p) => {
                        setLastView('editor');
                        setCameFromGallery(false);
                        setView(p.id.startsWith('quiz-') ? 'preview_quiz' : 'preview_viewer');
                        setCurrentSlideIdx(0);
                        setPreviewMode(true);
                    }}
                />
            )}

            {view === 'results' && (
                <ResultadosView
                    project={selectedProject}
                    onBack={() => {
                        const nextView = (selectedProject && selectedProject.id.startsWith('quiz-')) ? 'quiz' : 'editor';
                        setView(nextView);
                    }}
                />
            )}

            {view === 'viewer' && (
                slides.length === 0 ? (
                    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-8">
                        <div className="entry-card shadow-2xl glass anim-up" style={{ padding: isMobile ? '20px' : '40px' }}>
                            <div className="responsive-grid">
                                <div className="responsive-header" style={{ textAlign: 'center', alignItems: 'center' }}>
                                    <div style={{ fontSize: '5rem', marginBottom: '10px' }}>📋</div>
                                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '10px' }}>Sin Contenido</h1>
                                </div>
                                <div className="responsive-content" style={{ textAlign: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
                                        El administrador aún no ha creado diapositivas para esta presentación.
                                    </p>
                                    <button
                                        onClick={() => window.location.href = 'https://central.institutotinykids.com/'}
                                        className="btn-premium"
                                        style={{ width: '100%', padding: '14px' }}
                                    >
                                        Volver al Inicio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <SlideViewer
                        key={currentSlideIdx}
                        slide={slides[currentSlideIdx]}
                        alias={alias}
                        role={role}
                        currentIndex={currentSlideIdx}
                        totalSlides={slides.length}
                        isFirst={currentSlideIdx === 0}
                        isLast={currentSlideIdx === slides.length - 1}
                        onNext={() => setCurrentSlideIdx(i => Math.min(i + 1, slides.length - 1))}
                        onPrev={() => setCurrentSlideIdx(i => Math.max(i - 1, 0))}
                        onComplete={handleCompleteSlide}
                    />
                )
            )}

            {view === 'results_success' && (
                <div style={{
                    height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'radial-gradient(circle at center, #1e1b4b, #050510)',
                    position: 'fixed', top: 0, left: 0, zIndex: 100
                }}>
                    <div className="entry-card glass anim-up" style={{
                        maxHeight: '90vh', padding: isMobile ? '25px 20px' : '50px 30px',
                        position: 'relative', zIndex: 110, background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px'
                    }}>
                        <div className="responsive-grid">
                            <div className="responsive-header" style={{ alignItems: 'center', textAlign: 'center' }}>
                                <div style={{ fontSize: isMobile ? '3.5rem' : '5rem' }}>🎉</div>
                                <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', marginBottom: '12px', lineHeight: 1.1 }}>
                                    {role === 'teacher' ? 'Lección Finalizada' : '¡Misión Cumplida!'}
                                </h1>
                                <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: '#a78bfa', fontWeight: 800 }}>
                                    {role === 'teacher' ? 'Buen trabajo moderando la clase' : `Excelente trabajo, ${alias}`}
                                </p>
                            </div>
                            <div className="responsive-content" style={{ alignItems: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                                    {role === 'teacher'
                                        ? 'Puedes reiniciar esta presentación o volver al inicio para seleccionar otro programa.'
                                        : 'Tus respuestas han sido registradas exitosamente en el sistema.'}
                                </p>
                                {role === 'teacher' ? (
                                    <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                        <button onClick={() => { setCurrentSlideIdx(0); setView('viewer'); }} className="btn-outline" style={{ flex: 1, padding: '14px' }}>Reiniciar</button>
                                        <button onClick={() => window.location.href = 'https://central.institutotinykids.com/'} className="btn-premium" style={{ flex: 1, padding: '14px' }}>Home</button>
                                    </div>
                                ) : (
                                    <button onClick={() => window.location.reload()} className="btn-premium" style={{ width: '100%', padding: '14px' }}>Finalizar Sesión</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
                            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 99999, padding: '12px 24px', borderRadius: '16px',
                            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                            color: 'white', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '12px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        {toast.type === 'error' ? '❌' : '✅'} {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
