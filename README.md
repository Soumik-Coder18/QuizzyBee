# QuizzyBee

A lightweight, accessible, responsive quiz web app (HTML + CSS + vanilla JavaScript). It supports multiple-choice questions, timers, instant feedback, per-question scoring, progress tracking, and an optional Open Trivia DB integration. The app is optimized for students and educators for quick practice and low friction testing.

## Quick start

1. Open `index.html` in a modern browser (Chrome/Firefox/Edge/Safari). No build step.
2. Choose settings (mode, timer, source) and Start Quiz.
3. Optionally Resume a saved session (stored in `localStorage`).

## Features

- Practice and Test modes
- Per-question timer with animated ring; auto-skip on timeout
- Live progress and end summary with JSON export
- Shuffle questions and choices
- Load from Open Trivia DB (fetch) or local `questions.json` with fallback
- Keyboard accessible: 1-4 to select, Enter to advance, arrows for prev/next
- ARIA live announcements, visible focus, high-contrast option
- Sound feedback toggle

## Open Trivia DB configuration

In Settings select "Open Trivia DB" and optionally set Category ID and Difficulty.

Example fetch snippet:

```js
async function fetchQuestions() {
  const url = 'https://opentdb.com/api.php?amount=10&type=multiple&encode=url3986';
  const res = await fetch(url);
  const data = await res.json();
  return data.results.map(q => ({
    id: crypto.randomUUID(),
    question: decodeURIComponent(q.question),
    correct: decodeURIComponent(q.correct_answer),
    choices: shuffle([ ...q.incorrect_answers.map(decodeURIComponent), decodeURIComponent(q.correct_answer) ]),
    category: decodeURIComponent(q.category),
    difficulty: decodeURIComponent(q.difficulty)
  }));
}
```

## Local JSON format

See `questions.json`:

```json
[
  {
    "id": "q1",
    "question": "What is the capital of France?",
    "choices": ["Paris", "London", "Rome", "Berlin"],
    "correct": "Paris",
    "timeLimit": 30
  }
]
```

## Accessibility notes

- Semantic HTML: `main`, `header`, `form`, `fieldset`, `legend`
- ARIA live region announces key events
- Focus states are visible; number keys select choices; Enter advances
- Contrast targets WCAG AA; High-contrast toggle available

## Persistence

The app saves the session to `localStorage` (answers, current question, timer, settings). Use Resume to continue. Use Retry to reset and clear saved state.

## Size and performance

- Single-page, no frameworks
- Minimal assets; optional Google Fonts

## Development

Just edit `index.html`, `styles.css`, `app.js`, `questions.json`. Use a local server if you need CORS for fetch from file URLs (or open via http://localhost).

