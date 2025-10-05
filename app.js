// QuizzyBee - Premium Quiz Application
// Enhanced with modern UI/UX, animations, and advanced features

// -------------- Enhanced Utilities --------------
class QuizzyBeeUtils {
  static shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static formatSeconds(s) {
    return String(Math.max(0, Math.floor(s))).padStart(2, '0');
  }

  static decodeUrl3986(str) {
    try { return decodeURIComponent(str); } catch { return str; }
  }

  static animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const value = start + (range * easeOut);
      
      element.textContent = Math.round(value);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  static createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        top: -10px;
        left: ${Math.random() * 100}vw;
        opacity: ${Math.random() + 0.5};
        transform: rotate(${Math.random() * 360}deg);
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(confetti);
      
      const animation = confetti.animate([
        { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 3000 + 2000,
        easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
      });
      
      animation.onfinish = () => confetti.remove();
    }
  }
}

// -------------- Enhanced Data Loading --------------
class QuizDataLoader {
  static async fetchFromOpenTrivia({ amount, category, difficulty }) {
    const params = new URLSearchParams({ 
      amount: String(amount), 
      type: 'multiple', 
      encode: 'url3986' 
    });
    if (category) params.set('category', String(category));
    if (difficulty) params.set('difficulty', String(difficulty));
    
    const url = `https://opentdb.com/api.php?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    const results = (data && data.results) ? data.results : [];
    
    return results.map(q => ({
      id: crypto.randomUUID(),
      question: QuizzyBeeUtils.decodeUrl3986(q.question),
      correct: QuizzyBeeUtils.decodeUrl3986(q.correct_answer),
      choices: QuizzyBeeUtils.shuffle([
        ...q.incorrect_answers.map(QuizzyBeeUtils.decodeUrl3986),
        QuizzyBeeUtils.decodeUrl3986(q.correct_answer)
      ]),
      category: QuizzyBeeUtils.decodeUrl3986(q.category || ''),
      difficulty: QuizzyBeeUtils.decodeUrl3986(q.difficulty || ''),
      timeLimit: undefined
    }));
  }

  static async fetchFromLocal() {
    try {
      const res = await fetch('./questions.json');
      if (!res.ok) throw new Error('Failed to load local questions');
      return await res.json();
    } catch (error) {
      console.error('Error loading local questions:', error);
      // Fallback to embedded questions
      return [
        {
          "id": "q1",
          "question": "What is the capital of France?",
          "choices": ["Paris", "London", "Rome", "Berlin"],
          "correct": "Paris",
          "category": "Geography",
          "difficulty": "easy",
          "timeLimit": 30
        },
        {
          "id": "q2", 
          "question": "2 + 2 equals?",
          "choices": ["3", "4", "5", "22"],
          "correct": "4",
          "category": "Mathematics",
          "difficulty": "easy",
          "timeLimit": 30
        },
        {
          "id": "q3",
          "question": "Which language runs in a web browser?",
          "choices": ["Java", "C", "Python", "JavaScript"],
          "correct": "JavaScript",
          "category": "Technology",
          "difficulty": "easy",
          "timeLimit": 30
        }
      ];
    }
  }
}

// -------------- Enhanced State Management --------------
class QuizStateManager {
  constructor() {
    this.state = {
      mode: 'practice',
      questions: [],
      currentIndex: 0,
      answers: {},
      timePerQuestion: 30,
      timer: { remaining: 0, intervalId: null, startedAt: 0 },
      shuffleQuestions: true,
      shuffleChoices: true,
      soundEnabled: false,
      highContrast: false,
      startedAt: 0,
      finishedAt: 0,
      displayChoicesMap: {},
      resumePending: false,
      theme: 'light',
      paused: false
    };
  }

  saveSession() {
    const toSave = { state: this.state };
    try {
      localStorage.setItem('quizzybee_session_v2', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Could not save session:', error);
    }
  }

  loadSession() {
    try {
      const raw = localStorage.getItem('quizzybee_session_v2');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.state ? parsed.state : null;
    } catch (error) {
      console.warn('Could not load session:', error);
      return null;
    }
  }

  clearSession() {
    try {
      localStorage.removeItem('quizzybee_session_v2');
    } catch (error) {
      console.warn('Could not clear session:', error);
    }
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.state.theme);
    this.saveSession();
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    if (this.state.paused) {
      this.stopTimer();
    } else {
      this.startTimer(this.state.timer.remaining);
    }
    this.saveSession();
  }
}

// -------------- Enhanced UI Components --------------
class QuizUI {
  constructor() {
    this.els = {};
    this.initializeElements();
    this.performanceChart = null;
  }

  initializeElements() {
    // Core elements
    this.els = {
      // Screens
      loadingScreen: document.getElementById('loadingScreen'),
      welcomeScreen: document.getElementById('welcome'),
      settingsScreen: document.getElementById('settings'),
      quizSection: document.getElementById('quiz'),
      summarySection: document.getElementById('summary'),
      
      // Welcome screen
      getStartedBtn: document.getElementById('getStartedBtn'),
      
      // Settings screen
      backToWelcome: document.getElementById('backToWelcome'),
      settingsForm: document.getElementById('settingsForm'),
      startBtn: document.getElementById('startBtn'),
      timePerQuestion: document.getElementById('timePerQuestion'),
      timeValue: document.getElementById('timeValue'),
      numQuestions: document.getElementById('numQuestions'),
      numberMinus: document.querySelector('.number-btn.minus'),
      numberPlus: document.querySelector('.number-btn.plus'),
      
      // Quiz screen
      progressBar: document.getElementById('progressBar'),
      progressCount: document.getElementById('progressCount'),
      timeLeft: document.getElementById('timeLeft'),
      timerPath: document.getElementById('timerPath'),
      questionText: document.getElementById('questionText'),
      categoryBadge: document.getElementById('categoryBadge'),
      difficultyBadge: document.getElementById('difficultyBadge'),
      choicesList: document.getElementById('choicesList'),
      questionPalette: document.getElementById('questionPalette'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      skipBtn: document.getElementById('skipBtn'),
      submitBtn: document.getElementById('submitBtn'),
      endBtn: document.getElementById('endBtn'),
      markReviewBtn: document.getElementById('markReviewBtn'),
      modeBadge: document.getElementById('modeBadge'),
      liveRegion: document.getElementById('liveRegion'),
      
      // Summary screen
      sumTotal: document.getElementById('sumTotal'),
      sumCorrect: document.getElementById('sumCorrect'),
      sumIncorrect: document.getElementById('sumIncorrect'),
      sumAccuracy: document.getElementById('sumAccuracy'),
      sumTime: document.getElementById('sumTime'),
      breakdownList: document.getElementById('breakdownList'),
      retryBtn: document.getElementById('retryBtn'),
      exportBtn: document.getElementById('exportBtn'),
      newQuizBtn: document.getElementById('newQuizBtn'),
      performanceChart: document.getElementById('performanceChart'),
      
      // Audio
      sndCorrect: document.getElementById('sndCorrect'),
      sndIncorrect: document.getElementById('sndIncorrect'),
      sndComplete: document.getElementById('sndComplete'),
      
      // Theme and menu
      themeToggle: document.getElementById('themeToggle'),
      quizMenuBtn: document.getElementById('quizMenuBtn'),
      quizMenu: document.getElementById('quizMenu'),
      closeMenu: document.getElementById('closeMenu'),
      pauseQuiz: document.getElementById('pauseQuiz'),
      restartQuiz: document.getElementById('restartQuiz'),
      viewSummary: document.getElementById('viewSummary'),
      
      // Modal
      confirmationModal: document.getElementById('confirmationModal'),
      modalTitle: document.getElementById('modalTitle'),
      modalMessage: document.getElementById('modalMessage'),
      modalCancel: document.getElementById('modalCancel'),
      modalConfirm: document.getElementById('modalConfirm'),
      
      // Resume
      resumeBtn: document.getElementById('resumeBtn')
    };
  }

  showScreen(screenName) {
    const screens = ['welcome', 'settings', 'quiz', 'summary'];
    screens.forEach(screen => {
      const element = this.els[`${screen}Screen`] || this.els[`${screen}Section`];
      if (element) {
        element.classList.add('hidden');
      }
    });

    const targetScreen = this.els[`${screenName}Screen`] || this.els[`${screenName}Section`];
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      targetScreen.focus();
    }
  }

  updateProgress(current, total) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    this.els.progressBar.style.width = percent + '%';
    this.els.progressBar.setAttribute('aria-valuenow', String(percent));
    this.els.progressCount.textContent = `Question ${current} / ${total}`;
  }

  buildChoiceButton(choiceText, index, selected, correctnessClass, disabled) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    
    btn.type = 'button';
    btn.className = `choice-btn ${correctnessClass || ''}`;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    btn.dataset.index = String(index);
    btn.dataset.value = choiceText;
    
    if (disabled) {
      btn.setAttribute('disabled', 'true');
      btn.setAttribute('aria-disabled', 'true');
    }

    const badge = document.createElement('span');
    badge.className = 'choice-index';
    badge.textContent = String(index + 1);
    
    const text = document.createElement('span');
    text.className = 'choice-text';
    text.textContent = choiceText;
    
    btn.appendChild(badge);
    btn.appendChild(text);
    li.appendChild(btn);
    
    return li;
  }

  renderQuestion(question, state) {
    if (!question) return;

    // Update question text with fade animation
    this.els.questionText.style.opacity = '0';
    setTimeout(() => {
      this.els.questionText.textContent = question.question;
      this.els.questionText.style.opacity = '1';
    }, 200);

    // Update category and difficulty
    const categoryText = this.els.categoryBadge.querySelector('.badge-text');
    categoryText.textContent = question.category || 'General Knowledge';
    
    if (question.difficulty) {
      this.els.difficultyBadge.innerHTML = `
        <i class="fas fa-star"></i>
        ${question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
      `;
      this.els.difficultyBadge.style.display = 'flex';
    } else {
      this.els.difficultyBadge.style.display = 'none';
    }

    // Clear and rebuild choices with animation
    this.els.choicesList.innerHTML = '';
    const userAns = state.answers[question.id];
    const selectedValue = userAns ? userAns.selected : null;

    let choices = state.displayChoicesMap[question.id];
    if (!choices) {
      choices = state.shuffleChoices ? QuizzyBeeUtils.shuffle(question.choices) : question.choices.slice();
      state.displayChoicesMap[question.id] = choices.slice();
    }

    const isAnswered = !!(userAns && userAns.selected !== undefined);
    
    choices.forEach((choice, index) => {
      let cls = '';
      if (state.mode === 'practice' && selectedValue) {
        if (choice === question.correct && selectedValue === choice) {
          cls = 'choice-correct';
        } else if (selectedValue === choice && choice !== question.correct) {
          cls = 'choice-incorrect';
        }
      }

      const choiceElement = this.buildChoiceButton(choice, index, selectedValue === choice, cls, false);
      
      choiceElement.style.opacity = '0';
      choiceElement.style.transform = 'translateY(20px)';
      
      this.els.choicesList.appendChild(choiceElement);
      
      setTimeout(() => {
        choiceElement.style.transition = 'all 0.3s ease';
        choiceElement.style.opacity = '1';
        choiceElement.style.transform = 'translateY(0)';
      }, index * 100);
    });

    // Update progress
    this.updateProgress(state.currentIndex + 1, state.questions.length);

    // Update question palette
    this.renderPalette(state);
  }

  renderPalette(state){
    const cont = this.els.questionPalette;
    if(!cont) return;
    cont.innerHTML = '';
    state.questions.forEach((q, idx)=>{
      const ans = state.answers[q.id];
      const isCurrent = idx === state.currentIndex;
      const isReview = !!(state.review && state.review[q.id]);
      const attempted = !!(ans && ans.selected !== undefined);
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'qp-item ' + (attempted ? 'qp-attempt' : 'qp-empty') + (isReview ? ' qp-review' : '') + (isCurrent ? ' qp-current' : '');
      div.textContent = String(idx+1);
      div.addEventListener('click', ()=>{
        state.currentIndex = idx;
        // re-render question
        const question = state.questions[state.currentIndex];
        this.renderQuestion(question, state);
      });
      cont.appendChild(div);
    });
  }

  showConfirmation(title, message, onConfirm) {
    this.els.modalTitle.textContent = title;
    this.els.modalMessage.textContent = message;
    this.els.confirmationModal.classList.remove('hidden');
    
    this.els.modalConfirm.onclick = () => {
      onConfirm();
      this.els.confirmationModal.classList.add('hidden');
    };
    
    this.els.modalCancel.onclick = () => {
      this.els.confirmationModal.classList.add('hidden');
    };
  }

  initializePerformanceChart(correct, incorrect, unanswered) {
    const ctx = this.els.performanceChart.getContext('2d');
    
    if (this.performanceChart) {
      this.performanceChart.destroy();
    }
    
    this.performanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect', 'Unanswered'],
        datasets: [{
          data: [correct, incorrect, unanswered],
          backgroundColor: [
            '#10b981',
            '#ef4444',
            '#6b7280'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }

  hideLoadingScreen() {
    this.els.loadingScreen.style.opacity = '0';
    setTimeout(() => {
      this.els.loadingScreen.classList.add('hidden');
    }, 500);
  }
}

// -------------- Enhanced Quiz Engine --------------
class QuizEngine {
  constructor(stateManager, ui) {
    this.stateManager = stateManager;
    this.ui = ui;
    this.state = stateManager.state;
    if(!this.state.review) this.state.review = {};
  }

  async startQuizFromSettings() {
    const form = this.ui.els.settingsForm;
    const formData = new FormData(form);
    
    // Update state from form
    this.state.mode = formData.get('mode');
    this.state.timePerQuestion = parseInt(this.ui.els.timePerQuestion.value) || 30;
    this.state.numQuestions = parseInt(this.ui.els.numQuestions.value) || 10;
    this.state.shuffleQuestions = document.getElementById('shuffleQuestions').checked;
    this.state.shuffleChoices = document.getElementById('shuffleChoices').checked;
    this.state.soundEnabled = document.getElementById('soundEnabled').checked;
    this.state.highContrast = document.getElementById('highContrast').checked;
    this.state.source = formData.get('source');
    this.state.otdbCategory = document.getElementById('otdbCategory').value || undefined;
    this.state.otdbDifficulty = document.getElementById('otdbDifficulty').value || undefined;

    // Apply high contrast mode
    document.documentElement.classList.toggle('high-contrast', this.state.highContrast);

    let questions = [];
    
    try {
      if (this.state.source === 'opentdb') {
        questions = await QuizDataLoader.fetchFromOpenTrivia({
          amount: this.state.numQuestions,
          category: this.state.otdbCategory,
          difficulty: this.state.otdbDifficulty
        });
      } else {
        questions = await QuizDataLoader.fetchFromLocal();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      this.ui.announce('Error loading questions. Using fallback questions.');
      questions = await QuizDataLoader.fetchFromLocal();
    }

    // Finalize questions
    if (this.state.shuffleQuestions) {
      questions = QuizzyBeeUtils.shuffle(questions);
    }
    if (questions.length > this.state.numQuestions) {
      questions = questions.slice(0, this.state.numQuestions);
    }

    // Reset state for new quiz
    Object.assign(this.state, {
      questions,
      currentIndex: 0,
      answers: {},
      startedAt: Date.now(),
      finishedAt: 0,
      displayChoicesMap: {},
      resumePending: false,
      paused: false
    });

    // Update UI
    this.ui.els.modeBadge.textContent = this.state.mode === 'practice' ? 'Practice Mode' : 'Test Mode';
    this.ui.showScreen('quiz');
    this.renderQuestion();
    this.stateManager.saveSession();
    this.ui.els.quizSection.focus();
    
    this.ui.announce(`Quiz started with ${questions.length} questions in ${this.state.mode} mode`);
  }

  renderQuestion() {
    const question = this.state.questions[this.state.currentIndex];
    if (!question) return;

    this.ui.renderQuestion(question, this.state);

    // Start or resume timer
    const timeLimit = question.timeLimit || this.state.timePerQuestion;
    if (this.state.resumePending && this.state.timer.remaining > 0) {
      this.startTimer(this.state.timer.remaining);
      this.state.resumePending = false;
    } else {
      this.startTimer(timeLimit);
    }

    // Update mark-for-review button state
    if(this.ui.els.markReviewBtn){
      const flagged = !!(this.state.review && this.state.review[question.id]);
      this.ui.els.markReviewBtn.setAttribute('aria-pressed', String(flagged));
      this.ui.els.markReviewBtn.innerHTML = flagged ? '<i class="fas fa-bookmark"></i> Unmark Review' : '<i class="fas fa-bookmark"></i> Mark for Review';
    }
  }

  startTimer(seconds) {
    this.stopTimer();
    
    this.state.timer.remaining = seconds;
    this.state.timer.startedAt = performance.now();
    this.updateTimerVisual();
    
    this.state.timer.intervalId = setInterval(() => {
      if (!this.state.paused) {
        this.state.timer.remaining -= 1;
        if (this.state.timer.remaining <= 0) {
          this.state.timer.remaining = 0;
          this.updateTimerVisual(true);
          this.stopTimer();
          this.handleAutoSkip();
        } else {
          this.updateTimerVisual();
        }
        this.stateManager.saveSession();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.state.timer.intervalId) {
      clearInterval(this.state.timer.intervalId);
      this.state.timer.intervalId = null;
    }
  }

  updateTimerVisual(timeUp = false) {
    const total = this.state.timePerQuestion;
    const remaining = this.state.timer.remaining;
    const percent = total > 0 ? (remaining / total) * 100 : 0;
    
    this.ui.els.timeLeft.textContent = QuizzyBeeUtils.formatSeconds(remaining);
    this.ui.els.timerPath.setAttribute('stroke-dasharray', `${percent}, 100`);
    
    const timerContainer = this.ui.els.timeLeft.closest('.timer');
    if (timerContainer) {
      if (remaining <= 5) {
        timerContainer.classList.add('low');
      } else {
        timerContainer.classList.remove('low');
      }
    }
    
    if (timeUp) {
      this.ui.announce('Time is up. Moving to next question.');
    }
  }

  selectChoice(value) {
    const question = this.state.questions[this.state.currentIndex];
    if (!question) return;

    // Allow changing answers in both modes prior to submission

    const timeTaken = (this.state.timePerQuestion - this.state.timer.remaining);
    this.state.answers[question.id] = {
      selected: value,
      correct: value === question.correct,
      timeTaken: Math.max(0, timeTaken)
    };

    if (this.state.mode === 'practice') {
      // Update choices UI without restarting timer
      this.ui.renderQuestion(question, this.state);
      
      // Play sound if enabled
      if (this.state.soundEnabled) {
        try {
          const sound = this.state.answers[question.id].correct ? 
            this.ui.els.sndCorrect : this.ui.els.sndIncorrect;
          sound.currentTime = 0;
          sound.play();
        } catch (error) {
          console.warn('Could not play sound:', error);
        }
      }
    }

    this.stateManager.saveSession();
  }

  nextQuestion() {
    if (this.state.currentIndex < this.state.questions.length - 1) {
      this.state.currentIndex++;
      this.renderQuestion();
      this.stateManager.saveSession();
    }
  }

  prevQuestion() {
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.renderQuestion();
      this.stateManager.saveSession();
    }
  }

  skipQuestion() {
    this.nextQuestion();
  }

  handleAutoSkip() {
    const question = this.state.questions[this.state.currentIndex];
    if (question && !this.state.answers[question.id]) {
      this.state.answers[question.id] = { 
        selected: null, 
        correct: false, 
        timeTaken: this.state.timePerQuestion 
      };
    }
    this.skipQuestion();
  }

  endQuiz() {
    this.stopTimer();
    this.state.finishedAt = Date.now();
    this.renderSummary();
    this.ui.showScreen('summary');
    this.stateManager.saveSession();
    
    // Celebration for good scores
    const correct = Object.values(this.state.answers).filter(a => a.correct).length;
    const total = this.state.questions.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    if (accuracy >= 80) {
      QuizzyBeeUtils.createConfetti();
      if (this.state.soundEnabled) {
        try {
          this.ui.els.sndComplete.currentTime = 0;
          this.ui.els.sndComplete.play();
        } catch (error) {
          console.warn('Could not play completion sound:', error);
        }
      }
    }
  }

  renderSummary() {
    const total = this.state.questions.length;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let totalTime = 0;

    this.state.questions.forEach(q => {
      const ans = this.state.answers[q.id];
      if (ans) {
        if (ans.correct) correct++;
        else if (ans.selected) incorrect++;
        else unanswered++;
        totalTime += ans.timeTaken || 0;
      } else {
        unanswered++;
      }
    });

    // Update summary cards with animations
    this.ui.els.sumTotal.textContent = total;
    QuizzyBeeUtils.animateValue(this.ui.els.sumCorrect, 0, correct, 1000);
    QuizzyBeeUtils.animateValue(this.ui.els.sumIncorrect, 0, incorrect, 1000);
    QuizzyBeeUtils.animateValue(this.ui.els.sumAccuracy, 0, Math.round((correct / total) * 100), 1000);
    this.ui.els.sumTime.textContent = Math.round(totalTime) + 's';

    // Initialize performance chart
    this.ui.initializePerformanceChart(correct, incorrect, unanswered);

    // Update breakdown list
    this.ui.els.breakdownList.innerHTML = '';
    this.state.questions.forEach((q, i) => {
      const li = document.createElement('li');
      const ans = this.state.answers[q.id];
      let status, statusClass;
      
      if (ans && ans.correct) {
        status = 'Correct';
        statusClass = 'correct';
      } else if (ans && ans.selected) {
        status = 'Incorrect';
        statusClass = 'incorrect';
      } else {
        status = 'Unanswered';
        statusClass = 'unanswered';
      }

      li.innerHTML = `
        <strong>${i + 1}. ${q.question}</strong>
        <span class="status ${statusClass}">${status}</span>
        ${ans && ans.selected ? `<br><small>Your answer: ${ans.selected}</small>` : ''}
        ${ans ? `<br><small>Time: ${Math.round(ans.timeTaken)}s</small>` : ''}
      `;
      
      this.ui.els.breakdownList.appendChild(li);
    });

    // Ensure breakdown is visible
    const detailsEl = this.ui.els.summarySection.querySelector('details');
    if (detailsEl) {
      detailsEl.open = true;
    }
  }

  exportResults() {
    const payload = {
      meta: {
        app: 'QuizzyBee',
        version: '2.0',
        startedAt: this.state.startedAt,
        finishedAt: this.state.finishedAt || Date.now(),
        mode: this.state.mode,
        timePerQuestion: this.state.timePerQuestion,
        totalQuestions: this.state.questions.length
      },
      questions: this.state.questions.map(q => ({
        id: q.id,
        question: q.question,
        correct: q.correct,
        category: q.category,
        difficulty: q.difficulty
      })),
      answers: this.state.answers,
      summary: {
        correct: Object.values(this.state.answers).filter(a => a.correct).length,
        total: this.state.questions.length,
        accuracy: Math.round((Object.values(this.state.answers).filter(a => a.correct).length / this.state.questions.length) * 100),
        totalTime: Object.values(this.state.answers).reduce((sum, a) => sum + (a.timeTaken || 0), 0)
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizzybee-results-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.ui.announce('Results exported successfully');
  }

  resumeQuiz() {
    const saved = this.stateManager.loadSession();
    if (saved) {
      Object.assign(this.state, saved);
      this.state.resumePending = true;
      this.ui.els.modeBadge.textContent = this.state.mode === 'practice' ? 'Practice Mode' : 'Test Mode';
      this.ui.showScreen('quiz');
      this.renderQuestion();
      this.ui.announce('Session resumed successfully');
    } else {
      this.ui.announce('No saved session found');
    }
  }
}

// -------------- Enhanced Event Manager --------------
class QuizEventManager {
  constructor(quizEngine, stateManager, ui) {
    this.quizEngine = quizEngine;
    this.stateManager = stateManager;
    this.ui = ui;
    this.state = stateManager.state;
  }

  initializeEvents() {
    this.initializeWelcomeEvents();
    this.initializeSettingsEvents();
    this.initializeQuizEvents();
    this.initializeSummaryEvents();
    this.initializeGlobalEvents();
  }

  initializeWelcomeEvents() {
    this.ui.els.getStartedBtn.addEventListener('click', () => {
      this.ui.showScreen('settings');
    });
  }

  initializeSettingsEvents() {
    this.ui.els.backToWelcome.addEventListener('click', () => {
      this.ui.showScreen('welcome');
    });

    this.ui.els.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.quizEngine.startQuizFromSettings();
    });

    // Time slider
    this.ui.els.timePerQuestion.addEventListener('input', (e) => {
      this.ui.els.timeValue.textContent = e.target.value + 's';
    });

    // Number input controls
    this.ui.els.numberMinus.addEventListener('click', () => {
      const input = this.ui.els.numQuestions;
      if (input.value > parseInt(input.min)) {
        input.value = parseInt(input.value) - 1;
      }
    });

    this.ui.els.numberPlus.addEventListener('click', () => {
      const input = this.ui.els.numQuestions;
      if (input.value < parseInt(input.max)) {
        input.value = parseInt(input.value) + 1;
      }
    });
  }

  initializeQuizEvents() {
    // Navigation
    this.ui.els.prevBtn.addEventListener('click', () => {
      this.quizEngine.prevQuestion();
    });

    this.ui.els.nextBtn.addEventListener('click', () => {
      if (this.state.mode === 'practice') {
        this.quizEngine.nextQuestion();
      } else {
        this.submitTestIfLastOrNext();
      }
    });

    this.ui.els.skipBtn.addEventListener('click', () => {
      this.quizEngine.skipQuestion();
    });

    this.ui.els.markReviewBtn.addEventListener('click', () => {
      const q = this.state.questions[this.state.currentIndex];
      if(!q) return;
      if(!this.state.review) this.state.review = {};
      const current = !!this.state.review[q.id];
      this.state.review[q.id] = !current;
      this.ui.els.markReviewBtn.setAttribute('aria-pressed', String(!current));
      this.quizEngine.renderQuestion();
      this.stateManager.saveSession();
    });

    this.ui.els.submitBtn.addEventListener('click', () => {
      this.ui.showConfirmation(
        'Submit Quiz',
        'Are you sure you want to submit your answers and view results?',
        () => this.quizEngine.endQuiz()
      );
    });

    this.ui.els.endBtn.addEventListener('click', () => {
      this.ui.showConfirmation(
        'End Quiz',
        'Are you sure you want to end the quiz? Your progress will be saved.',
        () => this.quizEngine.endQuiz()
      );
    });

    // Choice selection
    this.ui.els.choicesList.addEventListener('click', (e) => {
      const btn = e.target.closest('.choice-btn');
      if (btn && !btn.disabled) {
        this.quizEngine.selectChoice(btn.dataset.value);
      }
    });

    // Keyboard navigation
    this.initializeKeyboardEvents();
  }

  initializeSummaryEvents() {
    this.ui.els.retryBtn.addEventListener('click', () => {
      this.stateManager.clearSession();
      location.reload();
    });

    this.ui.els.exportBtn.addEventListener('click', () => {
      this.quizEngine.exportResults();
    });

    this.ui.els.newQuizBtn.addEventListener('click', () => {
      this.stateManager.clearSession();
      this.ui.showScreen('welcome');
    });
  }

  initializeGlobalEvents() {
    // Theme toggle
    this.ui.els.themeToggle.addEventListener('click', () => {
      this.stateManager.toggleTheme();
      const icon = this.ui.els.themeToggle.querySelector('i');
      icon.className = this.state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    });

    // Quiz menu
    this.ui.els.quizMenuBtn.addEventListener('click', () => {
      this.ui.els.quizMenu.classList.toggle('show');
    });

    this.ui.els.closeMenu.addEventListener('click', () => {
      this.ui.els.quizMenu.classList.remove('show');
    });

    this.ui.els.pauseQuiz.addEventListener('click', () => {
      this.stateManager.togglePause();
      const icon = this.ui.els.pauseQuiz.querySelector('i');
      icon.className = this.state.paused ? 'fas fa-play' : 'fas fa-pause';
      this.ui.els.pauseQuiz.innerHTML = this.state.paused ? 
        '<i class="fas fa-play"></i> Resume Quiz' : 
        '<i class="fas fa-pause"></i> Pause Quiz';
      this.ui.els.quizMenu.classList.remove('show');
    });

    this.ui.els.restartQuiz.addEventListener('click', () => {
      this.ui.showConfirmation(
        'Restart Quiz',
        'Are you sure you want to restart? All progress will be lost.',
        () => {
          this.stateManager.clearSession();
          location.reload();
        }
      );
    });

    this.ui.els.viewSummary.addEventListener('click', () => {
      this.quizEngine.endQuiz();
      this.ui.els.quizMenu.classList.remove('show');
    });

    // Resume button
    this.ui.els.resumeBtn.addEventListener('click', () => {
      this.quizEngine.resumeQuiz();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.quiz-menu') && !e.target.closest('#quizMenuBtn')) {
        this.ui.els.quizMenu.classList.remove('show');
      }
    });

    // Modal: close on outside click and Escape
    this.ui.els.confirmationModal.addEventListener('click', (e) => {
      if (e.target === this.ui.els.confirmationModal) {
        this.ui.els.confirmationModal.classList.add('hidden');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.ui.els.confirmationModal.classList.contains('hidden')) {
        this.ui.els.confirmationModal.classList.add('hidden');
      }
    });
  }

  initializeKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (this.ui.els.quizSection.classList.contains('hidden')) return;

      const key = e.key;
      
      // Number keys for answer selection
      if (key >= '1' && key <= '9') {
        const index = Number(key) - 1;
        const btn = this.ui.els.choicesList.querySelector(`.choice-btn[data-index="${index}"]`);
        if (btn && !btn.disabled) {
          this.quizEngine.selectChoice(btn.dataset.value);
          this.ui.announce(`Selected choice ${key}`);
        }
      }
      
      // Navigation keys
      else if (key === 'Enter') {
        if (this.state.mode === 'practice') {
          this.quizEngine.nextQuestion();
        } else {
          this.submitTestIfLastOrNext();
        }
      }
      else if (key === 'ArrowRight') {
        this.quizEngine.nextQuestion();
      }
      else if (key === 'ArrowLeft') {
        this.quizEngine.prevQuestion();
      }
      else if (key === ' ') { // Space bar to pause
        e.preventDefault();
        this.stateManager.togglePause();
      }
    });
  }

  submitTestIfLastOrNext() {
    if (this.state.currentIndex === this.state.questions.length - 1) {
      this.quizEngine.endQuiz();
    } else {
      this.quizEngine.nextQuestion();
    }
  }

  announce(message) {
    this.ui.announce(message);
  }
}

// -------------- Application Initialization --------------
class QuizzyBeeApp {
  constructor() {
    this.stateManager = new QuizStateManager();
    this.ui = new QuizUI();
    this.quizEngine = new QuizEngine(this.stateManager, this.ui);
    this.eventManager = new QuizEventManager(this.quizEngine, this.stateManager, this.ui);
  }

  async initialize() {
    // Show loading screen
    await this.simulateLoading();
    
    // Initialize theme
    const savedState = this.stateManager.loadSession();
    if (savedState && savedState.theme) {
      this.stateManager.state.theme = savedState.theme;
    }
    document.documentElement.setAttribute('data-theme', this.stateManager.state.theme);
    
    // Update theme toggle icon
    const themeIcon = this.ui.els.themeToggle.querySelector('i');
    themeIcon.className = this.stateManager.state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    
    // Initialize events
    this.eventManager.initializeEvents();
    
    // Hide loading screen and show welcome
    this.ui.hideLoadingScreen();
    setTimeout(() => {
      this.ui.showScreen('welcome');
    }, 300);
    
    // Check for resume availability
    if (this.stateManager.loadSession()) {
      this.ui.els.resumeBtn.style.display = 'flex';
    } else {
      this.ui.els.resumeBtn.style.display = 'none';
    }
  }

  async simulateLoading() {
    return new Promise(resolve => {
      setTimeout(resolve, 2000); // Simulate 2 second loading
    });
  }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
  const app = new QuizzyBeeApp();
  app.initialize();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}