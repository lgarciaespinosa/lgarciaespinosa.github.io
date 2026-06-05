// --- ESTADO DE LA APLICACIÓN ---
const state = {
  streak: 0,
  score: 0,
  level: 1,
  highScore: parseInt(localStorage.getItem('matefacil_high_score_v2')) || 0,
  
  currentQuestion: null,
  isAnswered: false,
  autoAdvanceTimer: null
};

// --- AUDIO SINTETIZADO DE ALTAVOZ (Web Audio API) ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playCorrectSound() {
  try {
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
  } catch (e) {
    console.warn("Audio Context no disponible aún.", e);
  }
}

function playIncorrectSound() {
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.warn("Audio Context no disponible aún.", e);
  }
}

// --- SÍNTESIS DE VOZ (API Web Speech) ---
function speakText(text) {
  try {
    // Cancelar lecturas activas
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    
    // Intentar buscar una voz en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(voice => voice.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }
    
    // Velocidad reducida (0.8) ideal para personas mayores o en recuperación de ACV
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Error en la síntesis de voz.", e);
  }
}

// Asegurar que las voces carguen
window.speechSynthesis.onvoiceschanged = () => {};

// --- MOTOR DE GENERACIÓN DE PREGUNTAS (MUY SUAVE Y TERAPÉUTICO) ---
function getLevelByStreak(streak) {
  if (streak < 6) return 1;   // Racha 0-5: Sumas súper fáciles (1-5)
  if (streak < 11) return 2;  // Racha 6-10: Restas súper fáciles (1-5)
  if (streak < 16) return 3;  // Racha 11-15: Sumas y restas mayores (1-10)
  if (streak < 21) return 4;  // Racha 16-20: Multiplicaciones básicas (tablas 2 y 5)
  if (streak < 26) return 5;  // Racha 21-25: Divisiones básicas exactas
  return 6;                   // Racha 26+: Ecuaciones ultra-básicas (ej. x + 1 = 3)
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
      levelName = "Nivel 1: Sumas Sencillas";
      // Sumas muy sencillas con números del 1 al 5
      const a = Math.floor(Math.random() * 4) + 1; // 1-4
      const b = Math.floor(Math.random() * 4) + 1; // 1-4
      correctVal = a + b;
      qText = `${a} + ${b}`;
      qSpoken = `Suma. ¿Cuánto es ${a} más ${b}?`;
      break;
    }
    
    case 2: {
      levelName = "Nivel 2: Restas Sencillas";
      // Restas con números del 1 al 5 y resultado positivo
      const a = Math.floor(Math.random() * 4) + 2; // 2-5
      const b = Math.floor(Math.random() * (a - 1)) + 1; // 1 a a-1
      correctVal = a - b;
      qText = `${a} - ${b}`;
      qSpoken = `Resta. ¿Cuánto es ${a} menos ${b}?`;
      break;
    }
    
    case 3: {
      levelName = "Nivel 3: Sumas y Restas";
      // Sumas y restas con números hasta 10
      const isSuma = Math.random() < 0.5;
      if (isSuma) {
        const a = Math.floor(Math.random() * 8) + 2; // 2-9
        const b = Math.floor(Math.random() * 8) + 2; // 2-9
        correctVal = a + b;
        qText = `${a} + ${b}`;
        qSpoken = `Suma. ¿Cuánto es ${a} más ${b}?`;
      } else {
        const a = Math.floor(Math.random() * 8) + 3; // 3-10
        const b = Math.floor(Math.random() * (a - 2)) + 2; // 2 a a-1
        correctVal = a - b;
        qText = `${a} - ${b}`;
        qSpoken = `Resta. ¿Cuánto es ${a} menos ${b}?`;
      }
      break;
    }
    
    case 4: {
      levelName = "Nivel 4: Multiplicaciones del 2 y 5";
      const isTableOf5 = Math.random() < 0.5;
      const base = isTableOf5 ? 5 : 2;
      const factor = Math.floor(Math.random() * 4) + 2; // 2-5
      
      correctVal = base * factor;
      qText = `${base} × ${factor}`;
      qSpoken = `Multiplicación. ¿Cuánto es ${base} por ${factor}?`;
      break;
    }
    
    case 5: {
      levelName = "Nivel 5: Divisiones Sencillas";
      // Divisiones exactas entre 2 y 5
      const divisor = Math.random() < 0.5 ? 2 : 5;
      const cociente = Math.floor(Math.random() * 4) + 2; // 2-5
      const dividendo = divisor * cociente;
      
      correctVal = cociente;
      qText = `${dividendo} ÷ ${divisor}`;
      qSpoken = `División. ¿Cuánto es ${dividendo} dividido por ${divisor}?`;
      break;
    }
    
    case 6: {
      levelName = "Nivel 6: Ecuaciones de un paso";
      // Ecuaciones súper fáciles tipo x + a = b o x - a = b con x, a entre 1 y 5
      const isSuma = Math.random() < 0.5;
      const x = Math.floor(Math.random() * 4) + 2; // x en 2-5 (respuesta correcta)
      const a = Math.floor(Math.random() * 3) + 1; // a en 1-3
      
      correctVal = x;
      if (isSuma) {
        const b = x + a;
        qText = `x + ${a} = ${b}`;
        qSpoken = `Encuentra equis. equis más ${a} es igual a ${b}. ¿Cuánto vale equis?`;
      } else {
        const b = x - a;
        // Evitar b <= 0
        const paramA = b <= 0 ? a - b + 1 : a;
        const valB = x - paramA;
        qText = `x - ${paramA} = ${valB}`;
        qSpoken = `Encuentra equis. equis menos ${paramA} es igual a ${valB}. ¿Cuánto vale equis?`;
      }
      break;
    }
  }
  
  // Generar 3 opciones incorrectas únicas muy cercanas al valor correcto
  const incorrects = new Set();
  
  while (incorrects.size < 3) {
    let candidate = 0;
    const rand = Math.random();
    
    if (rand < 0.35) {
      candidate = correctVal + 1;
    } else if (rand < 0.70) {
      candidate = correctVal - 1;
    } else if (rand < 0.85) {
      candidate = correctVal + 2;
    } else {
      candidate = correctVal - 2;
    }
    
    if (candidate > 0 && candidate !== correctVal) {
      incorrects.add(candidate);
    }
  }
  
  // Si no logramos tener 3 opciones únicas, rellenamos con consecutivos
  let fallback = 1;
  while (incorrects.size < 3) {
    if (fallback !== correctVal) {
      incorrects.add(fallback);
    }
    fallback++;
  }
  
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- ELEMENTOS DEL DOM ---
const elements = {};

// Cargar marcadores iniciales
function initStats() {
  elements.streakDisplay.textContent = state.streak;
  elements.scoreDisplay.textContent = state.score;
  elements.recordDisplay.textContent = state.highScore;
}

// Renderizar nueva pregunta
function renderQuestion() {
  clearTimeout(state.autoAdvanceTimer);
  generateQuestion();
  state.isAnswered = false;
  
  elements.levelIndicator.textContent = state.currentQuestion.levelName;
  elements.questionText.textContent = state.currentQuestion.text;
  
  elements.optionBtns.forEach((btn, idx) => {
    btn.classList.remove('correct', 'incorrect', 'disabled');
    btn.setAttribute('aria-checked', 'false');
    btn.removeAttribute('aria-label');
    
    const val = state.currentQuestion.options[idx];
    btn.querySelector('.option-value').textContent = val;
  });
  
  // Lectura automática de voz al aparecer la pregunta
  speakText(state.currentQuestion.spoken);
}

// Procesar respuesta seleccionada
function handleAnswer(selectedIndex) {
  if (!state.currentQuestion || state.isAnswered) return;
  state.isAnswered = true;
  
  const selectedVal = state.currentQuestion.options[selectedIndex];
  const correctVal = state.currentQuestion.correctAnswer;
  const isCorrect = selectedVal === correctVal;
  
  // Deshabilitar botones visualmente e indicar estados
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
    
    state.streak++;
    const pointsGained = state.level * 10;
    state.score += pointsGained;
    
    // Actualizar Récord Histórico si corresponde
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('matefacil_high_score_v2', state.highScore);
    }
    
    updateStatsDOM();
    
    // Anuncio auditivo para lector de pantalla y voz sintética
    const feedbackText = `¡Correcto! Marcaste ${selectedVal}.`;
    elements.srFeedback.textContent = feedbackText;
    speakText(feedbackText);
    
    // Auto-avance rápido en 2.3 segundos
    state.autoAdvanceTimer = setTimeout(renderQuestion, 2300);
    
  } else {
    // Respuesta Incorrecta
    playIncorrectSound();
    elements.optionBtns[selectedIndex].classList.add('incorrect');
    
    // Buscar y resaltar cuál era la correcta
    elements.optionBtns.forEach((btn, idx) => {
      if (state.currentQuestion.options[idx] === correctVal) {
        btn.classList.add('correct');
      }
    });
    
    // Reiniciar racha (sin restar vidas ni bloquear la pantalla)
    state.streak = 0;
    updateStatsDOM();
    
    // Anuncio auditivo explicativo
    const feedbackText = `Incorrecto. Marcaste ${selectedVal}. La respuesta correcta era ${correctVal}.`;
    elements.srFeedback.textContent = feedbackText;
    speakText(feedbackText);
    
    // Auto-avance más lento (3.5 segundos) para dar tiempo a asimilar la respuesta correcta
    state.autoAdvanceTimer = setTimeout(renderQuestion, 3500);
  }
}

function updateStatsDOM() {
  elements.streakDisplay.textContent = state.streak;
  elements.scoreDisplay.textContent = state.score;
  elements.recordDisplay.textContent = state.highScore;
}

// --- SOPORTE DE TECLADO ---
document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (state.currentQuestion && !state.isAnswered) {
    if (key === '1') handleAnswer(0);
    if (key === '2') handleAnswer(1);
    if (key === '3') handleAnswer(2);
    if (key === '4') handleAnswer(3);
  }
});

// --- INICIALIZACIÓN INMEDIATA ---
window.addEventListener('DOMContentLoaded', () => {
  // Inicialización segura del DOM
  elements.body = document.body;
  elements.streakDisplay = document.getElementById('streak-display');
  elements.scoreDisplay = document.getElementById('score-display');
  elements.recordDisplay = document.getElementById('record-display');
  elements.levelIndicator = document.getElementById('level-indicator');
  elements.questionText = document.getElementById('question-text');
  elements.optionBtns = document.querySelectorAll('.option-btn');
  elements.srFeedback = document.getElementById('sr-feedback');

  // Registrar listeners de clic tras la carga
  elements.optionBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      handleAnswer(idx);
    });
  });

  initStats();
  
  // Mensaje de bienvenida muy amigable e inicio inmediato
  speakText("Bienvenido a MateFácil. Vamos a empezar.");
  
  setTimeout(() => {
    renderQuestion();
  }, 2200);
});
