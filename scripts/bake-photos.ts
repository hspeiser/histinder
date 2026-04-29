/**
 * Bake-photos: one-time generation of all figure photos.
 *
 * Strategy for character consistency (face only):
 *   1. Generate photo 0 (main portrait) via images.generate.
 *   2. Use that portrait as a reference image for photos 1–3 via images.edit.
 *      The wrapper prompt locks the FACE only — clothing, setting, and camera
 *      angle are driven by the per-photo scene description.
 *
 * Strategy for camera-angle variety:
 *   The wrapper instructs the model to pick a non-portrait angle for photos
 *   1–3 — over-shoulder, low angle, profile, wide candid, etc. — so the four
 *   photos in a deck don't all read as the same chest-up shot.
 *
 * Strategy for incremental re-bakes:
 *   Per-photo disk check. If a PNG already exists, it is skipped. To redo a
 *   single photo, delete the PNG (e.g., `rm public/figures/lincoln/2.png`)
 *   and re-run `npm run bake`. Photo 0 is loaded from disk as the reference
 *   when present, so a redo of photo 2 alone costs one image-edit call.
 *
 * Run: `npm run bake`. Requires OPENAI_API_KEY in .env.local or .env.
 */
import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import OpenAI, { toFile } from "openai";
import { FIGURES } from "../src/figures";
import type { Figure } from "../src/types";

dotenv.config({ path: ".env.local" });
dotenv.config();

const client = new OpenAI();

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, "public", "figures");
const DATA_PATH = path.join(ROOT, "data", "baked-figures.json");

const IMAGE_MODEL = "gpt-image-2";
const SIZE = "1024x1536" as const;
const QUALITY = "high" as const;

// Global cap on simultaneous image API requests across the entire run.
// Override at runtime: `PHOTO_CONCURRENCY=20 npm run bake`.
// Default 12 is aggressive but safe on most paid tiers; the OpenAI SDK
// auto-retries on 429s with exponential backoff if you push too hard.
const PHOTO_CONCURRENCY = Number(process.env.PHOTO_CONCURRENCY ?? "12");

const FACE_LOCK_INSTRUCTION =
  `Match the IDENTITY of the person in the reference photo so it is ` +
  `recognizably the same person — same face shape and bone structure, same ` +
  `eye shape and eye color, same nose, same skin tone, same hairline and ` +
  `hair color, same general age. ` +
  `However, the FACIAL EXPRESSION must change to fit the new scene: laugh, ` +
  `smile, focus, surprise, frown, brood, glance away, look intense, look ` +
  `tender, look bored — whatever the moment calls for. Do NOT copy the ` +
  `expression, mouth shape, eyebrow position, or gaze direction from the ` +
  `reference. ` +
  `Clothing, setting, lighting, pose, and expression all come from the new ` +
  `scene description below — DO NOT copy clothing, setting, or expression ` +
  `from the reference photo.`;

const ANGLE_VARIETY_INSTRUCTION =
  `IMPORTANT — camera angle: this photo must NOT be a centered, chest-up, ` +
  `front-facing portrait. Choose a non-portrait camera angle that fits the ` +
  `scene below — for example: low angle looking up, high angle looking down, ` +
  `wide candid from across the room, over-the-shoulder POV from another ` +
  `subject in the scene, three-quarter from the side, full profile, or a ` +
  `candid mid-action shot. Vary the framing so this image looks visibly ` +
  `different from a standard portrait.`;

const FRAMING_INSTRUCTION =
  `This photo does NOT have to be a selfie. By default it should be taken by ` +
  `a third party in the scene — a companion, a servant, a friend, a stranger, ` +
  `someone else holding the camera. Selfies are reserved for the few profiles ` +
  `where the figure's vanity makes a selfie the joke. Otherwise frame this ` +
  `as a third-person candid.`;

const PERIOD_INSTRUCTION =
  `Period accuracy is mandatory: clothing, hairstyles, accessories, props, ` +
  `weapons, vehicles, architecture, and surrounding material culture must ` +
  `match the historical era of the subject. No anachronistic objects, ` +
  `eyewear, fabrics, or technology UNLESS the anachronism is clearly the ` +
  `joke. The figure should be doing or surrounded by something they are ` +
  `historically famous for whenever possible.`;

const TONE_INSTRUCTION =
  `Tone: comedic, ironic, satirical. This is a 2026 Tinder profile for a ` +
  `historical figure — lean into the absurdity. Composition is period-` +
  `respectful but the framing reads exactly like a contemporary dating-app ` +
  `photo.`;

// ─────────────────────────────────────────────────────────────────────────────
// Global semaphore: caps the number of simultaneous image API calls regardless
// of how many figures are fanning out at once.
class Semaphore {
  private slots: number;
  private waiters: Array<() => void> = [];
  constructor(n: number) {
    this.slots = n;
  }
  async acquire(): Promise<void> {
    if (this.slots > 0) {
      this.slots--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.slots++;
    }
  }
}

const photoSlots = new Semaphore(PHOTO_CONCURRENCY);

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  await photoSlots.acquire();
  try {
    return await fn();
  } finally {
    photoSlots.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function bakeFigure(figure: Figure): Promise<string[]> {
  const dir = path.join(PUBLIC_DIR, figure.id);
  await fs.mkdir(dir, { recursive: true });

  const log = (msg: string) => console.log(`[${figure.id}] ${msg}`);

  // ── Photo 0 — the identity reference. Read from disk if it exists.
  const mainPath = path.join(dir, "0.png");
  let mainBuffer: Buffer;
  if (await fileExists(mainPath)) {
    log(`main portrait already on disk — using as reference`);
    mainBuffer = await fs.readFile(mainPath);
  } else {
    const t0 = Date.now();
    log(`generating main portrait…`);
    const result = await withSlot(() =>
      client.images.generate({
        model: IMAGE_MODEL,
        prompt: figure.photos[0]!.prompt,
        size: SIZE,
        quality: QUALITY,
        n: 1,
      }),
    );
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error(`no portrait b64 for ${figure.id}`);
    mainBuffer = Buffer.from(b64, "base64");
    await fs.writeFile(mainPath, mainBuffer);
    log(`  main portrait done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ── Photos 1-3 — in parallel, per-photo disk skip.
  const others = await Promise.all(
    figure.photos.slice(1).map(async (photo, offset) => {
      const idx = offset + 1;
      const photoPath = path.join(dir, `${idx}.png`);
      const url = `/figures/${figure.id}/${idx}.png`;

      if (await fileExists(photoPath)) {
        log(`  ${photo.type} already on disk — skipping`);
        return url;
      }

      const tStart = Date.now();
      log(`  generating ${photo.type}…`);

      const refFile = await toFile(mainBuffer, "ref.png", { type: "image/png" });
      const wrappedPrompt =
        `${FACE_LOCK_INSTRUCTION}\n\n` +
        `${ANGLE_VARIETY_INSTRUCTION}\n\n` +
        `${FRAMING_INSTRUCTION}\n\n` +
        `${PERIOD_INSTRUCTION}\n\n` +
        `${TONE_INSTRUCTION}\n\n` +
        `NEW SCENE: ${photo.prompt}`;

      const result = await withSlot(() =>
        client.images.edit({
          model: IMAGE_MODEL,
          image: refFile,
          prompt: wrappedPrompt,
          size: SIZE,
          quality: QUALITY,
          n: 1,
        }),
      );

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) throw new Error(`no b64 for ${figure.id}/${idx}`);
      const buffer = Buffer.from(b64, "base64");
      await fs.writeFile(photoPath, buffer);
      log(`  ${photo.type} done in ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
      return url;
    }),
  );

  return [`/figures/${figure.id}/0.png`, ...others];
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });

  // Load existing manifest so we keep it up to date.
  let baked: Record<string, string[]> = {};
  try {
    const existing = await fs.readFile(DATA_PATH, "utf8");
    baked = JSON.parse(existing) as Record<string, string[]>;
  } catch {
    // first run — fine
  }

  const overall = Date.now();
  console.log(`baking with PHOTO_CONCURRENCY=${PHOTO_CONCURRENCY}`);

  let writeQueue: Promise<void> = Promise.resolve();
  const persistManifest = () => {
    // Serialize manifest writes so we don't get write-write races.
    writeQueue = writeQueue.then(() =>
      fs.writeFile(DATA_PATH, JSON.stringify(baked, null, 2)),
    );
    return writeQueue;
  };

  // Fan ALL figures out at once — the photoSlots semaphore controls actual
  // concurrency at the per-photo level.
  await Promise.all(
    FIGURES.map(async (figure) => {
      const dir = path.join(PUBLIC_DIR, figure.id);

      // Fast-path: all 4 PNGs already on disk → no API calls.
      const allOnDisk = await Promise.all(
        figure.photos.map((_, i) => fileExists(path.join(dir, `${i}.png`))),
      );
      if (allOnDisk.every(Boolean)) {
        baked[figure.id] = figure.photos.map((_, i) => `/figures/${figure.id}/${i}.png`);
        console.log(`[${figure.id}] all photos on disk — skipping`);
        return;
      }

      try {
        baked[figure.id] = await bakeFigure(figure);
        await persistManifest();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${figure.id}] FAILED: ${msg}`);
      }
    }),
  );

  // Final write to ensure manifest is fully synced with disk reality.
  await fs.writeFile(DATA_PATH, JSON.stringify(baked, null, 2));

  const elapsed = ((Date.now() - overall) / 1000).toFixed(1);
  console.log(`\nbake complete in ${elapsed}s — wrote ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
