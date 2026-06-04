// --- ESTADO DE LA APLICACIÓN ---
const state = {
  lives: 3,
  streak: 0,
  score: 0,
  level: 1,
  highScore: parseInt(localStorage.getItem('matefacil_high_score')) || 0,
  maxStreak: parseInt(localStorage.getItem('matefacil_max_streak')) || 0,
  
  currentQuestion: null,
  isAnswered: false,
  
  settings: {
    theme: localStorage.getItem('matefacil_theme') || 'dark',
    fontSize: localStorage.getItem('matefacil_font_size') || 'grande',
    sound: localStorage.getItem('matefacil_sound') !== 'false', // default true
    speech: localStorage.getItem('matefacil_speech') === 'true' // default false
  }
};

// --- CONFIGURACIÓN DE AUDIO SINTETIZADO (Web Audio API) ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playCorrectSound() {
  if (!state.settings.sound) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 (Do)
  osc.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5 (La)
  
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playIncorrectSound() {
  if (!state.settings.sound) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.35);
  
  gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playGameOverSound() {
  if (!state.settings.sound) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  
  // Acorde triste descendente
  const frequencies = [220, 165, 130]; // La3, Mi3, Do3
  frequencies.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + index * 0.15);
    osc.frequency.linearRampToValueAtTime(freq - 30, now + index * 0.15 + 0.5);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + index * 0.15 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.6);
    
    osc.start(now + index * 0.15);
    osc.stop(now + index * 0.15 + 0.6);
  });
}

// --- SÍNTESIS DE VOZ (API Web Speech) ---
function speakText(text) {
  if (!state.settings.speech) return;
  
  // Cancelar lecturas activas
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  
  // Buscar voz en español
  const voices = window.speechSynthesis.getVoices();
  const esVoice = voices.find(voice => voice.lang.startsWith('es'));
  if (esVoice) {
    utterance.voice = esVoice;
  }
  
  // Ajustes de velocidad para mayor claridad
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
}

// Asegurar que las voces carguen correctamente (algunos navegadores las cargan asíncronamente)
window.speechSynthesis.onvoiceschanged = () => {};

// --- MOTOR DE GENERACIÓN DE PREGUNTAS ---
function getLevelByStreak(streak) {
  if (streak < 5) return 1;
  if (streak < 10) return 2;
  if (streak < 15) return 3;
  if (streak < 20) return 4;
  return 5;
}

function generateQuestion() {
  const currentLevel = getLevelByStreak(state.streak);
  state.level = currentLevel;
  
  let qText = '';
  let qSpoken = '';
  let correctVal = 0;
  let levelName = '';
  
  switch (currentLevel) {
    case 1: {
      levelName = "Nivel 1: Sumas y Restas Básicas";
      const isSuma = Math.random() < 0.5;
      const a = Math.floor(Math.random() * 9) + 1; // 1-9
      const b = Math.floor(Math.random() * 9) + 1; // 1-9
      
      if (isSuma) {
        correctVal = a + b;
        qText = `${a} + ${b} = ?`;
        qSpoken = `Suma: ¿Cuánto es ${a} más ${b}?`;
      } else {
        // Asegurar que no dé negativo
        const maxVal = Math.max(a, b);
        const minVal = Math.min(a, b);
        // Si son iguales y da 0, lo cambiamos para que dé un resultado positivo
        const numA = maxVal === minVal ? maxVal + 1 : maxVal;
        const numB = minVal;
        
        correctVal = numA - numB;
        qText = `${numA} - ${numB} = ?`;
        qSpoken = `Resta: ¿Cuánto es ${numA} menos ${numB}?`;
      }
      break;
    }
    
    case 2: {
      levelName = "Nivel 2: Operaciones Medianas y Multiplicación Fácil";
      const mode = Math.floor(Math.random() * 3); // 0: Suma mediana, 1: Resta mediana, 2: Multiplicación fácil
      
      if (mode === 0) {
        const a = Math.floor(Math.random() * 30) + 10; // 10-39
        const b = Math.floor(Math.random() * 9) + 1;   // 1-9
        correctVal = a + b;
        qText = `${a} + ${b} = ?`;
        qSpoken = `Suma: ¿Cuánto es ${a} más ${b}?`;
      } else if (mode === 1) {
        const a = Math.floor(Math.random() * 30) + 10; // 10-39
        const b = Math.floor(Math.random() * 9) + 1;   // 1-9
        correctVal = a - b;
        qText = `${a} - ${b} = ?`;
        qSpoken = `Resta: ¿Cuánto es ${a} menos ${b}?`;
      } else {
        const a = Math.floor(Math.random() * 4) + 2;   // 2-5
        const b = Math.floor(Math.random() * 8) + 2;   // 2-9
        correctVal = a * b;
        qText = `${a} × ${b} = ?`;
        qSpoken = `Multiplicación: ¿Cuánto es ${a} por ${b}?`;
      }
      break;
    }
    
    case 3: {
      levelName = "Nivel 3: Multiplicación y División Completa";
      const isMult = Math.random() < 0.5;
      
      if (isMult) {
        const a = Math.floor(Math.random() * 9) + 2; // 2-10
        const b = Math.floor(Math.random() * 9) + 2; // 2-10
        correctVal = a * b;
        qText = `${a} × ${b} = ?`;
        qSpoken = `Multiplicación: ¿Cuánto es ${a} por ${b}?`;
      } else {
        // División exacta: generamos divisor y cociente, el dividendo es el producto
        const divisor = Math.floor(Math.random() * 8) + 2; // 2-9
        const cociente = Math.floor(Math.random() * 8) + 2; // 2-9
        const dividendo = divisor * cociente;
        
        correctVal = cociente;
        qText = `${dividendo} ÷ ${divisor} = ?`;
        qSpoken = `División: ¿Cuánto es ${dividendo} dividido por ${divisor}?`;
      }
      break;
    }
    
    case 4: {
      levelName = "Nivel 4: Ecuaciones de un paso";
      const type = Math.floor(Math.random() * 3);
      const x = Math.floor(Math.random() * 12) + 2; // 2-13 (esta es la respuesta correcta)
      const a = Math.floor(Math.random() * 10) + 1; // 1-10
      
      correctVal = x;
      
      if (type === 0) {
        // x + a = b
        const b = x + a;
        qText = `x + ${a} = ${b}`;
        qSpoken = `Ecuación: equis más ${a} es igual a ${b}. ¿Cuánto vale equis?`;
      } else if (type === 1) {
        // x - a = b
        const b = x - a;
        // Evitar b <= 0 para no complicar visualmente con negativos
        const paramA = b <= 0 ? a - b + 1 : a;
        const valB = x - paramA;
        qText = `x - ${paramA} = ${valB}`;
        qSpoken = `Ecuación: equis menos ${paramA} es igual a ${valB}. ¿Cuánto vale equis?`;
      } else {
        // a + x = b
        const b = a + x;
        qText = `${a} + x = ${b}`;
        qSpoken = `Ecuación: ${a} más equis es igual a ${b}. ¿Cuánto vale equis?`;
      }
      break;
    }
    
    case 5: {
      levelName = "Nivel 5: Ecuaciones Combinadas";
      const type = Math.floor(Math.random() * 3);
      correctVal = Math.floor(Math.random() * 8) + 2; // x en [2, 9] (respuesta correcta)
      
      if (type === 0) {
        // ax = b
        const a = Math.floor(Math.random() * 4) + 2; // 2-5
        const b = a * correctVal;
        qText = `${a}x = ${b}`;
        qSpoken = `Ecuación: ${a} equis es igual a ${b}. ¿Cuánto vale equis?`;
      } else if (type === 1) {
        // ax + b = c
        const a = Math.floor(Math.random() * 3) + 2; // 2-4
        const b = Math.floor(Math.random() * 6) + 1; // 1-6
        const c = a * correctVal + b;
        qText = `${a}x + ${b} = ${c}`;
        qSpoken = `Ecuación: ${a} equis más ${b} es igual a ${c}. ¿Cuánto vale equis?`;
      } else {
        // x / a = b
        const a = Math.floor(Math.random() * 3) + 2; // 2-4
        // Para que x sea entero, correctVal es el dividendo, y b es cociente: x / a = b => x = a * b.
        // Pero en la pantalla se muestra "x / a = b", y la respuesta correcta es x.
        const b = Math.floor(Math.random() * 5) + 2; // 2-6
        const xVal = a * b;
        correctVal = xVal; // El valor a adivinar es x
        qText = `x ÷ ${a} = ${b}`;
        qSpoken = `Ecuación: equis dividido por ${a} es igual a ${b}. ¿Cuánto vale equis?`;
      }
      break;
    }
  }
  
  // Generar 3 opciones incorrectas únicas
  const incorrects = new Set();
  
  // Intentar generar respuestas lógicas incorrectas
  while (incorrects.size < 3) {
    let candidate = 0;
    const rand = Math.random();
    
    if (rand < 0.25) {
      candidate = correctVal + 1;
    } else if (rand < 0.5) {
      candidate = correctVal - 1;
    } else if (rand < 0.7) {
      candidate = correctVal + 2;
    } else if (rand < 0.85) {
      candidate = correctVal - 2;
    } else {
      // Valor lejano
      const offset = Math.floor(Math.random() * 6) + 3; // 3-8
      candidate = Math.random() < 0.5 ? correctVal + offset : correctVal - offset;
    }
    
    // Evitar que la opción sea negativa o igual a la correcta
    if (candidate > 0 && candidate !== correctVal) {
      incorrects.add(candidate);
    }
  }
  
  // Si por alguna razón no tenemos 3, llenamos con números consecutivos
  let fallback = 1;
  while (incorrects.size < 3) {
    if (fallback !== correctVal) {
      incorrects.add(fallback);
    }
    fallback++;
  }
  
  // Mezclar opciones
  const optionsList = [correctVal, ...incorrects];
  shuffleArray(optionsList);
  
  state.currentQuestion = {
    text: qText,
    spoken: qSpoken,
    correctAnswer: correctVal,
    options: optionsList,
    levelName: levelName
  };
}

// Algoritmo de mezcla Fisher-Yates
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- ACTUALIZACIONES DE LA INTERFAZ ---
const elements = {
  body: document.body,
  themeSelect: document.getElementById('theme-select'),
  sizeSelect: document.getElementById('size-select'),
  btnSpeech: document.getElementById('btn-speech'),
  btnSound: document.getElementById('btn-sound'),
  
  // Screens
  screenStart: document.getElementById('screen-start'),
  screenPlay: document.getElementById('screen-play'),
  screenGameover: document.getElementById('screen-gameover'),
  
  // Controls
  btnStart: document.getElementById('btn-start'),
  btnNext: document.getElementById('btn-next'),
  btnRestart: document.getElementById('btn-restart'),
  
  // Stats
  livesDisplay: document.getElementById('lives-display'),
  streakDisplay: document.getElementById('streak-display'),
  scoreDisplay: document.getElementById('score-display'),
  progressBar: document.getElementById('progress-bar'),
  levelIndicator: document.getElementById('level-indicator'),
  
  // Game Elements
  questionText: document.getElementById('question-text'),
  optionBtns: document.querySelectorAll('.option-btn'),
  srFeedback: document.getElementById('sr-feedback'),
  feedbackBanner: document.getElementById('feedback-banner'),
  feedbackMessage: document.getElementById('feedback-message'),
  
  // Game Over Elements
  finalScore: document.getElementById('final-score'),
  finalStreak: document.getElementById('final-streak'),
  highScore: document.getElementById('high-score')
};

// Aplicar configuración inicial al DOM
function applyInitialSettings() {
  elements.body.setAttribute('data-theme', state.settings.theme);
  elements.body.setAttribute('data-size', state.settings.fontSize);
  elements.themeSelect.value = state.settings.theme;
  elements.sizeSelect.value = state.settings.fontSize;
  
  updateAudioBtnStates();
}

function updateAudioBtnStates() {
  elements.btnSpeech.setAttribute('aria-pressed', state.settings.speech);
  elements.btnSpeech.querySelector('.btn-text').textContent = state.settings.speech ? "Voz On" : "Voz Off";
  
  elements.btnSound.setAttribute('aria-pressed', state.settings.sound);
  elements.btnSound.querySelector('.btn-text').textContent = state.settings.sound ? "Sonido On" : "Sonido Off";
}

// Alternar pantallas del juego
function showScreen(screenKey) {
  elements.screenStart.classList.remove('active');
  elements.screenPlay.classList.remove('active');
  elements.screenGameover.classList.remove('active');
  
  if (screenKey === 'start') {
    elements.screenStart.classList.add('active');
    speakText("Bienvenido a MateFácil. Presiona el botón grande en el centro para empezar.");
  } else if (screenKey === 'play') {
    elements.screenPlay.classList.add('active');
  } else if (screenKey === 'gameover') {
    elements.screenGameover.classList.add('active');
    // Anunciar fin de juego
    const txt = `Fin de la partida. Obtuviste ${state.score} puntos. Tu racha máxima fue de ${state.streak} respuestas correctas. Presiona el botón al final para volver a jugar.`;
    speakText(txt);
  }
}

// Cargar la siguiente pregunta
function renderQuestion() {
  generateQuestion();
  state.isAnswered = false;
  
  // Ocultar banner de feedback
  elements.feedbackBanner.classList.add('hidden');
  elements.feedbackBanner.classList.remove('incorrect-banner');
  
  // Renderizar pregunta e indicador
  elements.levelIndicator.textContent = state.currentQuestion.levelName;
  elements.questionText.textContent = state.currentQuestion.text;
  
  // Calcular porcentaje de progreso del nivel actual (racha en modulo 5)
  const progressPercent = ((state.streak % 5) / 5) * 100;
  elements.progressBar.style.width = `${progressPercent}%`;
  
  // Renderizar botones de opciones
  elements.optionBtns.forEach((btn, idx) => {
    btn.classList.remove('correct', 'incorrect', 'disabled');
    btn.setAttribute('aria-checked', 'false');
    btn.removeAttribute('aria-label');
    
    const val = state.currentQuestion.options[idx];
    btn.querySelector('.option-value').textContent = val;
  });
  
  // Anunciar pregunta por voz (si está habilitado)
  speakQuestion();
}

function speakQuestion() {
  const currentValText = `Pregunta: ${state.currentQuestion.spoken}`;
  speakText(currentValText);
}

function speakCorrectAnswerFeedback(isCorrect, userVal, correctVal) {
  let text = "";
  if (isCorrect) {
    text = `¡Correcto! Marcaste ${userVal}.`;
  } else {
    text = `Incorrecto. Marcaste ${userVal}. La respuesta correcta era ${correctVal}.`;
  }
  
  // Escribir en el lector de pantalla y también decirlo por voz
  elements.srFeedback.textContent = text;
  speakText(text);
}

// Iniciar Partida
function startGame() {
  state.lives = 3;
  state.streak = 0;
  state.score = 0;
  state.level = 1;
  state.isAnswered = false;
  
  updateStatsDOM();
  showScreen('play');
  renderQuestion();
}

// Actualizar marcadores en la pantalla
function updateStatsDOM() {
  // Generar representación visual de vidas
  let hearts = "";
  for (let i = 0; i < 3; i++) {
    hearts += i < state.lives ? "❤️ " : "🖤 ";
  }
  elements.livesDisplay.textContent = hearts;
  elements.livesDisplay.setAttribute('aria-label', `${state.lives} vidas restantes`);
  
  elements.streakDisplay.textContent = state.streak;
  elements.scoreDisplay.textContent = state.score;
}

// Procesar respuesta del usuario
function handleAnswer(selectedIndex) {
  if (state.isAnswered) return;
  state.isAnswered = true;
  
  const selectedVal = state.currentQuestion.options[selectedIndex];
  const correctVal = state.currentQuestion.correctAnswer;
  const isCorrect = selectedVal === correctVal;
  
  // Deshabilitar otros botones
  elements.optionBtns.forEach((btn, idx) => {
    btn.classList.add('disabled');
    if (idx === selectedIndex) {
      btn.setAttribute('aria-checked', 'true');
    }
  });
  
  if (isCorrect) {
    // Respuesta Correcta
    playCorrectSound();
    elements.optionBtns[selectedIndex].classList.add('correct');
    
    // Incrementar racha y calcular puntos (puntos base * nivel)
    state.streak++;
    const pointsGained = state.level * 10;
    state.score += pointsGained;
    
    // Guardar récord de racha
    if (state.streak > state.maxStreak) {
      state.maxStreak = state.streak;
      localStorage.setItem('matefacil_max_streak', state.maxStreak);
    }
    
    // Actualizar marcadores
    updateStatsDOM();
    
    // Mostrar banner de correcto
    elements.feedbackMessage.textContent = "¡Respuesta Correcta! +" + pointsGained + " pts";
    elements.feedbackBanner.classList.remove('hidden');
    elements.feedbackBanner.classList.remove('incorrect-banner');
    
    // Foco en el botón Siguiente
    setTimeout(() => {
      elements.btnNext.focus();
    }, 100);
    
    // Audio descriptivo
    speakCorrectAnswerFeedback(true, selectedVal, correctVal);
    
  } else {
    // Respuesta Incorrecta
    playIncorrectSound();
    elements.optionBtns[selectedIndex].classList.add('incorrect');
    
    // Buscar y resaltar la correcta
    elements.optionBtns.forEach((btn, idx) => {
      if (state.currentQuestion.options[idx] === correctVal) {
        btn.classList.add('correct');
      }
    });
    
    // Descontar vida y reiniciar racha
    state.lives--;
    state.streak = 0;
    
    updateStatsDOM();
    
    // Mostrar banner de incorrecto
    elements.feedbackMessage.textContent = `Incorrecto. La respuesta era ${correctVal}`;
    elements.feedbackBanner.classList.add('incorrect-banner');
    elements.feedbackBanner.classList.remove('hidden');
    
    // Foco en el botón Siguiente
    setTimeout(() => {
      elements.btnNext.focus();
    }, 100);
    
    // Audio descriptivo
    speakCorrectAnswerFeedback(false, selectedVal, correctVal);
  }
}

// Continuar después de responder (Siguiente Pregunta o Fin del Juego)
function handleNext() {
  if (state.lives <= 0) {
    // Fin del juego
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('matefacil_high_score', state.highScore);
    }
    
    // Cargar estadísticas finales
    elements.finalScore.textContent = state.score;
    elements.finalStreak.textContent = state.maxStreak;
    elements.highScore.textContent = state.highScore;
    
    playGameOverSound();
    showScreen('gameover');
  } else {
    renderQuestion();
  }
}

// --- LISTENERS DE ACCESIBILIDAD Y CONFIGURACIÓN ---

// Cambiar Tema
elements.themeSelect.addEventListener('change', (e) => {
  const selectedTheme = e.target.value;
  state.settings.theme = selectedTheme;
  elements.body.setAttribute('data-theme', selectedTheme);
  localStorage.setItem('matefacil_theme', selectedTheme);
  speakText(`Tema cambiado a ${e.target.options[e.target.selectedIndex].text}`);
});

// Cambiar Tamaño de Texto
elements.sizeSelect.addEventListener('change', (e) => {
  const selectedSize = e.target.value;
  state.settings.fontSize = selectedSize;
  elements.body.setAttribute('data-size', selectedSize);
  localStorage.setItem('matefacil_font_size', selectedSize);
  speakText(`Tamaño de letra cambiado a ${selectedSize}`);
});

// Cambiar voz (Lectura por voz)
elements.btnSpeech.addEventListener('click', () => {
  state.settings.speech = !state.settings.speech;
  localStorage.setItem('matefacil_speech', state.settings.speech);
  updateAudioBtnStates();
  
  if (state.settings.speech) {
    // Si se activa, lee inmediatamente la pregunta actual o da la bienvenida
    speakText("Lectura por voz activada.");
    if (elements.screenPlay.classList.contains('active') && state.currentQuestion) {
      setTimeout(speakQuestion, 1200);
    }
  } else {
    window.speechSynthesis.cancel();
  }
});

// Cambiar efectos de sonido
elements.btnSound.addEventListener('click', () => {
  state.settings.sound = !state.settings.sound;
  localStorage.setItem('matefacil_sound', state.settings.sound);
  updateAudioBtnStates();
  
  if (state.settings.sound) {
    // Reproducir un pitido rápido de prueba
    initAudio();
    playCorrectSound();
  }
});

// --- LISTENERS DE CONTROL DE PANTALLAS ---
elements.btnStart.addEventListener('click', () => {
  startGame();
});

elements.btnNext.addEventListener('click', () => {
  handleNext();
});

elements.btnRestart.addEventListener('click', () => {
  startGame();
});

// Click en opciones
elements.optionBtns.forEach((btn, idx) => {
  btn.addEventListener('click', () => {
    handleAnswer(idx);
  });
});

// --- SOPORTE DE TECLADO ---
document.addEventListener('keydown', (e) => {
  const key = e.key;
  
  // Teclas 1, 2, 3, 4 para seleccionar opciones
  if (elements.screenPlay.classList.contains('active') && !state.isAnswered) {
    if (key === '1') handleAnswer(0);
    if (key === '2') handleAnswer(1);
    if (key === '3') handleAnswer(2);
    if (key === '4') handleAnswer(3);
  }
  
  // Espacio o Enter para continuar cuando se muestra el banner de retroalimentación
  if (elements.screenPlay.classList.contains('active') && state.isAnswered) {
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); // Evitar scroll con espacio
      handleNext();
    }
  }
  
  // Espacio o Enter en la pantalla de inicio
  if (elements.screenStart.classList.contains('active')) {
    if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      startGame();
    }
  }
  
  // Espacio o Enter en la pantalla de fin de juego
  if (elements.screenGameover.classList.contains('active')) {
    if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      startGame();
    }
  }
});

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', () => {
  applyInitialSettings();
  showScreen('start');
});
