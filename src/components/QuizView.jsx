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
  // Si es admin, vamos directo al panel de ediciÃ³n. Si no, a jugar.
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
  const [hiddenOptions, setHiddenOptions] = useState([]); // Ãndices ocultos por 50/50

  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewModeLocal] = useState(project?.previewMode || false);
  const [localAccessCode, setLocalAccessCode] = useState(project?.access_code || '123');

  // Estados para ediciÃ³n del nombre del proyecto
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);

  const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
  const [hasUnsavedCodeChanges, setHasUnsavedCodeChanges] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  // isMobile: ancho < 1024 O altura < 500px (landscape en telefono)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024 || window.innerHeight < 500);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth <= 1024 && window.innerHeight >= 500);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saved
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1200);
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(window.innerWidth >= 1200);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [showLifelines, setShowLifelines] = useState(false); // Drawer de ayudas en móvil

  const timerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024 || window.innerHeight < 500);
      setIsTablet(width >= 768 && width <= 1024 && window.innerHeight >= 500);
      setIsCompact(width < 1200);
      setIsLandscape(width > window.innerHeight);
      if (width >= 1200) {
        setShowQuestionsPanel(true);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Iniciar juego automÃ¡ticamente si estamos en modo playing
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
        notify.success('Â¡Quiz guardado con Ã©xito!');
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
    const total = currentQ.options.length;

    // Dinámica de 50:50:
    // 3 opciones: quita 1
    // 4 opciones: quita 2
    // 5 opciones: quita 2
    // 6 opciones: quita 3
    let numToHide = 2;
    if (total === 3) numToHide = 1;
    else if (total === 6) numToHide = 3;

    const wrongIndices = currentQ.options
      .map((_, idx) => idx)
      .filter(idx => idx !== currentQ.correctAnswer);
    const shuffledWrong = [...wrongIndices].sort(() => 0.5 - Math.random());
    setHiddenOptions(shuffledWrong.slice(0, numToHide));
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
              <><ShieldCheck size={16} /> Â¡GUARDADO!</>
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
                          if (window.confirm('Â¿ESTÃS SEGURO?')) {
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
                        // Si es ediciÃ³n, NO cerramos para que vea el "Â¡GUARDADO!" en el botÃ³n
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

    // Columnas de opciones
    const optCols = isMobile
      ? '1fr'
      : (isLandscape && !isTablet) // En horizontal desktop usamos 1 columna si hay media al lado
        ? '1fr'
        : (isTextQ && currentQ.options.length > 3) || (!isTextQ && currentQ.options.length > 2)
          ? '1fr 1fr'
          : '1fr';

    // â”€â”€ Renderizado de una opciÃ³n (reutilizable) â”€â”€
    const renderOption = (opt, idx) => {
      if (hiddenOptions.includes(idx)) {
        return <div key={idx} style={{ opacity: 0, minHeight: isTextQ ? (isLandscape && isMobile ? '44px' : '60px') : '38px' }} />;
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
        /* -- FILA: badge izquierda + texto derecha -- */
        const badgeSize = isMobile ? (isLandscape ? '22px' : '26px') : '30px';
        const textSize = isMobile ? (isLandscape ? '0.68rem' : '0.76rem') : isTablet ? '0.9rem' : '0.95rem';
        const cardPad = isMobile ? (isLandscape ? '6px 10px' : '9px 12px') : isTablet ? '12px 14px' : '15px 22px';
        const cardMinH = isMobile ? (isLandscape ? '40px' : '52px') : isTablet ? '55px' : '68px';
        return (
          <button key={idx} onClick={() => handleAnswer(idx)} disabled={feedback !== null}
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              gap: isMobile ? '10px' : '14px',
              padding: cardPad, minHeight: cardMinH, borderRadius: '14px',
              background: bgColor, border: `2px solid ${borderColor}`, color: 'white',
              cursor: feedback !== null ? 'default' : 'pointer', transition: 'all 0.22s ease',
              textAlign: 'left', width: '100%', ...glowStyle
            }}
            onMouseEnter={e => { if (!feedback) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = letterColor; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (!feedback) { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.transform = 'translateY(0)'; } }}
          >
            <div style={{
              width: badgeSize, height: badgeSize, borderRadius: '7px', flexShrink: 0,
              background: isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : `${letterColor}22`,
              border: `2px solid ${isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : letterColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isCorrectOpt || isWrongOpt ? 'white' : letterColor, fontWeight: 900,
              fontSize: isMobile ? '0.65rem' : '1rem'
            }}>
              {isCorrectOpt ? <Check size={isMobile ? 12 : 16} /> : isWrongOpt ? <X size={isMobile ? 12 : 16} /> : String.fromCharCode(65 + idx)}
            </div>
            <span style={{ fontSize: textSize, fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{opt}</span>
          </button>
        );
      } else {
        /* â”€â”€ FILA COMPACTA (media) â”€â”€ */
        return (
          <button key={idx} onClick={() => handleAnswer(idx)} disabled={feedback !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: isMobile ? (isLandscape ? '7px 10px' : '9px 12px') : '11px 16px',
              borderRadius: '12px', background: bgColor, border: `1px solid ${borderColor}`,
              color: 'white', cursor: feedback !== null ? 'default' : 'pointer',
              transition: 'all 0.2s ease', textAlign: 'left', ...glowStyle
            }}
            onMouseEnter={e => { if (!feedback) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = letterColor; } }}
            onMouseLeave={e => { if (!feedback) { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor; } }}
          >
            <div style={{
              width: isMobile ? '26px' : '30px', height: isMobile ? '26px' : '30px',
              borderRadius: '7px', flexShrink: 0,
              background: isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : `${letterColor}22`,
              border: `1px solid ${isCorrectOpt ? '#10b981' : isWrongOpt ? '#ef4444' : letterColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '0.8rem', color: isCorrectOpt || isWrongOpt ? 'white' : letterColor
            }}>
              {isCorrectOpt ? <Check size={13} /> : isWrongOpt ? <X size={13} /> : String.fromCharCode(65 + idx)}
            </div>
            <span style={{ fontSize: isMobile ? (isLandscape ? '0.72rem' : '0.8rem') : '0.95rem', fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{opt}</span>
          </button>
        );
      }
    };

    // â”€â”€ Barra de ayudas (50:50 + Pasar) â”€â”€
    const lifelineBar = (
      <div style={{ display: 'flex', gap: isMobile ? '20px' : '30px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleFiftyFifty} disabled={feedback || hiddenOptions.length > 0}
            style={{
              width: isMobile ? '48px' : '70px', height: isMobile ? '48px' : '70px', borderRadius: '50%',
              background: 'rgba(59,130,246,0.2)', border: '2px solid #3b82f6', color: '#3b82f6',
              fontWeight: 900, cursor: 'pointer', opacity: (feedback || hiddenOptions.length > 0) ? 0.3 : 1,
              fontSize: isMobile ? '0.7rem' : '1rem'
            }}>50:50</button>
          <p style={{ fontSize: '0.55rem', fontWeight: 900, color: '#3b82f6', marginTop: '3px' }}>+10s</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={handlePass} disabled={feedback}
            style={{
              width: isMobile ? '48px' : '70px', height: isMobile ? '48px' : '70px', borderRadius: '50%',
              background: 'rgba(124,58,237,0.2)', border: '2px solid #7c3aed', color: '#a78bfa',
              cursor: 'pointer', opacity: feedback ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            <SkipForward size={isMobile ? 18 : 24} />
          </button>
          <p style={{ fontSize: '0.55rem', fontWeight: 900, color: '#a78bfa', marginTop: '3px' }}>Pasar (+30s)</p>
        </div>
        {isMobile && (
          <button onClick={() => { if (window.confirm('Â¿Cancelar juego?')) { onExit(); } }}
            style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', opacity: 0.7 }}>
            Cancelar
          </button>
        )}
      </div>
    );

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MÃ“VIL LANDSCAPE â†’ 2 columnas fijas sin scroll
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (isMobile && isLandscape) {
      return (
        <div style={{
          height: '100vh', width: '100vw', background: '#000', color: 'white',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
        }}>

          {/* Barra superior compacta */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.3)', gap: '10px'
          }}>
            <div style={{
              background: 'rgba(59,130,246,0.15)', padding: '4px 12px', borderRadius: '100px',
              border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.68rem', fontWeight: 700, color: '#93c5fd'
            }}>
              {currentQIndex + 1}/{questions.length}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 900 }}>
                <Clock size={14} color="#3b82f6" /> {formatTime(timer)}
              </div>
              {previewMode && (
                <button onClick={onExit} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>
                  SALIR
                </button>
              )}
            </div>
          </div>

          {/* Cuerpo 2 columnas */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '10px', padding: '8px 12px', minHeight: 0 }}>

            {/* Columna izquierda: pregunta + media */}
            <div style={{
              flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
              alignItems: 'center', textAlign: 'center', gap: '8px', overflow: 'hidden'
            }}>
              <h2 style={{ fontSize: isTextQ ? '0.95rem' : '0.82rem', fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
                {currentQ.question}
              </h2>
              {currentQ.type === 'image' && currentQ.mediaUrl && (
                <img src={currentQ.mediaUrl} onClick={() => setFullImage(currentQ.mediaUrl)}
                  style={{ width: '100%', maxHeight: '55%', objectFit: 'contain', borderRadius: '10px', cursor: 'zoom-in' }} />
              )}
              {currentQ.type === 'audio' && currentQ.mediaUrl && (
                <audio controls src={currentQ.mediaUrl} style={{ width: '100%' }} />
              )}
              {currentQ.type === 'video' && currentQ.mediaUrl && (
                <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                  {(() => {
                    const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                    const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${currentQ.videoStart || 0}${currentQ.videoEnd ? `&end=${currentQ.videoEnd}` : ''}&autoplay=1&enablejsapi=1`;
                    return <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="autoplay" allowFullScreen></iframe>;
                  })()}
                </div>
              )}
            </div>

            {/* Columna derecha: opciones */}
            <div style={{
              flex: 1, display: 'grid', gridTemplateColumns: optCols,
              gap: '6px', alignContent: 'center', overflow: 'hidden', minHeight: 0
            }}>
              {currentQ.options.map((opt, idx) => renderOption(opt, idx))}
            </div>
          </div>

          {/* Drawer ayudas landscape - siempre visible */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
          }}>
            <div style={{
              background: 'rgba(10,10,20,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px 0 0 0',
              padding: showLifelines ? '10px 16px' : '0 16px',
              maxHeight: showLifelines ? '120px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 0.25s ease, padding 0.25s ease',
              maxWidth: '240px'
            }}>
              {lifelineBar}
            </div>
            <button
              onClick={() => setShowLifelines(prev => !prev)}
              style={{
                background: 'rgba(30,30,50,0.97)', border: '1px solid rgba(255,255,255,0.15)',
                borderBottom: 'none', borderRadius: '10px 10px 0 0',
                padding: '4px 14px', color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '0.62rem', fontWeight: 700, marginRight: '8px'
              }}
            >
              <ChevronUp size={12} style={{ transform: showLifelines ? 'rotate(180deg)' : 'none', transition: '0.25s' }} />
              Ayudas
            </button>
          </div>

          {fullImage && (
            <div onClick={() => setFullImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
              <img src={fullImage} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
              <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }}>
                <X size={24} />
              </div>
            </div>
          )}
        </div>
      );
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MÃ“VIL PORTRAIT â†’ columna, drawer colapsable abajo
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (isMobile && !isLandscape) {
      return (
        <div style={{
          height: '100vh', width: '100vw', background: '#000', color: 'white',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
        }}>

          {/* Barra superior */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', flexShrink: 0, gap: '10px'
          }}>
            <div style={{
              background: 'rgba(59,130,246,0.15)', padding: '6px 14px', borderRadius: '100px',
              border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd'
            }}>
              {currentQIndex + 1} / {questions.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 900 }}>
                <Clock size={16} color="#3b82f6" /> {formatTime(timer)}
              </div>
              {previewMode && (
                <button onClick={onExit} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                  SALIR
                </button>
              )}
            </div>
          </div>

          {/* Zona pregunta â€” centrada verticalmente en su mitad */}
          <div style={{
            flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', textAlign: 'center', padding: '0 16px', gap: '10px',
            minHeight: isTextQ ? '22%' : '30%'
          }}>
            <h2 style={{ fontSize: isTextQ ? '1.15rem' : '0.95rem', fontWeight: 900, lineHeight: 1.3, margin: 0 }}>
              {currentQ.question}
            </h2>
            {currentQ.type === 'image' && currentQ.mediaUrl && (
              <img src={currentQ.mediaUrl} onClick={() => setFullImage(currentQ.mediaUrl)}
                style={{ width: '100%', maxHeight: '22vh', objectFit: 'contain', borderRadius: '12px', cursor: 'zoom-in' }} />
            )}
            {currentQ.type === 'audio' && currentQ.mediaUrl && (
              <audio controls src={currentQ.mediaUrl} style={{ width: '100%' }} />
            )}
            {currentQ.type === 'video' && currentQ.mediaUrl && (
              <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '22vh', borderRadius: '12px', overflow: 'hidden' }}>
                {(() => {
                  const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${currentQ.videoStart || 0}${currentQ.videoEnd ? `&end=${currentQ.videoEnd}` : ''}&autoplay=1&enablejsapi=1`;
                  return <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="autoplay" allowFullScreen></iframe>;
                })()}
              </div>
            )}
          </div>

          {/* Separador sutil */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px', flexShrink: 0 }} />

          {/* Zona opciones â€” ocupa el resto */}
          <div style={{
            flex: 1, display: 'grid', gridTemplateColumns: optCols,
            gap: '8px', alignContent: 'center', padding: '10px 14px 80px', overflowY: 'auto'
          }}>
            {currentQ.options.map((opt, idx) => renderOption(opt, idx))}
          </div>

          {/* Drawer colapsable de ayudas â€” flotante sobre las opciones */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
            {/* PestaÃ±a */}
            <button
              onClick={() => setShowLifelines(prev => !prev)}
              style={{
                position: 'absolute', bottom: showLifelines ? '90px' : 0,
                left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(20,20,35,0.97)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px 12px 0 0', padding: '5px 20px', color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '0.62rem', fontWeight: 700, transition: 'bottom 0.25s ease', zIndex: 51,
                whiteSpace: 'nowrap'
              }}>
              <ChevronUp size={13} style={{ transform: showLifelines ? 'rotate(180deg)' : 'none', transition: '0.25s' }} />
              Ayudas
            </button>
            {/* Panel */}
            <div style={{
              background: 'rgba(10,10,20,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '12px 20px 10px',
              transform: showLifelines ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.25s ease'
            }}>
              {lifelineBar}
            </div>
          </div>

          {fullImage && (
            <div onClick={() => setFullImage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
              <img src={fullImage} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
              <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }}>
                <X size={24} />
              </div>
            </div>
          )}
        </div>
      );
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // DESKTOP / TABLET â†’ layout original mejorado
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    return (
      <div style={{
        height: '100vh', width: '100vw', background: '#000', color: 'white',
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px',
        position: 'relative', overflow: 'hidden'
      }}>

        {/* Barra superior */}
        <div style={{
          width: '100%', maxWidth: '1100px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '10px', flexShrink: 0
        }}>
          <div style={{
            background: 'rgba(59,130,246,0.15)', padding: '10px 25px', borderRadius: '100px',
            border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd'
          }}>
            Pregunta {currentQIndex + 1} / {questions.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontWeight: 900 }}>
            <Clock size={24} color="#3b82f6" /> {formatTime(timer)}
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{
          flex: 1, width: '100%', maxWidth: '1200px', display: 'flex',
          flexDirection: isLandscape && !isMobile ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: isLandscape ? '30px' : '12px', overflow: 'hidden', minHeight: 0
        }}>

          {/* Pregunta + media */}
          <div style={{
            flex: isLandscape && !isMobile ? '0 0 50%' : '0 0 auto',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            alignItems: 'center', textAlign: 'center', gap: '14px', width: '100%'
          }}>
            <h2 style={{
              fontSize: isTextQ ? (isTablet ? '1.6rem' : '2rem') : '1.3rem',
              fontWeight: 900, lineHeight: 1.3, margin: 0
            }}>
              {currentQ.question}
            </h2>
            {currentQ.type === 'image' && currentQ.mediaUrl && (
              <img src={currentQ.mediaUrl} onClick={() => setFullImage(currentQ.mediaUrl)}
                style={{ width: '100%', maxHeight: isLandscape && !isMobile ? '60vh' : '42vh', objectFit: 'contain', borderRadius: '15px', cursor: 'zoom-in' }} />
            )}
            {currentQ.type === 'audio' && currentQ.mediaUrl && (
              <audio controls src={currentQ.mediaUrl} style={{ width: '100%' }} />
            )}
            {currentQ.type === 'video' && currentQ.mediaUrl && (
              <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: isLandscape && !isMobile ? '60vh' : '42vh', borderRadius: '15px', overflow: 'hidden', flexShrink: 0 }}>
                {(() => {
                  const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${currentQ.videoStart || 0}${currentQ.videoEnd ? `&end=${currentQ.videoEnd}` : ''}&autoplay=1&enablejsapi=1`;
                  return <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} frameBorder="0" allow="autoplay" allowFullScreen></iframe>;
                })()}
              </div>
            )}
          </div>

          {/* Opciones */}
          <div style={{
            flex: 1, width: '100%', display: 'grid', gridTemplateColumns: optCols,
            gap: '14px', alignContent: 'center', minHeight: 0, overflowY: 'auto'
          }}>
            {currentQ.options.map((opt, idx) => renderOption(opt, idx))}
          </div>
        </div>

        {/* Panel de Ayudas (Drawer) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
          {/* Pestaña para abrir/cerrar */}
          <button
            onClick={() => setShowLifelines(prev => !prev)}
            style={{
              position: 'absolute', bottom: showLifelines ? '110px' : '0',
              left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(20,20,35,0.98)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '15px 15px 0 0', padding: '8px 25px', color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)'
            }}>
            <ChevronUp size={16} style={{ transform: showLifelines ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
            {showLifelines ? 'Ocultar Ayudas' : 'Ayudas'}
          </button>

          {/* Panel de contenido */}
          <div style={{
            background: 'rgba(10,10,25,0.98)', borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '20px 0',
            height: '110px',
            transform: showLifelines ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
          }}>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <button onClick={handleFiftyFifty} disabled={feedback || hiddenOptions.length > 0}
                  style={{
                    width: '55px', height: '55px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)',
                    border: '2px solid #3b82f6', color: '#3b82f6', fontWeight: 900, cursor: 'pointer',
                    opacity: (feedback || hiddenOptions.length > 0) ? 0.3 : 1, transition: '0.2s'
                  }}>50:50</button>
                <p style={{ fontSize: '0.55rem', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>+10s</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button onClick={handlePass} disabled={feedback}
                  style={{
                    width: '55px', height: '55px', borderRadius: '50%', background: 'rgba(124,58,237,0.15)',
                    border: '2px solid #7c3aed', color: '#a78bfa', cursor: 'pointer',
                    opacity: feedback ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  <SkipForward size={20} />
                </button>
                <p style={{ fontSize: '0.55rem', fontWeight: 900, color: '#a78bfa', marginTop: '4px' }}>Pasar (+30s)</p>
              </div>
            </div>
            <button onClick={() => { if (window.confirm('¿Cancelar juego?')) { onExit(); } }}
              style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', opacity: 0.5 }}>
              Cancelar Juego
            </button>
          </div>
        </div>

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
      <div style={{ height: '100vh', width: '100vw', background: '#050510', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
        <div className="glass anim-up" style={{ padding: isMobile ? '20px' : '30px', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '10px' }}>🏆</div>
          <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, marginBottom: '5px' }}>¡Juego Terminado!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Estadísticas de la partida</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '10px' : '15px',
            marginBottom: '20px',
            width: '100%'
          }}>
            {/* Tiempo - Destacado arriba */}
            <div style={{
              gridColumn: isMobile ? 'span 2' : 'span 3',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))',
              padding: isMobile ? '12px' : '15px',
              borderRadius: '20px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px'
            }}>
              <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#60a5fa', textShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>{formatTime(timer)}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>TIEMPO TOTAL</div>
            </div>

            {/* Estadísticas Secundarias */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{correct}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>Correctas</div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{incorrect}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>Incorrectas</div>
            </div>

            <div style={{
              background: 'rgba(124, 58, 237, 0.08)',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid rgba(124, 58, 237, 0.15)',
              color: '#a78bfa',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              gridColumn: (isMobile && (correct + incorrect + skipped) % 2 !== 0) ? 'span 2' : 'auto'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{skipped}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>Saltadas</div>
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

  function AdminForm({ initialData, onSave, onCancel, isMobile }) {
    const { notify } = useApp();
    const [formData, setFormData] = useState({ question: '', type: 'text', mediaUrl: '', videoStart: 0, videoEnd: 0, options: ['', ''], correctAnswer: 0 });
    const [uploading, setUploading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

    // --- Helpers para tiempo de video ---
    // Convierte texto "M:SS" o "SS" a segundos (nÃºmero)
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

    // Preview legible de un valor de campo (texto) â†’ "1:30 (90 seg)"
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
        // campos como `isNew` de una pregunta anterior contaminen la ediciÃ³n actual.
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

        {(formData.type === 'audio' || formData.type === 'image') && formData.mediaUrl && (
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {formData.type === 'audio' ? (
              <audio controls src={formData.mediaUrl} style={{ width: '100%', height: '35px' }} />
            ) : (
              <img src={formData.mediaUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', objectFit: 'contain' }} />
            )}
          </div>
        )}

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

  return null;
}
