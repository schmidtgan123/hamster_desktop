export type DurationValue = string | number | null;
export type PlaybackMode = "loop" | "once" | "pingPong";
export type ReturnTarget = "root" | "fixedFrame" | "rootOnEnd";
export type Facing = "left" | "right";

export interface RandomTextConfig {
  random: string[];
}

export type TextConfig = string | RandomTextConfig;

export interface AnimationConfig {
  folder: string;
  fps: number;
  frames: number;
  startFrame?: number;
  playback: PlaybackMode;
}

export interface BehaviorMomentConfig {
  action: string;
  className?: string;
  text?: TextConfig;
  duration: DurationValue;
}

export interface TimedChildConfig {
  every: {
    min: DurationValue;
    max: DurationValue;
  };
  node: BehaviorNodeConfig;
}

export interface FixedFrameConfig {
  action: string;
  animation: string;
  frame: "first" | "last" | number;
  children?: TimedChildConfig[];
}

export interface NextNodeConfig {
  node: BehaviorNodeConfig;
}

export interface WeightedNextNodeConfig extends NextNodeConfig {
  probability?: number;
}

export type NextConfig = NextNodeConfig | WeightedNextNodeConfig[];

export interface BehaviorNodeConfig {
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

export interface EventNodeConfig {
  node: BehaviorNodeConfig;
}

export interface DragEventConfig {
  text?: TextConfig;
  textDuration?: DurationValue;
  left: EventNodeConfig;
  right: EventNodeConfig;
}

export interface EventConfig {
  pointerClick?: EventNodeConfig;
  keyboard?: EventNodeConfig;
  drag?: DragEventConfig;
}

export interface BehaviorConfig {
  version: number;
  root: BehaviorNodeConfig;
  events: EventConfig;
  animations: Record<string, AnimationConfig>;
}
