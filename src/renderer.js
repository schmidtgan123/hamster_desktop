const pet = document.querySelector(".pet");
const petFrame = document.querySelector(".pet-frame");
const speech = document.querySelector(".speech");
const closeButton = document.querySelector(".close-button");

const config = {
  sleepAfterIdleMs: Number(window.hamsterPetConfig?.sleepAfterIdleMs) || 60_000,
  runningDurationMs:
    Number(window.hamsterPetConfig?.runningDurationMs) || 10 * 60_000,
  sleepingMomentMinMs:
    Number(window.hamsterPetConfig?.sleepingMomentMinMs) || 8_000,
  sleepingMomentMaxMs:
    Number(window.hamsterPetConfig?.sleepingMomentMaxMs) || 24_000
};

const framePath = (folder, index) =>
  `../assets/hamster-optimized/${folder}/frame_${String(index).padStart(4, "0")}.png`;

const frames = (folder, length, startIndex = 0) =>
  Array.from({ length }, (_frame, index) => framePath(folder, index + startIndex));

const animations = {
  idle: {
    fps: 4,
    frames: [
      ...frames("frames-idle", 6),
      ...frames("frames-idle", 5)
        .slice(1)
        .reverse()
    ]
  },
  sleep: {
    fps: 4,
    frames: frames("frames-sleep", 12)
  },
  sleeping: {
    fps: 4,
    frames: frames("frames-sleeping", 12)
  },
  running: {
    fps: 14,
    frames: frames("frames-running", 14, 2)
  },
  walk: {
    fps: 10,
    frames: frames("frames-walk", 12)
  }
};

const idleMoments = [
  { name: "idle", text: "吱？", duration: 4200 },
  { name: "sleepy", text: "有点困", duration: 5200 },
  { name: "idle", text: "在发呆", duration: 4600 }
];

const clickLines = ["摸摸！", "今天也要加油", "别捏脸", "我在巡逻", "吱吱"];
let animationTimer;
let animationFrame = 0;
let stateTimer;
let sleepTimer;
let sleepingMomentTimer;
let runningTimer;
let speechTimer;
let dragging = false;
let dragStartedAt = 0;
let lastDragScreenX = 0;
let facingScale = 1;
let currentState = "idle";

function preloadAnimationFrames() {
  Object.values(animations).forEach((animation) => {
    animation.frames.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  });
}

function playAnimation(name, { loop = true, onComplete } = {}) {
  const animation = animations[name];
  if (!animation) return;

  window.clearInterval(animationTimer);
  animationFrame = 0;
  petFrame.src = animation.frames[animationFrame];
  animationTimer = window.setInterval(() => {
    if (!loop && animationFrame >= animation.frames.length - 1) {
      window.clearInterval(animationTimer);
      if (onComplete) onComplete();
      return;
    }

    animationFrame = loop
      ? (animationFrame + 1) % animation.frames.length
      : animationFrame + 1;
    petFrame.src = animation.frames[animationFrame];
  }, 1000 / animation.fps);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleepingMomentDelay() {
  const min = Math.max(0, config.sleepingMomentMinMs);
  const max = Math.max(min, config.sleepingMomentMaxMs);
  return randomBetween(min, max);
}

function clearSleepingMomentTimer() {
  window.clearTimeout(sleepingMomentTimer);
}

function clearRunningTimer() {
  window.clearTimeout(runningTimer);
}

function scheduleSleepingMoment() {
  clearSleepingMomentTimer();

  if (currentState !== "sleeping") return;

  sleepingMomentTimer = window.setTimeout(() => {
    if (dragging || currentState !== "sleeping") return;

    playAnimation("sleeping", {
      loop: false,
      onComplete: () => {
        if (currentState !== "sleeping") return;

        petFrame.src =
          animations.sleep.frames[animations.sleep.frames.length - 1];
        scheduleSleepingMoment();
      }
    });
  }, sleepingMomentDelay());
}

function setFacingScale(nextScale) {
  if (facingScale === nextScale) return;

  facingScale = nextScale;
  pet.style.setProperty("--pet-facing-scale", String(facingScale));
}

function showSpeech(text, timeout = 1600) {
  window.clearTimeout(speechTimer);
  speech.textContent = text;
  speech.classList.add("show");
  speechTimer = window.setTimeout(() => {
    speech.classList.remove("show");
  }, timeout);
}

function setPetState(nextState) {
  clearSleepingMomentTimer();
  if (nextState !== "running") clearRunningTimer();

  currentState = nextState;
  pet.classList.remove(
    "idle",
    "happy",
    "sleepy",
    "snacking",
    "sleeping",
    "running",
    "walking"
  );
  pet.classList.add(nextState);

  if (nextState === "sleeping") {
    window.clearTimeout(stateTimer);
    playAnimation("sleep", {
      loop: false,
      onComplete: () => {
        if (currentState === "sleeping") scheduleSleepingMoment();
      }
    });
    return;
  }

  if (nextState === "running") {
    window.clearTimeout(stateTimer);
    playAnimation("running");
    return;
  }

  if (nextState === "walking") {
    playAnimation("walk");
    return;
  }

  playAnimation("idle");
}

function startRunningSession() {
  setPetState("running");
  showSpeech("跑起来！", 1400);

  runningTimer = window.setTimeout(() => {
    if (currentState !== "running") return;

    showSpeech("累了...", 1800);
    setPetState("sleeping");
  }, config.runningDurationMs);
}

function chooseQuietIdleState() {
  if (Math.random() < 0.5) {
    startRunningSession();
    return;
  }

  setPetState("sleeping");
  showSpeech("呼...", 1400);
}

function scheduleSleepAfterInactivity() {
  window.clearTimeout(sleepTimer);

  if (currentState === "sleeping" || currentState === "running") return;

  sleepTimer = window.setTimeout(() => {
    if (dragging) {
      scheduleSleepAfterInactivity();
      return;
    }

    if (currentState === "sleeping" || currentState === "running") return;

    chooseQuietIdleState();
  }, config.sleepAfterIdleMs);
}

function resetInactivitySleepTimer() {
  window.clearTimeout(sleepTimer);
  scheduleSleepAfterInactivity();
}

function scheduleIdleState(delay = 1600) {
  window.clearTimeout(stateTimer);
  stateTimer = window.setTimeout(() => {
    if (dragging || currentState === "sleeping" || currentState === "running") {
      return;
    }

    const next = idleMoments[Math.floor(Math.random() * idleMoments.length)];
    setPetState(next.name);
    showSpeech(next.text, Math.min(1800, next.duration - 500));
    scheduleIdleState(next.duration);
  }, delay);
}

function petRectOffset(event) {
  const rect = document.body.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startDragging(event) {
  if (event.button !== 0) return;

  dragging = true;
  dragStartedAt = Date.now();
  lastDragScreenX = event.screenX;
  setPetState("walking");
  resetInactivitySleepTimer();
  pet.classList.add("dragging");
  window.clearTimeout(stateTimer);
  window.clearTimeout(sleepTimer);
  window.petApi.startDrag(petRectOffset(event));
  pet.setPointerCapture(event.pointerId);
  showSpeech("带我去哪？", 1000);
}

function updateDragDirection(event) {
  if (!dragging) return;

  const deltaX = event.screenX - lastDragScreenX;
  lastDragScreenX = event.screenX;

  if (Math.abs(deltaX) < 1) return;

  setFacingScale(deltaX > 0 ? 1 : -1);
}

function stopDragging(event) {
  if (!dragging) return;

  dragging = false;
  pet.classList.remove("dragging");
  window.petApi.endDrag();

  try {
    pet.releasePointerCapture(event.pointerId);
  } catch (_error) {
    // Pointer capture can already be gone when macOS focus changes during drag.
  }

  setFacingScale(1);

  const wasClick = Date.now() - dragStartedAt < 220;
  if (wasClick) interact();
  if (!wasClick) {
    setPetState("idle");
  }
  resetInactivitySleepTimer();
  scheduleIdleState(900);
}

function interact() {
  resetInactivitySleepTimer();
  setPetState("happy");
  showSpeech(clickLines[Math.floor(Math.random() * clickLines.length)]);
  window.setTimeout(() => {
    setPetState("idle");
  }, 1200);
}

pet.addEventListener("pointerdown", startDragging);
pet.addEventListener("pointermove", updateDragDirection);
pet.addEventListener("pointerup", stopDragging);
pet.addEventListener("pointercancel", stopDragging);
pet.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    interact();
    resetInactivitySleepTimer();
    scheduleIdleState(1600);
  }
});

closeButton.addEventListener("click", () => {
  window.petApi.close();
});

window.addEventListener("blur", () => {
  if (dragging) {
    dragging = false;
    pet.classList.remove("dragging");
    setFacingScale(1);
    setPetState("idle");
    window.petApi.endDrag();
    resetInactivitySleepTimer();
    scheduleIdleState(900);
  }
});

preloadAnimationFrames();
setPetState("idle");
scheduleSleepAfterInactivity();
scheduleIdleState(1800);
