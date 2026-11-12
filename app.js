import { ANSWERS, scoreGuess, nextAnswer, emptyStats, recordResult } from "./logic.mjs";

const STORAGE_KEY = "wordle-ultra:save-v1";
const keyboardRows = [
  [..."QWERTYUIOP"],
  [..."ASDFGHJKL"],
  ["ENTER", ..."ZXCVBNM", "BACKSPACE"]
];
const ranks = { absent: 1, present: 2, correct: 3 };
const $ = (id) => document.getElementById(id);

let allowedWords = new Set(ANSWERS);
let answerPool = ANSWERS;
let ready = false;
let revealing = false;
const FLIP_DURATION_MS = 660;
const FLIP_STAGGER_MS = 165;
let toastTimeout;
let installPrompt = null;

function loadState() {
  const fresh = { version: 1, theme: "dark", serial: 0, bag: [], stats: emptyStats(), round: null };
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!data || data.version !== 1) return fresh;
    const s = data.stats || {};
    const int = (x) => Number.isSafeInteger(x) && x >= 0 ? x : 0;
    fresh.stats = {
      played: int(s.played),
      wins: int(s.wins),
      streak: int(s.streak),
      maxStreak: int(s.maxStreak),
      distribution: Array.isArray(s.distribution) && s.distribution.length === 6
        ? s.distribution.map(int) : [0, 0, 0, 0, 0, 0]
    };
    fresh.theme = data.theme === "light" ? "light" : "dark";
    fresh.serial = int(data.serial);
    fresh.bag = Array.isArray(data.bag) ? data.bag.filter(w => typeof w === "string") : [];
    const r = data.round;
    if (r && typeof r.answer === "string" && /^[a-z]{5}$/.test(r.answer) &&
        Array.isArray(r.guesses) && ["playing", "won", "lost"].includes(r.status)) {
      fresh.round = {
        answer: r.answer,
        guesses: r.guesses.filter(g => typeof g === "string" && /^[a-z]{5}$/.test(g)).slice(0, 6),
        current: typeof r.current === "string" && /^[a-z]{0,5}$/.test(r.current) ? r.current : "",
        status: r.status,
        serial: int(r.serial) || 1
      };
    }
  } catch {
    // Private browsing or corrupt storage should never prevent the game from loading.
  }
  return fresh;
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function changeTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  save();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("theme-button").setAttribute("aria-label",
    state.theme === "dark" ? "切換成淺色主題" : "切換成深色主題");
  document.querySelector('meta[name="theme-color"]').content =
    state.theme === "dark" ? "#191a1c" : "#f7f7f5";
}

function startRound() {
  const selection = nextAnswer(answerPool, state.bag, state.round?.answer || "");
  state.bag = selection.bag;
  state.serial += 1;
  state.round = { answer: selection.answer, guesses: [], current: "", status: "playing", serial: state.serial };
  $("message").textContent = "";
  save();
  render();
}

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("visible"), 1900);
  if (navigator.vibrate) navigator.vibrate(12);
}

// Only one reveal may run at a time. The final result and keyboard clues stay
// hidden until the whole row has turned over.
function revealGuess(guess) {
  const round = state.round;
  const row = $("board").children[round.guesses.length - 1];
  const tiles = [...row.children];
  const clues = scoreGuess(guess, round.answer);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  function finish() {
    revealing = false;
    renderKeyboard();
    renderResult();
    updateStats();
    const result = round.status === "won" ? "答對了" :
      round.status === "lost" ? "答案是 " + round.answer.toUpperCase() : "已送出猜測";
    $("message").textContent = result;
    if (round.status === "won" || round.status === "lost") toast(result);
  }

  if (reducedMotion) {
    clues.forEach((clue, index) => { tiles[index].dataset.state = clue; });
    finish();
    return;
  }

  Promise.all(tiles.map((tile, index) => new Promise(resolve => {
    window.setTimeout(() => {
      tile.classList.add("is-flipping");
      window.setTimeout(() => { tile.dataset.state = clues[index]; }, FLIP_DURATION_MS / 2);
      window.setTimeout(resolve, FLIP_DURATION_MS);
    }, index * FLIP_STAGGER_MS);
  }))).then(finish);
}

function handleKey(key) {
  if (!ready || !state.round || revealing) return;
  const round = state.round;
  if (round.status !== "playing") {
    if (key === "ENTER") startRound();
    return;
  }
  if (key === "BACKSPACE") {
    round.current = round.current.slice(0, -1);
  } else if (key === "ENTER") {
    if (round.current.length !== 5) return toast("需要輸入五個字母");
    const guess = round.current;
    if (!allowedWords.has(guess)) return toast("這個單字不在字典中");
    round.guesses.push(guess);
    round.current = "";
    if (guess === round.answer) {
      round.status = "won";
      state.stats = recordResult(state.stats, true, round.guesses.length);
    } else if (round.guesses.length === 6) {
      round.status = "lost";
      state.stats = recordResult(state.stats, false);
    }
    revealing = true;
    save();
    render();
    revealGuess(guess);
    return;
  } else if (/^[A-Z]$/.test(key) && round.current.length < 5) {
    round.current += key.toLowerCase();
  } else {
    return;
  }
  save();
  render();
}

function renderBoard() {
  const board = $("board");
  const round = state.round;
  board.replaceChildren();
  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    const row = document.createElement("div");
    row.className = "board-row";
    row.setAttribute("role", "row");
    const submitted = rowIndex < round.guesses.length;
    const current = rowIndex === round.guesses.length && round.status === "playing";
    const word = submitted ? round.guesses[rowIndex] : current ? round.current : "";
    const feedback = submitted && !(revealing && rowIndex === round.guesses.length - 1)
      ? scoreGuess(word, round.answer) : null;
    row.setAttribute("aria-label", "第 " + (rowIndex + 1) + " 次猜測：" +
      (word || "尚未輸入") + (feedback ? "，" + feedback.map(x =>
        x === "correct" ? "位置正確" : x === "present" ? "位置不對" : "不在答案中").join("、") : ""));
    for (let col = 0; col < 5; col++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("role", "gridcell");
      tile.textContent = (word[col] || "").toUpperCase();
      tile.dataset.state = feedback ? feedback[col] : word[col] ? "filled" : "empty";
      row.append(tile);
    }
    board.append(row);
  }
}

function keyboardKnowledge() {
  const known = {};
  const submitted = revealing ? state.round.guesses.slice(0, -1) : state.round.guesses;
  submitted.forEach(guess => {
    const feedback = scoreGuess(guess, state.round.answer);
    for (let i = 0; i < 5; i++) {
      const letter = guess[i].toUpperCase();
      if ((ranks[feedback[i]] || 0) > (ranks[known[letter]] || 0)) known[letter] = feedback[i];
    }
  });
  return known;
}

function renderKeyboard() {
  const known = keyboardKnowledge();
  const keyboard = $("keyboard");
  keyboard.replaceChildren();
  for (const rowLetters of keyboardRows) {
    const row = document.createElement("div");
    row.className = "keyboard-row";
    for (const key of rowLetters) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "key" + (key.length > 1 ? " key-wide" : "");
      b.dataset.key = key;
      b.dataset.state = known[key] || "unused";
      if (key === "BACKSPACE") {
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="backspace-icon"><path d="M9 4H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9L2 12l7-8Z"/><path d="m12 9 6 6m0-6-6 6"/></svg>';
      } else {
        b.textContent = key === "ENTER" ? "ENTER" : key;
      }
      b.setAttribute("aria-label", key === "ENTER" ? "送出猜測或進入下一題" :
        key === "BACKSPACE" ? "刪除字母" : "字母 " + key);
      row.append(b);
    }
    keyboard.append(row);
  }
}

function createButton(label, className, fn) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", fn);
  return button;
}

function renderResult() {
  const result = $("result-area");
  const round = state.round;
  result.replaceChildren();
  $("round-label").textContent = "ROUND " + round.serial;
  $("status-note").textContent = revealing ? "揭曉中" : round.status === "playing"
    ? "第 " + (round.guesses.length + 1) + " / 6 次猜測"
    : round.status === "won" ? "成功解開" : "本題結束";
  $("skip-button").hidden = revealing || round.status !== "playing";
  if (round.status === "playing" || revealing) {
    const hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = revealing ? "正在揭曉猜測結果" : "輸入 5 個字母，按 ENTER 送出";
    result.append(hint);
  } else {
    const label = document.createElement("span");
    label.className = "answer-label";
    label.textContent = round.status === "won"
      ? "答對了！ " + round.answer.toUpperCase()
      : "答案是 " + round.answer.toUpperCase();
    result.append(label,
      createButton("分享", "secondary-button", shareResult),
      createButton("下一題", "primary-button", startRound));
  }
}

function render() {
  if (!state.round) return;
  renderBoard();
  renderKeyboard();
  renderResult();
  updateStats();
}

function updateStats() {
  const s = state.stats;
  $("stat-played").textContent = s.played;
  $("stat-winrate").textContent = (s.played ? Math.round(100 * s.wins / s.played) : 0) + "%";
  $("stat-streak").textContent = s.streak;
  $("stat-max").textContent = s.maxStreak;
  const distribution = $("distribution");
  distribution.replaceChildren();
  const max = Math.max(1, ...s.distribution);
  s.distribution.forEach((n, i) => {
    const row = document.createElement("div");
    row.className = "dist-row";
    const number = document.createElement("span");
    number.textContent = i + 1;
    const bar = document.createElement("div");
    bar.className = "dist-track";
    const fill = document.createElement("div");
    fill.className = "dist-fill";
    fill.style.width = Math.max(n ? 12 : 0, n / max * 100) + "%";
    fill.textContent = n;
    bar.append(fill);
    row.append(number, bar);
    distribution.append(row);
  });
}

async function shareResult() {
  const r = state.round;
  const lines = r.guesses.map(g => scoreGuess(g, r.answer).map(x =>
    x === "correct" ? "🟩" : x === "present" ? "🟨" : "⬛").join(""));
  const result = "Wordle Ultra #" + r.serial + " " +
    (r.status === "won" ? r.guesses.length : "X") + "/6\n\n" + lines.join("\n") +
    "\n\nhttps://rayhuang2006.github.io/wordle-ultra/";
  try {
    if (navigator.share) {
      await navigator.share({ text: result });
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(result);
    } else {
      const input = document.createElement("textarea");
      input.value = result;
      document.body.append(input);
      input.select();
      if (!document.execCommand("copy")) throw new Error("Could not copy");
      input.remove();
    }
    toast("結果已複製到剪貼簿");
  } catch (err) {
    if (err.name !== "AbortError") toast("分享失敗，請再試一次");
  }
}

function wireEvents() {
  $("keyboard").addEventListener("click", event => {
    const key = event.target.closest("button[data-key]")?.dataset.key;
    if (key) handleKey(key);
  });
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
        document.querySelector("dialog[open]")) return;
    const key = event.key === "Enter" ? "ENTER" :
      event.key === "Backspace" ? "BACKSPACE" : event.key.toUpperCase();
    if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
      event.preventDefault();
      handleKey(key);
    }
  });
  $("skip-button").addEventListener("click", () => {
    if (ready && !revealing && state.round.status === "playing") {
      startRound();
      toast("已換成新單字（不計入成績）");
    }
  });
  $("theme-button").addEventListener("click", changeTheme);
  $("help-button").addEventListener("click", () => $("help-dialog").showModal());
  $("stats-button").addEventListener("click", () => $("stats-dialog").showModal());
  document.querySelectorAll("[data-close]").forEach(button =>
    button.addEventListener("click", () => $(button.dataset.close).close()));
  document.querySelectorAll("dialog").forEach(dialog =>
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    }));
  $("install-button").addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    } else {
      $("help-dialog").showModal();
    }
  });
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; });
}

async function boot() {
  applyTheme();
  wireEvents();
  try {
    const response = await fetch("./words.txt");
    if (!response.ok) throw new Error("Dictionary unavailable");
    const text = await response.text();
    allowedWords = new Set(text.split(/\s+/).filter(w => /^[a-z]{5}$/.test(w)));
    answerPool = ANSWERS.filter(w => allowedWords.has(w));
    if (!answerPool.length) throw new Error("No answers available");
    // Keep saved rounds compatible with future dictionary updates.
    if (state.round) allowedWords.add(state.round.answer);
  } catch (error) {
    // A partially cached older release can still play with the embedded common words.
    console.warn("Using the built-in offline vocabulary", error);
    allowedWords = new Set(ANSWERS);
    answerPool = ANSWERS;
  }
  ready = true;
  if (!state.round) startRound();
  else render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(err =>
      console.warn("Offline installation unavailable", err));
  }
}

boot();
