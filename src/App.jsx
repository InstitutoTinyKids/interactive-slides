import React, { useState, useEffect } from 'react';
import AliasEntry from './components/AliasEntry';
import SlideViewer from './components/SlideViewer';
import SlideEditor from './components/SlideEditor';
import ResultsViewer from './components/ResultsViewer';
import QuizApp from './components/QuizApp';
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

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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
        setView('editor');
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

    if (view === 'entry') {
        return (
            <AliasEntry
                onEnter={handleEnterAsStudent}
                onAdmin={handleEnterAsAdmin}
                onTeacher={handleEnterAsTeacher}
            />
        );
    }

    if (view === 'quiz') {
        return <QuizApp
            onExit={() => {
                if (role === 'admin') {
                    setView('editor');
                    setSelectedProject(null);
                } else {
                    window.location.href = 'https://guias.institutotinykids.com/';
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
        />;
    }

    if (view === 'preview_quiz' || view === 'preview_viewer') {
        const isQuiz = view === 'preview_quiz';
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', background: '#000' }}>
                {isQuiz ? (
                    <QuizApp
                        onExit={() => {
                            setView(lastView);
                            setPreviewMode(false);
                            if (lastView === 'editor' && cameFromGallery) {
                                setSelectedProject(null); // Force gallery in SlideEditor
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
        );
    }

    if (view === 'editor') {
        return (
            <SlideEditor
                slides={slides}
                isActive={isActive}
                onSave={async (newSlides) => {
                    // This now needs to support multiple projects
                    // For now, it will use selectedProject.id or stay empty if not selected
                    if (!selectedProject) {
                        alert("Selecciona un proyecto primero en la Gallery");
                        return;
                    }
                    // Implementation below will be updated in SlideEditor to handle project selection
                }}
                onExit={() => {
                    if (role === 'admin') {
                        // If already in gallery, go to Tiny Kids Home
                        // SlideEditor manages its own internal 'showGallery' state.
                        // We pass a function that SlideEditor can call.
                        window.location.href = 'https://guias.institutotinykids.com/';
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
                returnFromResults={returnFromResults}
                onSelectProject={(p) => {
                    setSelectedProject(p);
                    setIsActive(p.is_active);
                    loadProjectSlides(p.id);
                    setReturnFromResults(false);
                }}
                onOpenQuiz={(p) => {
                    if (p) {
                        setSelectedProject(p);
                        setIsActive(p.is_active);
                    }
                    setView('quiz');
                }}
                onPreview={(p, fromGallery = false) => {
                    setLastView(view);
                    setCameFromGallery(fromGallery);
                    if (p) {
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
                    } else if (selectedProject) {
                        if (selectedProject.id.startsWith('quiz-')) {
                            setView('preview_quiz');
                        } else {
                            setView('preview_viewer');
                            setCurrentSlideIdx(0);
                        }
                    }
                    setPreviewMode(true);
                }}
            />
        );
    }

    if (view === 'results') {
        return (
            <ResultsViewer
                slides={slides}
                onExit={() => {
                    const nextView = (selectedProject && selectedProject.id.startsWith('quiz-')) ? 'quiz' : 'editor';
                    setView(nextView);
                }}
            />
        );
    }

    if (view === 'viewer') {
        if (slides.length === 0) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-[#050510] via-[#0a0a1a] to-[#050510] flex items-center justify-center text-white p-8">
                    <div className="text-center glass-panel p-16 max-w-2xl">
                        <div className="text-8xl mb-6">📋</div>
                        <h2 className="text-4xl font-black mb-4">Sin Contenido</h2>
                        <p className="text-slate-400 text-lg mb-8">
                            El administrador aún no ha creado diapositivas para esta presentación.
                        </p>
                        <button
                            onClick={() => window.location.href = 'https://guias.institutotinykids.com/'}
                            className="btn-primary px-10 py-4 text-lg"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <SlideViewer
                key={currentSlideIdx} // CRITICAL: Reset state on slide change
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
        );
    }

    if (view === 'results_success') {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, #1e1b4b, #050510)',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 100
            }}>
                {/* Background glow */}
                <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: '#4f46e5', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: '#10b981', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>

                <div className="glass anim-up" style={{
                    width: '90%',
                    maxWidth: '450px',
                    maxHeight: '90vh',
                    padding: isMobile ? '25px 20px' : '50px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '12px' : '25px',
                    textAlign: 'center',
                    overflowY: 'auto',
                    position: 'relative',
                    zIndex: 110,
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px'
                }}>
                    <div style={{ fontSize: isMobile ? '3.5rem' : '5rem' }}>🎉</div>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', marginBottom: '12px', lineHeight: 1.1 }}>
                            {role === 'teacher' ? 'Lección Finalizada' : '¡Misión Cumplida!'}
                        </h1>
                        <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: '#a78bfa', fontWeight: 800, marginBottom: '6px' }}>
                            {role === 'teacher' ? 'Buen trabajo moderando la clase' : `Excelente trabajo, ${alias}`}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                            {role === 'teacher'
                                ? 'Puedes reiniciar esta presentación o volver al inicio para seleccionar otro programa.'
                                : 'Tus respuestas han sido registradas exitosamente en el sistema.'}
                        </p>
                    </div>

                    {role === 'teacher' ? (
                        <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                            <button
                                onClick={() => { setCurrentSlideIdx(0); setView('viewer'); }}
                                className="btn-outline"
                                style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}
                            >
                                Reiniciar
                            </button>
                            <button
                                onClick={() => window.location.href = 'https://guias.institutotinykids.com/'}
                                className="btn-premium"
                                style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}
                            >
                                Home
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-premium"
                            style={{ padding: isMobile ? '12px 30px' : '14px 40px', fontSize: isMobile ? '0.9rem' : '1rem', marginTop: '10px' }}
                        >
                            Finalizar Sesión
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
