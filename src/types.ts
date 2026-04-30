// ─────────────────────────────────────────────────────────────────────────────
// Histinder — core types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Free-text "about you" string the user types in at the start.
 * Goes into every figure's chat system prompt and into the end-card scoring.
 */
export type UserBio = string;

export interface Photo {
  /** Image-gen prompt. Must combine period-accuracy with modern Tinder photo grammar. */
  prompt: string;
  /** Tinder photo archetype — drives composition. */
  type: "main-portrait" | "with-friends" | "hobby-shot" | "thirst-trap";
  alt: string;
}

export interface ProfilePrompt {
  question: string;
  answer: string;
}

export interface Figure {
  id: string;
  displayName: string;
  era: string;                 // shown as a subtle subtitle
  ageDisplay: string;          // "32" or "32 (technically 2,069)"
  heightDisplay: string;       // "5'6 (yes, because Napoleon)"
  occupation: string;
  distanceLine: string;        // "32 miles away (and 1,847 years)"
  bio: string;
  prompts: ProfilePrompt[];    // 3 answered Tinder prompts
  photos: Photo[];             // 4 photos, one per archetype
  /** Emoji+text trait pills shown on the profile card. */
  badges: string[];
  /** Exact red flags the chat model MUST work in by message 5, in their voice. */
  redFlagHooks: string[];
  /** Locks the figure's voice for the chat loop. */
  voiceSystemPrompt: string;
  /** Probability 0–1 that this figure matches when the user swipes interested. */
  matchProbability: number;
  /** First message the figure sends after matching. In voice. */
  openingLine: string;
}

export interface ChatMessage {
  role: "user" | "figure";
  content: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbox model — every "interested" swipe produces an entry.
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchEntry {
  kind: "match";
  figureId: string;
  messages: ChatMessage[];
  unread: boolean;
  matchedAt: number;
  /** Set when the figure unmatches mid-conversation. After this is true, the
   *  user can no longer reply — the figure has ended things. */
  ended?: boolean;
  endedAt?: number;
  /** Set when the figure last sent a "bump" follow-up. Prevents repeat bumps
   *  before the user has replied. */
  bumpedAt?: number;
}

export interface RejectionEntry {
  kind: "rejection";
  figureId: string;
  rejectionMessage: string;
  read: boolean;
  rejectedAt: number;
}

export type InboxEntry = MatchEntry | RejectionEntry;
export type Inbox = Record<string, InboxEntry>;

export interface EndCardInput {
  figureId: string;
  userBio: UserBio;
  transcript: ChatMessage[];
}

export interface EndCard {
  verdict: string;             // one-line gravestone
  redFlagsRaised: number;
  redFlagsIgnored: number;
  warCrimesMentioned: number;
  timesTheyBroughtUpTheirMother: number;
  compatibilityScore: number;  // 0–100
  oneLinerForSharing: string;  // the screenshot caption
}
