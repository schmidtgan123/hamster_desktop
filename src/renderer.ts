type DurationValue = string | number | null;
type PlaybackMode = "loop" | "once" | "pingPong";
type ReturnTarget = "root" | "fixedFrame" | "rootOnEnd";
type Facing = "left" | "right";

interface RandomTextConfig {
  random: string[];
}

type TextConfig = string | RandomTextConfig;

interface AnimationConfig {
  folder: string;
  fps: number;
  frames: number;
  startFrame?: number;
  playback: PlaybackMode;
}

interface BehaviorMomentConfig {
  action: string;
  className?: string;
  text?: TextConfig;
  duration: DurationValue;
}

interface TimedChildConfig {
  every: {
    min: DurationValue;
    max: DurationValue;
  };
  node: BehaviorNodeConfig;
}

interface FixedFrameConfig {
  action: string;
  animation: string;
  frame: "first" | "last" | number;
  children?: TimedChildConfig[];
}

interface NextNodeConfig {
  node: BehaviorNodeConfig;
}

interface WeightedNextNodeConfig extends NextNodeConfig {
  probability?: number;
}

type NextConfig = NextNodeConfig | WeightedNextNodeConfig[];

interface BehaviorNodeConfig {
  id?: string;
  action: string;
  className?: string;
  animation?: string;
  enterAnimation?: string;
  duration?: DurationValue;
  text?: TextConfig;
  textDuration?: DurationValue;
  moments?: BehaviorMomentConfig[];
  next?: NextConfig;
  fixedFrame?: FixedFrameConfig;
  facing?: Facing;
  return?: ReturnTarget;
}

interface EventNodeConfig {
  node: BehaviorNodeConfig;
}

interface DragEventConfig {
  text?: TextConfig;
  textDuration?: DurationValue;
  left: EventNodeConfig;
  right: EventNodeConfig;
}

interface EventConfig {
  pointerClick?: EventNodeConfig;
  keyboard?: EventNodeConfig;
  drag?: DragEventConfig;
}

interface BehaviorConfig {
  version: number;
  root: BehaviorNodeConfig;
  events: EventConfig;
  animations: Record<string, AnimationConfig>;
}

interface PetApi {
  getBehaviorConfig(): Promise<BehaviorConfig>;
  onKeyboardInput(callback: () => void): () => void;
  startDrag(offset: { x: number; y: number }): void;
  endDrag(): void;
  close(): void;
}

interface Window {
  petApi: PetApi;
}

type ActionConstructor = new (node: BehaviorNodeConfig) => HamsterAction;

interface AnimationPlaybackOptions {
  loop?: boolean;
  onComplete?: () => void;
}

interface RuntimeElements {
  pet: HTMLElement;
  petFrame: HTMLImageElement;
  speech: HTMLElement;
  closeButton: HTMLButtonElement;
}

class AnimationPlayer {
  private timer: number | undefined;
  private frameIndex = 0;
  private frameCache = new Map<string, string[]>();

  constructor(
    private readonly petFrame: HTMLImageElement,
    private readonly animations: Record<string, AnimationConfig>
  ) {}

  preload(): void {
    for (const name of Object.keys(this.animations)) {
      for (const src of this.framesFor(name)) {
        const image = new Image();
        image.src = src;
      }
    }
  }

  play(name: string, options: AnimationPlaybackOptions = {}): void {
    const animation = this.animations[name];
    const frames = this.framesFor(name);
    if (!animation || frames.length === 0) return;

    window.clearInterval(this.timer);
    this.frameIndex = 0;
    this.petFrame.src = frames[this.frameIndex];

    const shouldLoop = options.loop ?? animation.playback !== "once";
    this.timer = window.setInterval(() => {
      if (!shouldLoop && this.frameIndex >= frames.length - 1) {
        window.clearInterval(this.timer);
        this.timer = undefined;
        options.onComplete?.();
        return;
      }

      this.frameIndex = shouldLoop
        ? (this.frameIndex + 1) % frames.length
        : Math.min(frames.length - 1, this.frameIndex + 1);
      this.petFrame.src = frames[this.frameIndex];
    }, 1000 / animation.fps);
  }

  stopOnFrame(name: string, frame: FixedFrameConfig["frame"]): void {
    const frames = this.framesFor(name);
    if (frames.length === 0) return;

    window.clearInterval(this.timer);
    this.timer = undefined;

    if (frame === "first") {
      this.petFrame.src = frames[0];
      return;
    }

    if (frame === "last") {
      this.petFrame.src = frames[frames.length - 1];
      return;
    }

    const index = Math.min(frames.length - 1, Math.max(0, frame));
    this.petFrame.src = frames[index];
  }

  private framesFor(name: string): string[] {
    const cached = this.frameCache.get(name);
    if (cached) return cached;

    const animation = this.animations[name];
    if (!animation) return [];

    const startFrame = animation.startFrame ?? 0;
    const baseFrames = Array.from({ length: animation.frames }, (_frame, index) =>
      framePath(animation.folder, startFrame + index)
    );

    const frames =
      animation.playback === "pingPong"
        ? [...baseFrames, ...baseFrames.slice(1, -1).reverse(), baseFrames[0]]
        : baseFrames;

    this.frameCache.set(name, frames);
    return frames;
  }
}

class SpeechBubble {
  private timer: number | undefined;

  constructor(private readonly element: HTMLElement) {}

  show(text: string | undefined, timeoutMs = 1600): void {
    if (!text) return;

    window.clearTimeout(this.timer);
    this.element.textContent = text;
    this.element.classList.add("show");
    this.timer = window.setTimeout(() => {
      this.element.classList.remove("show");
    }, timeoutMs);
  }
}

class HamsterView {
  private facingScale = 1;
  private readonly knownClasses = new Set([
    "idle",
    "happy",
    "sleepy",
    "snacking",
    "sleeping",
    "running",
    "walking",
    "working"
  ]);

  readonly animations: AnimationPlayer;
  readonly speech: SpeechBubble;

  constructor(
    private readonly elements: RuntimeElements,
    private readonly config: BehaviorConfig
  ) {
    collectClassNames(config.root, this.knownClasses);
    collectEventClassNames(config, this.knownClasses);
    this.animations = new AnimationPlayer(elements.petFrame, config.animations);
    this.speech = new SpeechBubble(elements.speech);
  }

  applyNode(node: BehaviorNodeConfig): void {
    for (const className of this.knownClasses) {
      this.elements.pet.classList.remove(className);
    }

    if (node.className) {
      this.elements.pet.classList.add(node.className);
    }

    if (node.facing) {
      this.setFacing(node.facing);
    }
  }

  applyMoment(moment: BehaviorMomentConfig): void {
    if (!moment.className) return;

    for (const className of this.knownClasses) {
      this.elements.pet.classList.remove(className);
    }
    this.elements.pet.classList.add(moment.className);
  }

  setDragging(isDragging: boolean): void {
    this.elements.pet.classList.toggle("dragging", isDragging);
  }

  setFacing(facing: "left" | "right"): void {
    this.setFacingScale(facing === "left" ? -1 : 1);
  }

  resetFacing(): void {
    this.setFacingScale(1);
  }

  private setFacingScale(nextScale: number): void {
    if (this.facingScale === nextScale) return;

    this.facingScale = nextScale;
    this.elements.pet.style.setProperty("--pet-facing-scale", String(this.facingScale));
  }
}

class HamsterAction {
  constructor(protected readonly node: BehaviorNodeConfig) {}

  enter(engine: BehaviorEngine): void {
    engine.view.applyNode(this.node);
    engine.showNodeText(this.node);

    const animationName = this.node.animation;
    if (animationName) {
      engine.view.animations.play(animationName);
    }
  }

  exit(_engine: BehaviorEngine): void {}
}

class IdleAction extends HamsterAction {
  override enter(engine: BehaviorEngine): void {
    super.enter(engine);
    engine.scheduleMoments(this.node);
  }
}

class SleepAction extends HamsterAction {
  override enter(engine: BehaviorEngine): void {
    engine.view.applyNode(this.node);
    engine.showNodeText(this.node);

    const enterAnimation = this.node.enterAnimation ?? this.node.animation;
    if (enterAnimation) {
      engine.view.animations.play(enterAnimation, {
        loop: false,
        onComplete: () => engine.enterFixedFrame(this.node.fixedFrame)
      });
      return;
    }

    engine.enterFixedFrame(this.node.fixedFrame);
  }
}

class FixedFrameAction extends HamsterAction {
  enterFixedFrame(engine: BehaviorEngine, fixedFrame: FixedFrameConfig): void {
    engine.view.animations.stopOnFrame(fixedFrame.animation, fixedFrame.frame);
  }
}

class SleepBreathAction extends HamsterAction {
  override enter(engine: BehaviorEngine): void {
    engine.view.applyNode(this.node);
    engine.showNodeText(this.node);

    if (!this.node.animation) return;

    engine.view.animations.play(this.node.animation, {
      loop: false,
      onComplete: () => engine.returnFromSpecialAction(this.node)
    });
  }
}

class WheelRunAction extends HamsterAction {}
class WorkAction extends HamsterAction {}
class EatAction extends HamsterAction {}
class RunLeftAction extends HamsterAction {}
class RunRightAction extends HamsterAction {}
class HappyAction extends HamsterAction {}

const actionRegistry: Record<string, ActionConstructor> = {
  IdleAction,
  SleepAction,
  FixedFrameAction,
  SleepBreathAction,
  WheelRunAction,
  WorkAction,
  EatAction,
  RunLeftAction,
  RunRightAction,
  HappyAction
};

class BehaviorEngine {
  private currentAction: HamsterAction | undefined;
  private currentNode: BehaviorNodeConfig | undefined;
  private flowTimer: number | undefined;
  private momentTimer: number | undefined;
  private specialTimer: number | undefined;
  private activeFixedFrame: FixedFrameConfig | undefined;

  constructor(
    private readonly config: BehaviorConfig,
    readonly view: HamsterView
  ) {}

  start(): void {
    this.view.animations.preload();
    this.enterFlowNode(this.config.root);
  }

  enterFlowNode(node: BehaviorNodeConfig): void {
    this.clearFlowTimers();
    this.enterNode(node);
    this.scheduleFlowCompletion(node);
  }

  enterEventNode(node: BehaviorNodeConfig): void {
    this.clearFlowTimers();
    this.enterNode(node);

    const durationMs = parseDurationMs(node.duration);
    if (durationMs !== null) {
      this.flowTimer = window.setTimeout(() => {
        this.completeEventNode(node);
      }, durationMs);
    }
  }

  enterFixedFrame(fixedFrame: FixedFrameConfig | undefined): void {
    if (!fixedFrame) return;

    this.activeFixedFrame = fixedFrame;
    const FixedFrame = actionRegistry[fixedFrame.action] ?? FixedFrameAction;
    const action = new FixedFrame({ action: fixedFrame.action });
    if (action instanceof FixedFrameAction) {
      action.enterFixedFrame(this, fixedFrame);
    } else {
      action.enter(this);
    }
    this.scheduleFixedFrameChildren(fixedFrame);
  }

  returnFromSpecialAction(node: BehaviorNodeConfig): void {
    if (node.return === "fixedFrame") {
      this.enterFixedFrame(this.activeFixedFrame);
      return;
    }

    this.enterFlowNode(this.config.root);
  }

  scheduleMoments(node: BehaviorNodeConfig): void {
    if (!node.moments || node.moments.length === 0) return;

    const scheduleNext = (delayMs: number) => {
      window.clearTimeout(this.momentTimer);
      this.momentTimer = window.setTimeout(() => {
        if (this.currentNode !== node) return;

        const moment = node.moments?.[Math.floor(Math.random() * node.moments.length)];
        if (!moment) return;

        this.view.applyMoment(moment);
        this.view.speech.show(chooseText(moment.text), Math.min(1800, Math.max(0, (parseDurationMs(moment.duration) ?? 0) - 500)));

        scheduleNext(parseDurationMs(moment.duration) ?? 1600);
      }, delayMs);
    };

    scheduleNext(1800);
  }

  showNodeText(node: BehaviorNodeConfig): void {
    this.view.speech.show(chooseText(node.text), parseDurationMs(node.textDuration) ?? 1600);
  }

  returnToRoot(): void {
    this.enterFlowNode(this.config.root);
  }

  stopForDrag(): void {
    this.clearFlowTimers();
  }

  isCurrentNode(node: BehaviorNodeConfig | undefined): boolean {
    return Boolean(node && this.currentNode === node);
  }

  private enterNode(node: BehaviorNodeConfig): void {
    this.currentAction?.exit(this);
    this.currentNode = node;
    const Action = actionRegistry[node.action] ?? HamsterAction;
    this.currentAction = new Action(node);
    this.currentAction.enter(this);
  }

  private scheduleFlowCompletion(node: BehaviorNodeConfig): void {
    const durationMs = parseDurationMs(node.duration);
    if (durationMs === null) return;

    this.flowTimer = window.setTimeout(() => {
      const nextNode = chooseNextNode(node.next);
      this.enterFlowNode(nextNode ?? this.config.root);
    }, durationMs);
  }

  private completeEventNode(node: BehaviorNodeConfig): void {
    if (node.return === "root" || node.return === undefined) {
      this.enterFlowNode(this.config.root);
    }
  }

  private scheduleFixedFrameChildren(fixedFrame: FixedFrameConfig): void {
    window.clearTimeout(this.specialTimer);

    const child = fixedFrame.children?.[0];
    if (!child) return;

    this.specialTimer = window.setTimeout(() => {
      this.enterSpecialChild(child);
    }, randomChildDelay(child));
  }

  private enterSpecialChild(child: TimedChildConfig): void {
    this.clearFlowTimers({ keepFlowTimer: true });
    this.enterNode(child.node);
  }

  private clearFlowTimers(options: { keepFlowTimer?: boolean } = {}): void {
    if (!options.keepFlowTimer) {
      window.clearTimeout(this.flowTimer);
      this.flowTimer = undefined;
    }

    window.clearTimeout(this.momentTimer);
    this.momentTimer = undefined;
    window.clearTimeout(this.specialTimer);
    this.specialTimer = undefined;
  }
}

class InteractionController {
  private dragging = false;
  private dragStartedAt = 0;
  private dragStartScreenX = 0;
  private dragStartScreenY = 0;
  private lastDragScreenX = 0;
  private activeDragDirection: "left" | "right" | undefined;

  constructor(
    private readonly elements: RuntimeElements,
    private readonly engine: BehaviorEngine,
    private readonly config: BehaviorConfig
  ) {}

  bind(): void {
    this.elements.pet.addEventListener("pointerdown", (event) => this.startDragging(event));
    this.elements.pet.addEventListener("pointermove", (event) => this.updateDragDirection(event));
    this.elements.pet.addEventListener("pointerup", (event) => this.stopDragging(event));
    this.elements.pet.addEventListener("pointercancel", (event) => this.stopDragging(event));

    window.petApi.onKeyboardInput(() => {
      this.triggerKeyboard();
    });

    this.elements.closeButton.addEventListener("click", () => {
      window.petApi.close();
    });

    window.addEventListener("blur", () => {
      if (this.dragging) {
        this.finishDragWithoutClick();
      }
    });
  }

  private startDragging(event: PointerEvent): void {
    if (event.button !== 0) return;

    this.dragging = true;
    this.dragStartedAt = Date.now();
    this.dragStartScreenX = event.screenX;
    this.dragStartScreenY = event.screenY;
    this.lastDragScreenX = event.screenX;
    this.activeDragDirection = undefined;
    this.engine.stopForDrag();
    this.engine.view.setDragging(true);
    this.engine.view.resetFacing();
    window.petApi.startDrag(petRectOffset(event));
    this.elements.pet.setPointerCapture(event.pointerId);

    const dragConfig = this.config.events.drag;
    this.engine.view.speech.show(chooseText(dragConfig?.text), parseDurationMs(dragConfig?.textDuration) ?? 1000);
    this.enterDragNode("right");
  }

  private updateDragDirection(event: PointerEvent): void {
    if (!this.dragging) return;

    const deltaX = event.screenX - this.lastDragScreenX;
    this.lastDragScreenX = event.screenX;
    if (Math.abs(deltaX) < 1) return;

    this.enterDragNode(deltaX > 0 ? "right" : "left");
  }

  private stopDragging(event: PointerEvent): void {
    if (!this.dragging) return;

    const movementX = event.screenX - this.dragStartScreenX;
    const movementY = event.screenY - this.dragStartScreenY;
    const movementDistance = Math.hypot(movementX, movementY);
    const wasClick = Date.now() - this.dragStartedAt < 220 && movementDistance < 5;
    this.dragging = false;
    this.engine.view.setDragging(false);
    window.petApi.endDrag();

    try {
      this.elements.pet.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // Pointer capture can already be gone when macOS focus changes during drag.
    }

    this.engine.view.resetFacing();

    if (wasClick) {
      this.triggerPointerClick();
      return;
    }

    this.engine.returnToRoot();
  }

  private finishDragWithoutClick(): void {
    this.dragging = false;
    this.activeDragDirection = undefined;
    this.engine.view.setDragging(false);
    this.engine.view.resetFacing();
    window.petApi.endDrag();
    this.engine.returnToRoot();
  }

  private triggerPointerClick(): void {
    const node = this.config.events.pointerClick?.node;
    if (node) this.engine.enterEventNode(node);
  }

  private triggerKeyboard(): void {
    const node = this.config.events.keyboard?.node;
    if (this.engine.isCurrentNode(node)) return;

    if (node) this.engine.enterEventNode(node);
  }

  private enterDragNode(direction: "left" | "right"): void {
    if (this.activeDragDirection === direction) return;

    const dragConfig: DragEventConfig | undefined = this.config.events.drag;
    const node = dragConfig?.[direction].node;
    if (!node) return;

    this.activeDragDirection = direction;
    this.engine.enterEventNode(node);
  }
}

function framePath(folder: string, index: number): string {
  return `../assets/hamster-optimized/${folder}/frame_${String(index).padStart(4, "0")}.png`;
}

function petRectOffset(event: PointerEvent): { x: number; y: number } {
  const rect = document.body.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function randomChildDelay(child: TimedChildConfig): number {
  const min = Math.max(0, parseDurationMs(child.every.min) ?? 0);
  const max = Math.max(min, parseDurationMs(child.every.max) ?? min);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseDurationMs(value: DurationValue | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "forever") return null;

  const match = normalized.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const unit = match[2];
  if (unit === "ms") return Math.round(amount);
  if (unit === "s") return Math.round(amount * 1000);
  return Math.round(amount * 60_000);
}

function chooseText(text: TextConfig | undefined, random = Math.random): string | undefined {
  if (!text) return undefined;
  if (typeof text === "string") return text;
  if (!Array.isArray(text.random) || text.random.length === 0) return undefined;

  const index = Math.min(text.random.length - 1, Math.floor(random() * text.random.length));
  return text.random[index];
}

function chooseNextNode(next: NextConfig | undefined, random = Math.random): BehaviorNodeConfig | undefined {
  if (!next) return undefined;
  if (!Array.isArray(next)) return next.node;
  if (next.length === 0) return undefined;
  if (next.length === 1) return next[0].node;

  const total = next.reduce((sum, child) => sum + normalizedProbability(child), 0);
  if (total <= 0) return next[0].node;

  let cursor = random() * total;
  for (const child of next) {
    cursor -= normalizedProbability(child);
    if (cursor <= 0) return child.node;
  }

  return next[next.length - 1].node;
}

function normalizedProbability(child: WeightedNextNodeConfig): number {
  const probability = Number(child.probability ?? 1);
  return Number.isFinite(probability) && probability > 0 ? probability : 0;
}

function collectClassNames(node: BehaviorNodeConfig, classNames: Set<string>): void {
  if (node.className) classNames.add(node.className);
  for (const moment of node.moments ?? []) {
    if (moment.className) classNames.add(moment.className);
  }

  if (Array.isArray(node.next)) {
    for (const child of node.next) collectClassNames(child.node, classNames);
  } else if (node.next) {
    collectClassNames(node.next.node, classNames);
  }

  for (const child of node.fixedFrame?.children ?? []) {
    collectClassNames(child.node, classNames);
  }
}

function collectEventClassNames(config: BehaviorConfig, classNames: Set<string>): void {
  const eventNodes = [
    config.events.pointerClick?.node,
    config.events.keyboard?.node,
    config.events.drag?.left.node,
    config.events.drag?.right.node
  ];

  for (const node of eventNodes) {
    if (node) collectClassNames(node, classNames);
  }
}

function requireElement<T extends Element>(selector: string, expectedType: new () => T): T {
  const element = document.querySelector(selector);
  if (!element || !(element instanceof expectedType)) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}

async function main(): Promise<void> {
  const elements: RuntimeElements = {
    pet: requireElement(".pet", HTMLElement),
    petFrame: requireElement(".pet-frame", HTMLImageElement),
    speech: requireElement(".speech", HTMLElement),
    closeButton: requireElement(".close-button", HTMLButtonElement)
  };

  const config = await window.petApi.getBehaviorConfig();
  const view = new HamsterView(elements, config);
  const engine = new BehaviorEngine(config, view);
  const interactions = new InteractionController(elements, engine, config);

  interactions.bind();
  engine.start();
}

main().catch((error) => {
  console.error("Unable to start hamster renderer:", error);
});
