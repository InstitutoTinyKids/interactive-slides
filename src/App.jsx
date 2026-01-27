import React, { useState, useEffect } from 'react';
import AliasEntry from './components/AliasEntry';
import SlideViewer from './components/SlideViewer';
import SlideEditor from './components/SlideEditor';
import ResultsViewer from './components/ResultsViewer';
import { supabase } from './lib/supabase';
import confetti from 'canvas-confetti';

const PROJECT_ID = 'main-project';

export default function App() {
    const [view, setView] = useState('entry');
    console.log('App Rendering, current view:', view);
    const [alias, setAlias] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [slides, setSlides] = useState([]);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
    const [loading, setLoading] = useState(true);

    // Load project data on mount
    useEffect(() => {
        loadProjectData();
    }, []);

    const loadProjectData = async () => {
        setLoading(true);
        try {
            // Get project status
            const { data: project } = await supabase
                .from('projects')
                .select('is_active')
                .eq('id', PROJECT_ID)
                .single();

            if (project) {
                setIsActive(project.is_active);
            } else {
                // Initial project creation
                await supabase
                    .from('projects')
                    .upsert({ id: PROJECT_ID, name: 'Clase Interactiva', is_active: false });
            }

            // Get slides
            const { data: slidesData } = await supabase
                .from('slides')
                .select('*')
                .eq('project_id', PROJECT_ID)
                .order('order_index', { ascending: true });

            if (slidesData) {
                setSlides(slidesData);
            }
        } catch (error) {
            console.error('Error loading project:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('slides_backup');
            if (saved) setSlides(JSON.parse(saved));
        }
        setLoading(false);
    };

    const handleSaveSlides = async (newSlides) => {
        setLoading(true);
        try {
            // Ensure project exists
            const { error: projectError } = await supabase
                .from('projects')
                .upsert({ id: PROJECT_ID, name: 'Clase Interactiva', is_active: isActive });

            if (projectError) throw new Error(`Error en proyecto: ${projectError.message}`);

            // Delete existing slides
            const { error: deleteError } = await supabase
                .from('slides')
                .delete()
                .eq('project_id', PROJECT_ID);

            if (deleteError) throw new Error(`Error al limpiar: ${deleteError.message}`);

            // Insert new slides
            const slidesToInsert = newSlides.map((slide, idx) => ({
                id: slide.id,
                project_id: PROJECT_ID,
                image_url: slide.image_url || null,
                audio_url: slide.audio_url || null,
                elements: slide.elements || [],
                order_index: idx
            }));

            if (slidesToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('slides')
                    .insert(slidesToInsert);

                if (insertError) throw new Error(`Error al insertar: ${insertError.message}`);
            }

            setSlides(newSlides);
            localStorage.setItem('slides_backup', JSON.stringify(newSlides));

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            alert('✅ Diapositivas guardadas en Supabase');
        } catch (error) {
            console.error('Error saving slides:', error);
            setSlides(newSlides);
            localStorage.setItem('slides_backup', JSON.stringify(newSlides));
            alert(`⚠️ Error de Supabase: ${error.message}\n(Se guardó localmente)`);
        }
        setLoading(false);
    };

    const toggleActive = async () => {
        const newState = !isActive;
        try {
            await supabase
                .from('projects')
                .update({ is_active: newState })
                .eq('id', PROJECT_ID);

            setIsActive(newState);
        } catch (error) {
            console.error('Error toggling status:', error);
            setIsActive(newState);
        }
    };

    const handleCompleteSlide = async (interactionData) => {
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
                    x: d.currentX,
                    y: d.currentY,
                    url: d.url
                })) || []
            });
        } catch (err) {
            console.warn('Error saving interaction:', err);
        }

        if (currentSlideIdx < slides.length - 1) {
            setCurrentSlideIdx(idx => idx + 1);
        } else {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            setView('results_success');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Cargando presentación...</p>
                </div>
            </div>
        );
    }

    if (view === 'entry') {
        return (
            <AliasEntry
                isActive={isActive}
                onEnter={(a) => {
                    setAlias(a);
                    setCurrentSlideIdx(0);
                    setView('viewer');
                }}
                onAdmin={() => setView('editor')}
            />
        );
    }

    if (view === 'editor') {
        return (
            <SlideEditor
                slides={slides}
                isActive={isActive}
                onSave={handleSaveSlides}
                onExit={() => {
                    loadProjectData();
                    setView('entry');
                }}
                onToggleActive={toggleActive}
                onViewResults={() => setView('results')}
            />
        );
    }

    if (view === 'results') {
        return (
            <ResultsViewer
                slides={slides}
                onExit={() => setView('editor')}
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
                            onClick={() => setView('entry')}
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
                    maxWidth: '500px',
                    maxHeight: '85vh',
                    padding: isMobile ? '30px 20px' : '50px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isMobile ? '15px' : '25px',
                    textAlign: 'center',
                    overflowY: 'auto'
                }}>
                    <div style={{ fontSize: isMobile ? '3.5rem' : '5rem' }}>🎉</div>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', marginBottom: '12px', lineHeight: 1.1 }}>¡Misión Cumplida!</h1>
                        <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: '#a78bfa', fontWeight: 800, marginBottom: '6px' }}>Excelente trabajo, {alias}</p>
                        <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>Tus respuestas han sido registradas exitosamente en el sistema.</p>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="btn-premium"
                        style={{ padding: isMobile ? '12px 30px' : '14px 40px', fontSize: isMobile ? '0.9rem' : '1rem', marginTop: '10px' }}
                    >
                        Finalizar Sesión
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
