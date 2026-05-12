// === Dopamind — Mobile App with Native Powers ===

// --- Capacitor Plugin Imports (graceful fallback for browser) ---
let Haptics, LocalNotifications, Preferences;
let isNative = false;

try {
  const { Capacitor } = await import('@capacitor/core');
  isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const hapticsMod = await import('@capacitor/haptics');
    const notifMod = await import('@capacitor/local-notifications');
    const prefsMod = await import('@capacitor/preferences');
    
    Haptics = hapticsMod.Haptics;
    LocalNotifications = notifMod.LocalNotifications;
    Preferences = prefsMod.Preferences;
    
    // Request notification permissions
    LocalNotifications.requestPermissions().catch(() => {});
  }
} catch (e) {
  console.log('Running in browser mode — native features disabled');
}

// --- Gentle Haptics ---
async function gentlePulse() {
  if (!Haptics) return;
  try {
    await Haptics.impact({ style: 'light' });
  } catch (e) {}
}

async function gentleSuccess() {
  if (!Haptics) return;
  try {
    await Haptics.notification({ type: 'success' });
  } catch (e) {}
}

// --- Storage Helpers ---
async function saveToStorage(key, value) {
  try {
    if (Preferences) {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {}
}

async function loadFromStorage(key, defaultValue = null) {
  try {
    if (Preferences) {
      const result = await Preferences.get({ key });
      return result.value ? JSON.parse(result.value) : defaultValue;
    } else {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
  } catch (e) {
    return defaultValue;
  }
}

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tab).classList.add('active');
    gentlePulse();
  });
});

// --- Task Baker ---
const taskTemplates = {
  default: (task) => [
    { text: `open the right app/tool for "${task}"`, time: '2 min' },
    { text: `gather what you need for "${task}"`, time: '3 min' },
    { text: `do the smallest first step of "${task}"`, time: '5 min' },
    { text: `continue with the next small piece`, time: '10 min' },
    { text: `wrap up and save your work`, time: '3 min' },
  ],
  writing: (task) => [
    { text: `open a blank doc and write the title`, time: '1 min' },
    { text: `brain-dump 3 bullet points on ${task}`, time: '5 min' },
    { text: `expand one bullet into a paragraph`, time: '8 min' },
    { text: `write the intro sentence`, time: '3 min' },
    { text: `fill in the gaps between your points`, time: '10 min' },
    { text: `read once and fix the clunky bits`, time: '5 min' },
  ],
  research: (task) => [
    { text: `write down exactly what you're looking for`, time: '2 min' },
    { text: `search and open 3 promising links`, time: '5 min' },
    { text: `skim the first source and note one fact`, time: '5 min' },
    { text: `skim the second source and note one fact`, time: '5 min' },
    { text: `compare what you found — any contradictions?`, time: '5 min' },
  ],
  call: (task) => [
    { text: `write down the one thing you need from this call`, time: '2 min' },
    { text: `find the number/contact`, time: '2 min' },
    { text: `dial and breathe — you only need to say hello`, time: '1 min' },
    { text: `make the call`, time: '10 min' },
    { text: `note down what was decided`, time: '2 min' },
  ],
};

function detectTemplate(task) {
  const t = task.toLowerCase();
  if (t.includes('write') || t.includes('draft') || t.includes('email') || t.includes('report')) return 'writing';
  if (t.includes('research') || t.includes('find') || t.includes('look up') || t.includes('search')) return 'research';
  if (t.includes('call') || t.includes('phone') || t.includes('meet')) return 'call';
  return 'default';
}

let currentMicroTasks = [];

async function renderMicroTasks() {
  const container = document.getElementById('micro-tasks');
  if (currentMicroTasks.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = '';
  currentMicroTasks.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = `micro-task ${step.completed ? 'completed' : ''}`;
    div.innerHTML = `
      <div class="task-checkbox">${step.completed ? '✓' : ''}</div>
      <div class="task-text">${step.text}<small>~${step.time}</small></div>
    `;
    div.addEventListener('click', async () => {
      step.completed = !step.completed;
      div.classList.toggle('completed');
      const checkbox = div.querySelector('.task-checkbox');
      if (step.completed) {
        checkbox.innerHTML = '✓';
        showWinToast(['nice! 🎉', 'tiny win! ✨', 'one down! 🌟', 'you did it! 🌙'][i % 4]);
        await gentleSuccess();
      } else {
        checkbox.innerHTML = '';
      }
      await saveToStorage('microTasks', currentMicroTasks);
    });
    container.appendChild(div);
  });
}

document.getElementById('bake-btn').addEventListener('click', async () => {
  const input = document.getElementById('big-task');
  const task = input.value.trim();
  if (!task) return;

  gentlePulse();
  
  const template = detectTemplate(task);
  const steps = taskTemplates[template](task);
  currentMicroTasks = steps.map(s => ({ ...s, completed: false }));
  
  await renderMicroTasks();
  await saveToStorage('microTasks', currentMicroTasks);
  
  input.value = '';
});

// Load saved micro tasks
loadFromStorage('microTasks', []).then(tasks => {
  if (tasks && tasks.length) {
    currentMicroTasks = tasks;
    renderMicroTasks();
  }
});

// Energy buttons
document.querySelectorAll('.energy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gentlePulse();
  });
});

// --- Soft Timer with Native Notifications ---
let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let isRunning = false;
let notificationScheduled = false;

const timerDisplay = document.getElementById('timer-display');
const timerCircle = document.getElementById('timer-circle');
const btnStart = document.getElementById('timer-start');
const btnPause = document.getElementById('timer-pause');
const btnReset = document.getElementById('timer-reset');
const circumference = 2 * Math.PI * 85;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerVisual() {
  const offset = circumference - (timerRemaining / timerDuration) * circumference;
  timerCircle.style.strokeDashoffset = offset;
  timerDisplay.textContent = formatTime(timerRemaining);
}

async function scheduleTimerNotification(seconds) {
  if (!LocalNotifications || notificationScheduled) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'gentle focus complete 🌙',
        body: 'you did great. take a breath.',
        id: 'dopamind-timer',
        schedule: { at: new Date(Date.now() + seconds * 1000) },
        sound: 'default',
        channelId: 'timer',
      }]
    });
    notificationScheduled = true;
  } catch (e) {}
}

async function cancelTimerNotification() {
  if (!LocalNotifications || !notificationScheduled) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 'dopamind-timer' }] });
    notificationScheduled = false;
  } catch (e) {}
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  btnStart.disabled = true;
  btnPause.disabled = false;
  btnStart.textContent = 'Running...';
  
  scheduleTimerNotification(timerRemaining);

  timerInterval = setInterval(async () => {
    timerRemaining--;
    updateTimerVisual();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      btnStart.disabled = false;
      btnPause.disabled = true;
      btnStart.textContent = '▶ Start';
      notificationScheduled = false;
      showWinToast('gentle focus complete. you did great 🌙');
      await gentleSuccess();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  btnStart.disabled = false;
  btnPause.disabled = true;
  btnStart.textContent = '▶ Resume';
  cancelTimerNotification();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  timerRemaining = timerDuration;
  updateTimerVisual();
  btnStart.disabled = false;
  btnPause.disabled = true;
  btnStart.textContent = '▶ Start';
  cancelTimerNotification();
}

btnStart.addEventListener('click', () => { gentlePulse(); startTimer(); });
btnPause.addEventListener('click', () => { gentlePulse(); pauseTimer(); });
btnReset.addEventListener('click', () => { gentlePulse(); resetTimer(); });

// Timer presets
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mins = parseInt(btn.dataset.min);
    timerDuration = mins * 60;
    resetTimer();
    gentlePulse();
  });
});

// --- Parking Lot with Persistence ---
const brainDump = document.getElementById('brain-dump');
const parkBtn = document.getElementById('park-btn');
const parkedList = document.getElementById('parked-items');
const sortBtn = document.getElementById('sort-parked');
const clearBtn = document.getElementById('clear-parked');

let parked = [];

async function renderParked() {
  if (parked.length === 0) {
    parkedList.innerHTML = '<p class="empty-state">your parking lot is empty. that\'s okay.</p>';
    return;
  }
  parkedList.innerHTML = '';
  parked.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'parked-item';
    div.innerHTML = `
      <span>${item.text}</span>
      ${item.tag ? `<span class="tag">${item.tag}</span>` : ''}
      <button data-index="${i}">×</button>
    `;
    div.querySelector('button').addEventListener('click', async () => {
      parked.splice(i, 1);
      await renderParked();
      await saveToStorage('parked', parked);
      gentlePulse();
    });
    parkedList.appendChild(div);
  });
}

parkBtn.addEventListener('click', async () => {
  const text = brainDump.value.trim();
  if (!text) return;
  parked.push({ text, tag: null });
  brainDump.value = '';
  await renderParked();
  await saveToStorage('parked', parked);
  showWinToast('parked safely 🅿️');
  gentlePulse();
});

sortBtn.addEventListener('click', async () => {
  const categories = {
    'errand': ['buy', 'pick up', 'get', 'shop', 'grocery', 'store'],
    'call': ['call', 'phone', 'text', 'email', 'message', 'reach out'],
    'work': ['report', 'deadline', 'meeting', 'project', 'client', 'boss'],
    'health': ['doctor', 'gym', 'exercise', 'meds', 'appointment', 'dentist'],
    'personal': ['birthday', 'gift', 'family', 'friend', 'mom', 'dad'],
  };

  parked = parked.map(item => {
    const lower = item.text.toLowerCase();
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lower.includes(k))) {
        return { ...item, tag: cat };
      }
    }
    return { ...item, tag: 'other' };
  });

  parked.sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
  await renderParked();
  await saveToStorage('parked', parked);
  showWinToast('sorted by vibe ✨');
  gentlePulse();
});

clearBtn.addEventListener('click', async () => {
  if (parked.length === 0) return;
  if (confirm('clear all parked items?')) {
    parked = [];
    await renderParked();
    await saveToStorage('parked', parked);
  }
});

// Load saved parking lot
loadFromStorage('parked', []).then(items => {
  if (items && items.length) {
    parked = items;
    renderParked();
  }
});

// --- Tiny Win Toast ---
function showWinToast(message) {
  const toast = document.getElementById('win-toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.key === 'Enter') {
    if (e.target.id === 'big-task') document.getElementById('bake-btn').click();
    if (e.target.id === 'brain-dump') document.getElementById('park-btn').click();
  }
});

// --- Initialize ---
updateTimerVisual();
console.log('🌙 Dopamind loaded — native mode:', isNative);
