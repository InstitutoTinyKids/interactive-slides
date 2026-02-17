import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Settings, Play, Clock, Check, X, HelpCircle, SkipForward,
  RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye,
  AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Pause, Key, Image as ImageIcon,
  Paintbrush, Type, Target, Layers, ZoomIn, ZoomOut, Music
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// --- DATOS INICIALES ---
const INITIAL_QUESTIONS = [];

export default function QuizView({ onExit, isAdmin = false, role = 'student', project, isActive, onToggleActive, onViewResults, previewMode = false, onPreview }) {
  // --- ESTADOS ---
  const isTeacher = role === 'teacher';
  // Si es admin, vamos directo al panel de edición. Si no, a jugar.
  const [view, setView] = useState(role === 'admin' && !previewMode ? 'admin' : 'playing');
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [selectedQIdx, setSelectedQIdx] = useState(0);
  const [projectLocal, setProjectLocal] = useState(project);

  // Estados del Admin
  const [isAdminAuth, setIsAdminAuth] = useState(role === 'admin');
  const [editingQ, setEditingQ] = useState(null); // Pregunta siendo editada/creada

  // Estados del Juego
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answersLog, setAnswersLog] = useState([]); // { qId, selected, correct, isSkipped }
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
  const [selectedOption, setSelectedOption] = useState(null);
  const [fullImage, setFullImage] = useState(null);

  // Estados de Ayudas
  const [hiddenOptions, setHiddenOptions] = useState([]); // Índices ocultos por 50/50

  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewModeLocal] = useState(project?.previewMode || false);
  const [localAccessCode, setLocalAccessCode] = useState(project?.access_code || '123');

  // Estados para edición del nombre del proyecto
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);

  const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
  const [hasUnsavedCodeChanges, setHasUnsavedCodeChanges] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1200);
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(window.innerWidth >= 1200);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  const timerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsCompact(width < 1200);
      setIsLandscape(width > window.innerHeight);
      if (width >= 1200) {
        setShowQuestionsPanel(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Iniciar juego automáticamente si estamos en modo playing
  useEffect(() => {
    if (view === 'playing') {
      setIsRunning(true);
    }
  }, [view]);

  // Video Range Loop Logic
  useEffect(() => {
    let interval;
    if (view === 'playing' && questions[currentQIndex]?.type === 'video' && questions[currentQIndex]?.videoEnd) {
      const start = questions[currentQIndex].videoStart || 0;
      const end = questions[currentQIndex].videoEnd;

      interval = setInterval(() => {
        const iframe = document.getElementById('quiz-video-player');
        if (iframe) {
          const msg = JSON.stringify({ event: 'listening', id: 1, channel: 'widget' });
          iframe.contentWindow.postMessage(msg, '*');
        }
      }, 500);

      const handleVideoMessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.event === 'infoDelivery' && data.info && data.info.currentTime) {
            if (data.info.currentTime >= end) {
              const iframe = document.getElementById('quiz-video-player');
              if (iframe) {
                const seekCmd = JSON.stringify({ event: 'command', func: 'seekTo', args: [Number(start), true] });
                iframe.contentWindow.postMessage(seekCmd, '*');
              }
            }
          }
        } catch (e) { }
      };
      window.addEventListener('message', handleVideoMessage);
      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleVideoMessage);
      };
    }
  }, [view, currentQIndex, questions]);

  // Sync project details when changed from parent
  useEffect(() => {
    if (project) {
      setProjectLocal(project);
      setLocalAccessCode(project.access_code);
    }
  }, [project]);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (project && project.id) {
      loadQuizData();
    }
  }, [project]);

  const loadQuizData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('questions')
        .eq('id', project.id)
        .single();

      if (data && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error("Error loading quiz data:", err);
    }
    setLoading(false);
  };

  const handleSaveQuiz = async (updatedQuestions, isSilent = false) => {
    if (!project || !project.id) return;
    if (!isSilent) setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          questions: updatedQuestions,
          name: projectLocal?.name,
          access_code: localAccessCode
        })
        .eq('id', project.id);

      if (error) throw error;
      setQuestions(updatedQuestions);
      if (!isSilent) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      return true;
    } catch (err) {
      if (!isSilent) alert('Error al guardar: ' + err.message);
      return false;
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (view !== 'admin' || !project?.id) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveQuiz(questions, true);
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [questions, projectLocal?.name, localAccessCode, view]);

  // --- LOGICA DEL CRONOMETRO ---
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // --- FUNCIONES DE NAVEGACION ---
  const restartApp = () => {
    setCurrentQIndex(0);
    setAnswersLog([]);
    setTimer(0);
    setFeedback(null);
    setSelectedOption(null);
    setHiddenOptions([]);
    setIsRunning(true);
    setShowReview(false);
    setView('playing');
  };

  // --- LOGICA DEL JUEGO ---
  const handleAnswer = (optionIndex) => {
    if (feedback !== null) return;

    const currentQ = questions[currentQIndex];
    const isCorrect = optionIndex === currentQ.correctAnswer;
    const isSkip = optionIndex === -1;

    setIsRunning(false);
    if (!isSkip) {
      setSelectedOption(optionIndex);
      setFeedback(isCorrect ? 'correct' : 'incorrect');
    }

    const logEntry = {
      question: currentQ,
      selected: optionIndex,
      isCorrect: isCorrect,
      isSkipped: isSkip
    };

    const proceed = async () => {
      if (!previewMode) {
        setAnswersLog(prev => [...prev, logEntry]);
      }
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setFeedback(null);
        setSelectedOption(null);
        setHiddenOptions([]);
        setIsRunning(true);
      } else {
        setView('results');
      }
    };

    if (isSkip) {
      proceed();
    } else {
      setTimeout(proceed, 1500);
    }
  };

  const handleFiftyFifty = () => {
    if (feedback !== null || hiddenOptions.length > 0) return;
    setTimer(prev => prev + 10);
    const currentQ = questions[currentQIndex];
    const wrongIndices = currentQ.options
      .map((_, idx) => idx)
      .filter(idx => idx !== currentQ.correctAnswer);
    const shuffledWrong = [...wrongIndices].sort(() => 0.5 - Math.random());
    setHiddenOptions(shuffledWrong.slice(0, 2));
  };

  const handlePass = () => {
    setTimer(prev => prev + 30);
    handleAnswer(-1);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading && questions.length === 0 && !isAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050510', color: 'white' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b' }}>Cargando Quiz...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (view === 'admin') {
    const currentEditingQ = editingQ || questions[selectedQIdx] || null;

    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#050510', overflow: 'hidden', flexDirection: 'column' }}>
        <header style={{
          height: (isMobile || isTablet) ? 'auto' : '75px',
          padding: (isMobile || isTablet) ? '15px' : '0 30px',
          display: 'flex',
          flexDirection: (isMobile || isTablet) ? 'column' : 'row',
          alignItems: (isMobile || isTablet) ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,10,25,0.9)',
          backdropFilter: 'blur(20px)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <button onClick={onExit} style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '15px', color: '#3b82f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutGrid size={24} /></button>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{projectLocal?.name || 'Cargando...'}</h2>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Editor Quiz</span>
            </div>
            {(isMobile || isTablet) && (
              <button
                onClick={() => setShowQuestionsPanel(!showQuestionsPanel)}
                style={{ padding: '10px', background: showQuestionsPanel ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '12px', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <Layers size={20} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: (isMobile || isTablet) ? '100%' : 'auto', justifyContent: (isMobile || isTablet) ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '14px', fontSize: '0.8rem', background: showSettingsPanel ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
            >
              <Settings size={18} /> {!(isMobile || isTablet) && 'Ajustes'}
            </button>
            <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '14px', fontSize: '0.8rem' }}>
              <Eye size={18} /> {!(isMobile || isTablet) && 'Resultados'}
            </button>
            <button onClick={async () => { const saved = await handleSaveQuiz(questions, false); if (saved && onPreview) onPreview(projectLocal); }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '14px', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }} disabled={loading}>
              <Play size={18} /> {!(isMobile || isCompact) && 'Preview'}
            </button>
            <button onClick={onToggleActive} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', background: isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isActive ? '#ef4444' : '#10b981', border: `1px solid ${isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
              {isActive ? <Pause size={18} /> : <Play size={18} />} {!(isMobile || isCompact) && (isActive ? 'Suspender' : 'Activar')}
            </button>
            <button onClick={() => handleSaveQuiz(questions)} className="btn-premium" style={{ padding: '10px 22px', borderRadius: '14px', fontSize: '0.8rem' }} disabled={loading}>
              <Save size={18} /> GUARDAR
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <aside style={{
            width: showQuestionsPanel ? (isMobile ? '100%' : '380px') : '0px',
            minWidth: showQuestionsPanel ? (isMobile ? '100%' : '380px') : '0px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background: '#0a0a1a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: (isMobile || isTablet) ? 'absolute' : 'relative',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 500,
            boxShadow: (isMobile || isTablet) && showQuestionsPanel ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
          }}>
            <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'white' }}>Preguntas</h3>
                <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{questions.length} preguntas creadas</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setEditingQ({ id: Date.now(), question: '', options: ['', '', '', ''], correctAnswer: 0, isNew: true }); if (isMobile || isTablet) setShowQuestionsPanel(false); }} style={{ background: '#7c3aed', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(124, 58, 237, 0.3)' }}><Plus size={20} /></button>
                {(isMobile || isTablet) && <button onClick={() => setShowQuestionsPanel(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((q, idx) => (
                <div key={q.id} onClick={() => { setSelectedQIdx(idx); setEditingQ(q); if (isMobile || isTablet) setShowQuestionsPanel(false); }} style={{ padding: '20px', borderRadius: '20px', border: `1px solid ${selectedQIdx === idx ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`, background: selectedQIdx === idx ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>#{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Edit2 size={16} style={{ color: '#64748b', opacity: 0.6 }} />
                      <Trash2 size={16} style={{ color: '#ef4444', opacity: 0.6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (window.confirm('¿ESTÁS SEGURO?')) { const updated = questions.filter((_, i) => i !== idx); setQuestions(updated); if (selectedQIdx >= updated.length) setSelectedQIdx(Math.max(0, updated.length - 1)); } }} />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: selectedQIdx === idx ? 'white' : '#94a3b8', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.question || "Sin enunciado..."}</p>
                </div>
              ))}
            </div>
          </aside>

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #0a0a1a, #050510)', overflowY: 'auto', padding: isMobile ? '20px' : '40px' }}>
            <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
              {currentEditingQ ? (
                <div className="glass" style={{ padding: isMobile ? '25px' : '40px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, color: 'white', marginBottom: '30px' }}>{currentEditingQ.isNew ? 'Nueva Pregunta' : 'Editar Pregunta'}</h2>
                  <AdminForm
                    initialData={currentEditingQ}
                    onSave={(q) => {
                      let newQuestions;
                      if (editingQ?.isNew) {
                        const { isNew, ...qData } = q;
                        newQuestions = [...questions, qData];
                      } else {
                        newQuestions = questions.map(item => item.id === q.id ? q : item);
                      }
                      setQuestions(newQuestions);
                      setEditingQ(null);
                    }}
                    onCancel={() => setEditingQ(null)}
                    isMobile={isMobile}
                  />
                </div>
              ) : (
                <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                  <HelpCircle size={80} color="white" strokeWidth={1} />
                  <p style={{ marginTop: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>Selecciona o crea una pregunta</p>
                </div>
              )}
            </div>
          </main>

          <aside style={{
            width: showSettingsPanel ? (isMobile ? '100%' : '350px') : '0px',
            minWidth: showSettingsPanel ? (isMobile ? '100%' : '350px') : '0px',
            background: '#0a0a1a',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: (isMobile || isTablet) ? 'absolute' : 'relative',
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 500,
            boxShadow: (isMobile || isTablet) && showSettingsPanel ? '-20px 0 50px rgba(0,0,0,0.5)' : 'none'
          }}>
            <div style={{ padding: '30px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Settings size={18} /> Ajustes</div>
                {(isMobile || isTablet) && <button onClick={() => setShowSettingsPanel(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Nombre</label>
                  <div style={{ position: 'relative' }}>
                    <input className="premium-input" value={projectLocal?.name || ''} readOnly={!isEditingProjectName} onChange={(e) => { setProjectLocal({ ...projectLocal, name: e.target.value }); setHasUnsavedNameChanges(true); }} />
                    <button onClick={async () => { if (isEditingProjectName && hasUnsavedNameChanges) { await supabase.from('projects').update({ name: projectLocal.name }).eq('id', project.id); setHasUnsavedNameChanges(false); } setIsEditingProjectName(!isEditingProjectName); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>{isEditingProjectName ? <Save size={18} /> : <Edit2 size={18} />}</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Clave Acceso</label>
                  <div style={{ position: 'relative' }}>
                    <input className="premium-input" value={localAccessCode} readOnly={!isEditingAccessCode} onChange={(e) => { setLocalAccessCode(e.target.value); setHasUnsavedCodeChanges(true); }} />
                    <button onClick={async () => { if (isEditingAccessCode && hasUnsavedCodeChanges) { await supabase.from('projects').update({ access_code: localAccessCode }).eq('id', project.id); setHasUnsavedCodeChanges(false); } setIsEditingAccessCode(!isEditingAccessCode); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>{isEditingAccessCode ? <Save size={18} /> : <Edit2 size={18} />}</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

    );
  }

  if (view === 'playing') {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return null;

    return (
      <div style={{ height: '100vh', width: '100vw', background: '#000', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px 25px', borderRadius: '100px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd' }}>Pregunta {currentQIndex + 1} / {questions.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 900 }}><Clock size={24} color="#3b82f6" /> {formatTime(timer)}</div>
        </div>

        <div style={{ flex: 1, width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: isLandscape ? 'row' : 'column', alignItems: 'center', gap: '40px', overflow: 'hidden', padding: '20px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', gap: '20px', minWidth: '40%' }}>
            <h2 style={{ fontSize: (currentQ.type === 'image' || currentQ.type === 'video') ? '1.5rem' : '2.5rem', fontWeight: 900 }}>{currentQ.question}</h2>
            {currentQ.type === 'image' && currentQ.mediaUrl && <img src={currentQ.mediaUrl} onClick={() => setFullImage(currentQ.mediaUrl)} style={{ width: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '15px' }} />}
            {currentQ.type === 'audio' && currentQ.mediaUrl && <audio controls src={currentQ.mediaUrl} style={{ width: '100%' }} />}
            {currentQ.type === 'video' && currentQ.mediaUrl && (
              <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '40vh', borderRadius: '15px', overflow: 'hidden' }}>
                {(() => {
                  const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${currentQ.videoStart || 0}${currentQ.videoEnd ? `&end=${currentQ.videoEnd}` : ''}&autoplay=1&enablejsapi=1`;
                  return <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="autoplay" allowFullScreen></iframe>;
                })()}
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: currentQ.options.length > 2 ? '1fr 1fr' : '1fr', gap: '15px', width: '100%' }}>
            {currentQ.options.map((opt, idx) => {
              if (hiddenOptions.includes(idx)) return <div key={idx} style={{ opacity: 0 }} />;
              let color = 'rgba(255,255,255,0.05)';
              let border = 'rgba(255,255,255,0.1)';
              if (feedback) {
                if (idx === currentQ.correctAnswer) { color = 'rgba(16, 185, 129, 0.2)'; border = '#10b981'; }
                else if (idx === selectedOption) { color = 'rgba(239, 68, 68, 0.2)'; border = '#ef4444'; }
              }
              return (
                <button key={idx} onClick={() => handleAnswer(idx)} disabled={feedback !== null} style={{ padding: '25px', borderRadius: '15px', background: color, border: `1px solid ${border}`, color: 'white', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: '0.2s', fontSize: '1.1rem', fontWeight: 700 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: feedback && idx === currentQ.correctAnswer ? '#10b981' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {feedback && idx === currentQ.correctAnswer ? <Check size={16} /> : (feedback && idx === selectedOption ? <X size={16} /> : String.fromCharCode(65 + idx))}
                  </div>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', margin: '20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleFiftyFifty} disabled={feedback || hiddenOptions.length > 0} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', border: '2px solid #3b82f6', color: '#3b82f6', fontWeight: 900, cursor: 'pointer', opacity: (feedback || hiddenOptions.length > 0) ? 0.3 : 1 }}>50:50</button>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#3b82f6', marginTop: '5px' }}>+10s</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handlePass} disabled={feedback} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.2)', border: '2px solid #7c3aed', color: '#a78bfa', cursor: 'pointer', opacity: feedback ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SkipForward size={24} /></button>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#a78bfa', marginTop: '5px' }}>Pasar (+30s)</p>
          </div>
        </div>

        <button onClick={() => { if (window.confirm('¿Cancelar juego?')) { onExit(); } }} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: 0.6 }}>Cancelar Juego</button>

        {fullImage && (
          <div onClick={() => setFullImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
            <img src={fullImage} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
            <X size={32} style={{ position: 'absolute', top: '20px', right: '20px', color: 'white' }} />
          </div>
        )}
      </div>
    );
  }

  if (view === 'results') {
    const correct = answersLog.filter(a => a.isCorrect).length;
    const incorrect = answersLog.filter(a => !a.isCorrect && !a.isSkipped).length;
    const skipped = answersLog.filter(a => a.isSkipped).length;

    return (
      <div style={{ height: '100vh', width: '100vw', background: '#050510', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass anim-up" style={{ padding: '40px', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏆</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px' }}>¡Juego Terminado!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Estadísticas de la partida</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{formatTime(timer)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Tiempo</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '15px', color: '#10b981' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{correct}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Correctas</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '15px', color: '#ef4444' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{incorrect}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Incorrectas</div>
            </div>
            <div style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '20px', borderRadius: '15px', color: '#a78bfa' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{skipped}</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Saltadas</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={restartApp} className="btn-premium" style={{ flex: 1 }}>Reiniciar</button>
            <button onClick={onExit} className="btn-outline" style={{ flex: 1 }}>Volver</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function AdminForm({ initialData, onSave, onCancel, isMobile }) {
  const [formData, setFormData] = useState({ question: '', type: 'text', mediaUrl: '', videoStart: 0, videoEnd: 0, options: ['', '', '', ''], correctAnswer: 0 });
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

  useEffect(() => { if (initialData) setFormData({ ...formData, ...initialData }); }, [initialData]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `quiz/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('media').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      setFormData({ ...formData, mediaUrl: publicUrl });
    } catch (error) { alert('Error: ' + error.message); }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await onSave(formData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
        {[{ id: 'text', label: 'Pregunta', Icon: HelpCircle, color: '#a78bfa' }, { id: 'audio', label: 'Audio', Icon: Music, color: '#3b82f6' }, { id: 'video', label: 'Video', Icon: Play, color: '#ef4444' }, { id: 'image', label: 'Imagen', Icon: ImageIcon, color: '#10b981' }].map(t => (
          <button key={t.id} type="button" onClick={() => setFormData({ ...formData, type: t.id })} style={{ padding: '12px', borderRadius: '12px', background: formData.type === t.id ? `${t.color}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${formData.type === t.id ? t.color : 'rgba(255,255,255,0.1)'}`, color: formData.type === t.id ? t.color : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}><t.Icon size={16} /> {t.label}</button>
        ))}
      </div>

      <textarea style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', padding: '15px', color: 'white', fontSize: '1rem', outline: 'none' }} placeholder="Escribe la pregunta..." value={formData.question} onChange={e => setFormData({ ...formData, question: e.target.value })} required />

      {(formData.type === 'audio' || formData.type === 'image') && (
        <label className="btn-outline" style={{ cursor: 'pointer', textAlign: 'center' }}>{uploading ? 'Subiendo...' : (formData.mediaUrl ? 'Cambiar Archivo' : 'Elegir Archivo')} <input type="file" hidden accept={formData.type === 'audio' ? 'audio/*' : 'image/*'} onChange={e => handleFileUpload(e, formData.type)} /></label>
      )}

      {formData.type === 'video' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input className="premium-input" placeholder="URL de Youtube" value={formData.mediaUrl} onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input className="premium-input" placeholder="Inicio (seg)" type="number" value={formData.videoStart} onChange={e => setFormData({ ...formData, videoStart: parseInt(e.target.value) || 0 })} />
            <input className="premium-input" placeholder="Fin (seg)" type="number" value={formData.videoEnd} onChange={e => setFormData({ ...formData, videoEnd: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
        {formData.options.map((opt, idx) => (
          <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${formData.correctAnswer === idx ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="radio" checked={formData.correctAnswer === idx} onChange={() => setFormData({ ...formData, correctAnswer: idx })} style={{ cursor: 'pointer' }} />
            <input style={{ background: 'none', border: 'none', color: 'white', width: '100%', outline: 'none' }} value={opt} onChange={e => { const copy = [...formData.options]; copy[idx] = e.target.value; setFormData({ ...formData, options: copy }); }} placeholder={`Opción ${idx + 1}`} required />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          type="submit"
          className="btn-premium"
          style={{
            flex: 1,
            background: saveStatus === 'saved' ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
            boxShadow: saveStatus === 'saved' ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : undefined
          }}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saved' ? <ShieldCheck size={20} /> : <Save size={20} />}
          {saveStatus === 'saving' ? 'GUARDANDO...' : (saveStatus === 'saved' ? '¡GUARDADO!' : 'GUARDAR')}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline" style={{ flex: 1 }}>CANCELAR</button>
      </div>
    </form>
  );
}
