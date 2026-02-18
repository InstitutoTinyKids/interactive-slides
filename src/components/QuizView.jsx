import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Play, Clock, Check, X, HelpCircle, SkipForward,
  RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye,
  AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Pause, Key, Image as ImageIcon,
  Paintbrush, Type, Target, Layers, ZoomIn, ZoomOut, Music, ShieldCheck, ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Header } from './common/Header';
import { Sidebar } from './common/Sidebar';
import { SmartImage } from './common/SmartImage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { dbService } from '../services/db';
import { useApp } from '../context/AppContext';
import { validateProject } from '../utils/helpers';

// --- DATOS INICIALES ---
const INITIAL_QUESTIONS = [];

export default function QuizView({ onExit, isAdmin = false, role = 'student', project, isActive, onToggleActive, onViewResults, previewMode = false, onPreview }) {
  // --- ESTADOS ---
  const { isMobile: appIsMobile, notify } = useApp();
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
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth <= 1024);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saved
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
      setIsTablet(width >= 768 && width <= 1024);
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

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'ctrl+s': () => handleSaveQuiz(questions),
    'ctrl+p': () => onPreview(projectLocal, true),
    'escape': () => {
      setShowQuestionsPanel(isMobile ? false : window.innerWidth >= 1200);
      setShowSettingsPanel(false);
    }
  });

  const loadQuizData = async () => {
    setLoading(true);
    try {
      const projects = await dbService.getProjects();
      const current = projects.find(p => p.id === project.id);
      if (current && Array.isArray(current.questions)) {
        setQuestions(current.questions);
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

    // Validation
    const validation = validateProject({ ...projectLocal, questions: updatedQuestions });
    if (!validation.valid) {
      if (!isSilent) notify.error(validation.message);
      return false;
    }

    if (!isSilent) setLoading(true);
    try {
      await dbService.updateProject(project.id, {
        questions: updatedQuestions,
        name: projectLocal?.name,
        access_code: localAccessCode
      });

      setQuestions(updatedQuestions);
      if (!isSilent) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        notify.success('¡Quiz guardado con éxito!');
      }
      return true;
    } catch (err) {
      if (!isSilent) notify.error('Error al guardar: ' + err.message);
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
        <Header
          title={projectLocal?.name}
          onBack={onExit}
        >
          {isCompact && (
            <button
              onClick={() => setShowQuestionsPanel(!showQuestionsPanel)}
              className="btn-outline"
              style={{
                padding: '10px',
                background: showQuestionsPanel ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Lista de Preguntas"
            >
              <Layers size={18} />
            </button>
          )}

          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className="btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              borderRadius: '12px',
              background: showSettingsPanel ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            title="Ajustes"
          >
            <Settings size={18} />
          </button>

          <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} title="Resultados">
            <Eye size={18} />
          </button>

          <button
            onClick={async () => {
              const saved = await handleSaveQuiz(questions, false);
              if (saved && onPreview) onPreview(projectLocal);
            }}
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 700 }}
            disabled={loading}
          >
            <Play size={16} /> {!isMobile && 'Preview'}
          </button>

          <button
            onClick={onToggleActive}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isActive ? '#ef4444' : '#10b981', border: `1px solid ${isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}` }}
          >
            {isActive ? <Pause size={16} /> : <Play size={16} />} {!isMobile && (isActive ? 'Suspender' : 'Activar')}
          </button>

          <button
            onClick={() => handleSaveQuiz(questions)}
            className={saveStatus === 'saved' ? 'btn-success' : 'btn-premium'}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 900,
              background: saveStatus === 'saved' ? '#10b981' : undefined,
              color: saveStatus === 'saved' ? 'white' : undefined
            }}
            disabled={loading || saveStatus === 'saved'}
          >
            {saveStatus === 'saved' ? (
              <><ShieldCheck size={16} /> ¡GUARDADO!</>
            ) : (
              <><Save size={16} /> GUARDAR</>
            )}
          </button>
        </Header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <Sidebar
            isOpen={showQuestionsPanel}
            onClose={() => setShowQuestionsPanel(false)}
            title="PREGUNTAS"
            side="left"
            width="380px"
            isMobile={appIsMobile || isTablet}
            hideClose={!isCompact}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={() => {
                  setEditingQ({ id: Date.now(), question: '', options: ['', ''], correctAnswer: 0, isNew: true });
                  if (appIsMobile || isTablet) setShowQuestionsPanel(false);
                }}
                className="btn-premium"
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Plus size={20} /> Nueva
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => { setSelectedQIdx(idx); setEditingQ(q); if (appIsMobile || isTablet) setShowQuestionsPanel(false); }}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    border: `1px solid ${selectedQIdx === idx ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                    background: selectedQIdx === idx ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>#{idx + 1}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Edit2 size={16} style={{ color: '#64748b', opacity: 0.6 }} />
                      <Trash2
                        size={16}
                        style={{ color: '#ef4444', opacity: 0.6, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('¿ESTÁS SEGURO?')) {
                            const updated = questions.filter((_, i) => i !== idx);
                            setQuestions(updated);
                            if (selectedQIdx >= updated.length) setSelectedQIdx(Math.max(0, updated.length - 1));
                            notify.success('Pregunta eliminada');
                          }
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: selectedQIdx === idx ? 'white' : '#94a3b8', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.question || "Sin enunciado..."}</p>
                </div>
              ))}
            </div>
          </Sidebar>

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #0a0a1a, #050510)', overflowY: 'auto', padding: isMobile ? '20px' : '40px' }}>
            <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
              {currentEditingQ ? (
                <div className="glass" style={{ padding: isMobile ? '25px' : '40px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, color: 'white', marginBottom: '30px' }}>
                    {currentEditingQ.isNew ? 'Nueva Pregunta' : `Editar Pregunta #${selectedQIdx + 1}`}
                  </h2>
                  <AdminForm
                    initialData={currentEditingQ}
                    onSave={(q) => {
                      let newQuestions;
                      if (q.isNew) {
                        const { isNew, ...qData } = q;
                        newQuestions = [...questions, qData];
                        setQuestions(newQuestions);
                        // Cuando es nueva, la cerramos para volver a la lista
                        setTimeout(() => setEditingQ(null), 1000);
                      } else {
                        newQuestions = questions.map(item => item.id === q.id ? q : item);
                        setQuestions(newQuestions);
                        // Si es edición, NO cerramos para que vea el "¡GUARDADO!" en el botón
                      }
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

          <Sidebar
            isOpen={showSettingsPanel}
            onClose={() => setShowSettingsPanel(false)}
            title="AJUSTES"
            width="350px"
            isMobile={appIsMobile || isTablet}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Nombre</label>
                  <div style={{ position: 'relative' }}>
                    <input className="premium-input" value={projectLocal?.name || ''} readOnly={!isEditingProjectName} onChange={(e) => { setProjectLocal({ ...projectLocal, name: e.target.value }); setHasUnsavedNameChanges(true); }} />
                    <button onClick={async () => { if (isEditingProjectName && hasUnsavedNameChanges) { await dbService.updateProject(project.id, { name: projectLocal.name }); setHasUnsavedNameChanges(false); notify.success('Nombre actualizado'); } setIsEditingProjectName(!isEditingProjectName); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>{isEditingProjectName ? <Save size={18} /> : <Edit2 size={18} />}</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Clave Acceso</label>
                  <div style={{ position: 'relative' }}>
                    <input className="premium-input" value={localAccessCode} readOnly={!isEditingAccessCode} onChange={(e) => { setLocalAccessCode(e.target.value); setHasUnsavedCodeChanges(true); }} />
                    <button onClick={async () => { if (isEditingAccessCode && hasUnsavedCodeChanges) { await dbService.updateProject(project.id, { access_code: localAccessCode }); setHasUnsavedCodeChanges(false); notify.success('Clave actualizada'); } setIsEditingAccessCode(!isEditingAccessCode); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>{isEditingAccessCode ? <Save size={18} /> : <Edit2 size={18} />}</button>
                  </div>
                </div>
              </div>
            </div>
          </Sidebar>
        </div>
      </div>

    );
  }

  if (view === 'playing') {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return null;

    const isTextQ = currentQ.type === 'text';
    const LETTER_COLORS = ['#a78bfa', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

    // Texto → siempre 1 columna (textos largos necesitan todo el ancho)
    // Media → 2 columnas en pantallas grandes (opciones son cortas)
    const optCols = isTextQ
      ? '1fr'
      : isMobile
        ? '1fr'
        : currentQ.options.length <= 2 ? '1fr' : '1fr 1fr';

    // En móvil landscape el contenido puede no caber → permitir scroll
    const mobileScroll = isMobile && isLandscape;

    return (
      <div style={{ height: '100vh', width: '100vw', background: '#000', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '10px 12px' : '20px', position: 'relative', overflowY: mobileScroll ? 'auto' : 'hidden', overflowX: 'hidden' }}>

        {/* ── BARRA SUPERIOR ── */}
        <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? (isLandscape ? '8px' : '14px') : '16px', flexShrink: 0 }}>
          <div style={{ background: 'rgba(59,130,246,0.15)', padding: isMobile ? '6px 14px' : '10px 25px', borderRadius: '100px', border: '1px solid rgba(59,130,246,0.3)', fontSize: isMobile ? '0.72rem' : '0.9rem', fontWeight: 700, color: '#93c5fd' }}>
            Pregunta {currentQIndex + 1} / {questions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '1rem' : '1.4rem', fontWeight: 900 }}>
            <Clock size={isMobile ? 16 : 24} color="#3b82f6" /> {formatTime(timer)}
          </div>
        </div>

        {/* ── CUERPO PRINCIPAL ── */}
        <div style={{
          flex: mobileScroll ? '0 0 auto' : 1,
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          // Solo desktop no-móvil en landscape → lado a lado para texto
          flexDirection: isTextQ && isLandscape && !isMobile && !isTablet ? 'row' : 'column',
          alignItems: 'center',
          // Portrait: distribuir uniformemente pregunta + opciones
          justifyContent: !isLandscape && !mobileScroll ? 'space-evenly' : 'flex-start',
          gap: isMobile ? (isLandscape ? '8px' : '14px') : '24px',
          overflow: mobileScroll ? 'visible' : 'hidden',
          minHeight: mobileScroll ? 'auto' : 0,
          paddingBottom: mobileScroll ? '8px' : 0,
        }}>

          {/* ── PREGUNTA + MEDIA ── */}
          <div style={{
            flex: isTextQ && isLandscape && !isMobile && !isTablet ? '0 0 40%' : '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: isMobile && isLandscape ? '6px' : '12px',
            width: '100%',
          }}>
            <h2 style={{
              fontSize: isTextQ
                ? (isMobile ? (isLandscape ? '1rem' : '1.2rem') : isTablet ? '1.6rem' : '2rem')
                : (isMobile ? (isLandscape ? '0.85rem' : '1rem') : '1.3rem'),
              fontWeight: 900,
              lineHeight: 1.3,
              margin: 0,
            }}>
              {currentQ.question}
            </h2>

            {currentQ.type === 'image' && currentQ.mediaUrl && (
              <img src={currentQ.mediaUrl} onClick={() => setFullImage(currentQ.mediaUrl)}
                style={{ width: '100%', maxHeight: isMobile ? '26vh' : '36vh', objectFit: 'contain', borderRadius: '15px', cursor: 'zoom-in' }} />
            )}
            {currentQ.type === 'audio' && currentQ.mediaUrl && (
              <audio controls src={currentQ.mediaUrl} style={{ width: '100%' }} />
            )}
            {currentQ.type === 'video' && currentQ.mediaUrl && (
              <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: isMobile ? '26vh' : '36vh', borderRadius: '15px', overflow: 'hidden', flexShrink: 0 }}>
                {(() => {
                  const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${currentQ.videoStart || 0}${currentQ.videoEnd ? `&end=${currentQ.videoEnd}` : ''}&autoplay=1&enablejsapi=1`;
                  return <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="autoplay" allowFullScreen></iframe>;
                })()}
              </div>
            )}
          </div>

          {/* ── OPCIONES ── */}
          <div style={{
            flex: mobileScroll ? '0 0 auto' : 1,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: optCols,
            gap: isTextQ
              ? (isMobile ? (isLandscape ? '6px' : '8px') : '14px')
              : (isMobile ? '6px' : '10px'),
            alignContent: 'center',
            minHeight: mobileScroll ? 'auto' : 0,
            overflowY: mobileScroll ? 'visible' : 'auto',
          }}>
            {currentQ.options.map((opt, idx) => {
              if (hiddenOptions.includes(idx)) {
                return <div key={idx} style={{ opacity: 0, minHeight: isTextQ ? (isMobile ? (isLandscape ? '52px' : '64px') : '100px') : '40px' }} />;
              }

              const isCorrectOpt = !!feedback && idx === currentQ.correctAnswer;
              const isWrongOpt = !!feedback && idx === selectedOption && idx !== currentQ.correctAnswer;
              const letterColor = LETTER_COLORS[idx] || '#a78bfa';

              let bgColor = 'rgba(255,255,255,0.04)';
              let borderColor = 'rgba(255,255,255,0.1)';
              let glowStyle = {};
              if (isCorrectOpt) { bgColor = 'rgba(16,185,129,0.18)'; borderColor = '#10b981'; glowStyle = { boxShadow: '0 0 22px rgba(16,185,129,0.4)' }; }
              else if (isWrongOpt) { bgColor = 'rgba(239,68,68,0.18)'; borderColor = '#ef4444'; glowStyle = { boxShadow: '0 0 22px rgba(239,68,68,0.4)' }; }

              if (isTextQ) {
                /* ── TARJETA GRANDE: solo preguntas de texto ── */
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={feedback !== null}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? (isLandscape ? '4px' : '7px') : '11px',
                      padding: isMobile ? (isLandscape ? '8px 10px' : '12px 10px') : isTablet ? '18px 14px' : '22px 18px',
                      minHeight: isMobile ? (isLandscape ? '52px' : '72px') : isTablet ? '100px' : '115px',
                      borderRadius: '20px',
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      color: 'white',
                      cursor: feedback !== null ? 'default' : 'pointer',
                      transition: 'all 0.22s ease',
                      textAlign: 'center',
                      ...glowStyle,
                    }}
                    onMouseEnter={e => {
                      if (!feedback) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                        e.currentTarget.style.borderColor = letterColor;
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!feedback) {
                        e.currentTarget.style.background = bgColor;
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = glowStyle.boxShadow || 'none';
                      }
                    }}
                  >
                    {/* Badge letra */}
                    <div style={{
                      width: isMobile ? (isLandscape ? '24px' : '28px') : '38px',
                      height: isMobile ? (isLandscape ? '24px' : '28px') : '38px',
                      borderRadius: '8px',
                      background: isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : `${letterColor}22`,
                      border: `2px solid ${isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : letterColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      color: isCorrectOpt || isWrongOpt ? 'white' : letterColor,
                      fontWeight: 900,
                      fontSize: isMobile ? '0.72rem' : '1rem',
                    }}>
                      {isCorrectOpt ? <Check size={isMobile ? 14 : 18} /> : isWrongOpt ? <X size={isMobile ? 14 : 18} /> : String.fromCharCode(65 + idx)}
                    </div>
                    {/* Texto opción */}
                    <span style={{
                      fontSize: isMobile ? (isLandscape ? '0.72rem' : '0.78rem') : isTablet ? '0.9rem' : '1rem',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}>
                      {opt}
                    </span>
                  </button>
                );
              } else {
                /* ── FILA COMPACTA: imagen / audio / video ── */
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={feedback !== null}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: isMobile ? '10px 14px' : '13px 18px',
                      borderRadius: '14px',
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      color: 'white',
                      cursor: feedback !== null ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      ...glowStyle,
                    }}
                    onMouseEnter={e => { if (!feedback) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = letterColor; } }}
                    onMouseLeave={e => { if (!feedback) { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor; } }}
                  >
                    <div style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '8px', flexShrink: 0,
                      background: isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : `${letterColor}22`,
                      border: `1px solid ${isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : letterColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '0.85rem',
                      color: isCorrectOpt || isWrongOpt ? 'white' : letterColor,
                    }}>
                      {isCorrectOpt ? <Check size={14} /> : isWrongOpt ? <X size={14} /> : String.fromCharCode(65 + idx)}
                    </div>
                    <span style={{
                      fontSize: isMobile ? '0.8rem' : '0.95rem',
                      fontWeight: 700,
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}>
                      {opt}
                    </span>
                  </button>
                );
              }
            })}
          </div>
        </div>

        {/* ── AYUDAS ── */}
        <div style={{ display: 'flex', gap: '30px', margin: isMobile ? '10px 0 4px' : '16px 0 6px', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handleFiftyFifty} disabled={feedback || hiddenOptions.length > 0}
              style={{ width: isMobile ? '56px' : '70px', height: isMobile ? '56px' : '70px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '2px solid #3b82f6', color: '#3b82f6', fontWeight: 900, cursor: 'pointer', opacity: (feedback || hiddenOptions.length > 0) ? 0.3 : 1, fontSize: isMobile ? '0.75rem' : '1rem' }}>50:50</button>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>+10s</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={handlePass} disabled={feedback}
              style={{ width: isMobile ? '56px' : '70px', height: isMobile ? '56px' : '70px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '2px solid #7c3aed', color: '#a78bfa', cursor: 'pointer', opacity: feedback ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkipForward size={isMobile ? 20 : 24} />
            </button>
            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#a78bfa', marginTop: '4px' }}>Pasar (+30s)</p>
          </div>
        </div>

        <button onClick={() => { if (window.confirm('¿Cancelar juego?')) { onExit(); } }}
          style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: 0.6, flexShrink: 0 }}>Cancelar Juego</button>

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
  const { notify } = useApp();
  const [formData, setFormData] = useState({ question: '', type: 'text', mediaUrl: '', videoStart: 0, videoEnd: 0, options: ['', ''], correctAnswer: 0 });
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

  // --- Helpers para tiempo de video ---
  // Convierte texto "M:SS" o "SS" a segundos (número)
  const parseTimeInput = (val) => {
    const str = String(val).trim();
    if (str.includes(':')) {
      const parts = str.split(':');
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    return parseInt(str) || 0;
  };

  // Convierte segundos a texto "M:SS" o "SS" para mostrar en el campo
  const secsToDisplay = (secs) => {
    const s = parseInt(secs) || 0;
    if (s < 60) return String(s);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? '0' : ''}${r}`;
  };

  // Preview legible de un valor de campo (texto) → "1:30 (90 seg)"
  const timePreview = (val) => {
    const s = parseTimeInput(val);
    if (s === 0) return null;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}:${r < 10 ? '0' : ''}${r} (${s} seg)` : `${s} seg`;
  };

  // Estados de texto para los campos de tiempo
  const [videoStartText, setVideoStartText] = useState('0');
  const [videoEndText, setVideoEndText] = useState('0');

  useEffect(() => {
    if (initialData) {
      // Reemplazamos el formData COMPLETO (no merge con prev) para evitar que
      // campos como `isNew` de una pregunta anterior contaminen la edición actual.
      setFormData({
        question: '',
        type: 'text',
        mediaUrl: '',
        videoStart: 0,
        videoEnd: 0,
        options: ['', ''],
        correctAnswer: 0,
        ...initialData,
      });
      setVideoStartText(secsToDisplay(initialData.videoStart || 0));
      setVideoEndText(secsToDisplay(initialData.videoEnd || 0));
    }
  }, [initialData]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `quiz/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      await dbService.uploadFile('media', fileName, file);
      const publicUrl = dbService.getPublicUrl('media', fileName);
      setFormData(prev => ({ ...prev, mediaUrl: publicUrl }));
      notify.success('Archivo subido');
    } catch (error) {
      notify.error('Error: ' + error.message);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await onSave(formData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
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
          <input className="premium-input" placeholder="URL de Youtube" value={formData.mediaUrl} onChange={e => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Campo Inicio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                className="premium-input"
                placeholder="Inicio (ej: 50 ó 1:30)"
                type="text"
                value={videoStartText}
                onChange={e => {
                  setVideoStartText(e.target.value);
                  setFormData(prev => ({ ...prev, videoStart: parseTimeInput(e.target.value) }));
                }}
              />
              {timePreview(videoStartText) && (
                <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700, paddingLeft: '4px' }}>
                  ▶ {timePreview(videoStartText)}
                </span>
              )}
            </div>
            {/* Campo Fin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                className="premium-input"
                placeholder="Fin (ej: 55 ó 2:00)"
                type="text"
                value={videoEndText}
                onChange={e => {
                  setVideoEndText(e.target.value);
                  setFormData(prev => ({ ...prev, videoEnd: parseTimeInput(e.target.value) }));
                }}
              />
              {timePreview(videoEndText) && (
                <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700, paddingLeft: '4px' }}>
                  ▶ {timePreview(videoEndText)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}


      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
          {formData.options.map((opt, idx) => (
            <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${formData.correctAnswer === idx ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="radio" checked={formData.correctAnswer === idx} onChange={() => setFormData({ ...formData, correctAnswer: idx })} style={{ cursor: 'pointer', flexShrink: 0 }} />
              <input style={{ background: 'none', border: 'none', color: 'white', width: '100%', outline: 'none', minWidth: 0 }} value={opt} onChange={e => { const copy = [...formData.options]; copy[idx] = e.target.value; setFormData({ ...formData, options: copy }); }} placeholder={`Opción ${idx + 1}`} required />
              {formData.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const copy = formData.options.filter((_, i) => i !== idx);
                    const newCorrect = formData.correctAnswer === idx
                      ? 0
                      : formData.correctAnswer > idx
                        ? formData.correctAnswer - 1
                        : formData.correctAnswer;
                    setFormData({ ...formData, options: copy, correctAnswer: newCorrect });
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0, opacity: 0.7, display: 'flex', alignItems: 'center' }}
                  title="Eliminar opción"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {formData.options.length < 6 && (
          <button
            type="button"
            onClick={() => setFormData({ ...formData, options: [...formData.options, ''] })}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: '0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'; e.currentTarget.style.color = '#a78bfa'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Plus size={16} /> Agregar Opción
          </button>
        )}
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
