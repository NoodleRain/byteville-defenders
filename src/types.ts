// Shared types for Byteville Defenders.

export type ArtKey =
  | 'town' | 'cia' | 'attackers' | 'password' | 'mfa' | 'phish' | 'flags' | 'report'
  | 'controls' | 'controlKinds' | 'packet' | 'ports' | 'firewall' | 'order'
  | 'ids' | 'signature' | 'ips' | 'castle';

export interface Lesson {
  title: string;
  /** Short paragraphs. Simple HTML allowed (b, i, span.term). */
  body: string[];
  art?: ArtKey;
  /** Optional "Did you know?" fact. */
  fact?: string;
}

export interface ChoiceItem {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
}

/** Sort cards into bins (CIA, Prevent/Detect/Fix, ...). */
export interface SortStage {
  type: 'sort';
  title: string;
  intro: string;
  bins: { label: string; hint: string }[];
  cards: { id: string; text: string; bin: number; explain: string }[];
}

/** A list of multiple-choice questions. */
export interface ChoiceStage {
  type: 'choice';
  title: string;
  intro: string;
  /** "pair" shows two big cards side by side (pick the stronger one). */
  style?: 'pair' | 'list';
  items: ChoiceItem[];
}

export interface Email {
  id: string;
  from: string;
  address: string;
  subject: string;
  body: string;
  link?: string;
  kind?: 'email' | 'text';
  phish: boolean;
  clues: string[];
}
export interface InboxStage {
  type: 'inbox';
  title: string;
  intro: string;
  emails: Email[];
}

export interface Packet {
  id: string;
  from: string;
  who: string;
  port: number;
  msg?: string;
  allow: boolean;
  why: string;
  golden?: boolean;
  /** Category used in the teacher report, e.g. bad-port, blocklist, signature. */
  cat: string;
}
export interface LaneStage {
  type: 'lane';
  title: string;
  intro: string;
  wall: string;
  left: string;
  right: string;
  seconds: number;
  /** Words on the two buttons. */
  yes: string;
  no: string;
  rules: { kind: 'allow' | 'block' | 'alert'; text: string }[];
  chips?: { label: string; values: string[] }[];
  packets: () => Packet[];
}

export interface Rule {
  id: string;
  text: string;
  action: 'allow' | 'block';
  /** Match conditions. Missing = any. */
  port?: number;
  ip?: string;
}
export interface TestPacket { label: string; ip: string; port: number; allow: boolean }
export interface OrderPuzzle {
  id: string;
  goal: string;
  rules: Rule[];
  tests: TestPacket[];
  hint: string;
}
export interface OrderStage {
  type: 'order';
  title: string;
  intro: string;
  puzzles: OrderPuzzle[];
}

export type Stage = SortStage | ChoiceStage | InboxStage | LaneStage | OrderStage;

export interface Chapter {
  id: string;
  num: number;
  place: string;
  topic: string;
  minutes: number;
  icon: 'hall' | 'lock' | 'mail' | 'tools' | 'gate' | 'workshop' | 'tower' | 'shield';
  color: string;
  lessons: Lesson[];
  check: ChoiceItem;
  stages: Stage[];
  badge: string;
  outro: string;
}

export interface AnswerInput {
  itemId: string;
  prompt: string;
  choice: string;
  correctAnswer: string;
  correct: boolean;
  timeMs: number;
  bonus?: number;
  /** Override base points (used by puzzles). */
  base?: number;
}

export interface StageContext {
  answer(a: AnswerInput): number;
  done(): void;
  chapter: Chapter;
}
