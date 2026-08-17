/**
 * Per-browser activity tracking, stored in localStorage.
 *
 * Two keys are owned here:
 *   pc_items_added   - how many parts this user has created (non-negative integer).
 *   pc_pages_visited - an append-only log of the pages this user has opened.
 *
 * Everything is best-effort. localStorage can be unavailable (private browsing,
 * blocked cookies, quota exhausted) and can hold values written by an older
 * version of the app, so every read is validated and every write may fail
 * silently rather than break the page.
 */

export const StorageKeys = {
    itemsAdded: "pc_items_added",
    pagesVisited: "pc_pages_visited",
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/** One entry in the pc_pages_visited log. */
export interface PageVisit {
    /** Root-relative path, e.g. "/parts". Query string and hash are dropped. */
    readonly path: string;
    /** When the visit was recorded, as an ISO-8601 UTC timestamp. */
    readonly visitedAt: string;
}

/** The value stored under each key. */
interface StorageSchema {
    [StorageKeys.itemsAdded]: number;
    [StorageKeys.pagesVisited]: readonly PageVisit[];
}

type Validator<K extends StorageKey> = (value: unknown) => StorageSchema[K] | null;

/** Oldest entries are dropped once the visit log passes this length. */
const maxPageVisits = 200;

/**
 * Blazor can report one navigation twice - the outgoing component's
 * LocationChanged and the incoming one's first render both fire for the same
 * URL - so a repeat of the current path this soon after the last one is
 * treated as the same visit rather than a new one.
 */
const visitDedupeWindowMs = 2000;

// ---------------------------------------------------------------- public API

/** How many parts this user has created in this browser. */
export function getItemsAdded(): number {
    return read(StorageKeys.itemsAdded, asItemCount, 0);
}

/** Records one newly created part. Returns the running total. */
export function recordItemAdded(): number {
    const total = getItemsAdded() + 1;
    write(StorageKeys.itemsAdded, total);
    return total;
}

/** Every page this user has opened, oldest first. */
export function getPageVisits(): readonly PageVisit[] {
    return read(StorageKeys.pagesVisited, asPageVisits, []);
}

/** The distinct paths this user has opened, in the order they were first seen. */
export function getVisitedPaths(): readonly string[] {
    return [...new Set(getPageVisits().map(visit => visit.path))];
}

/**
 * Appends a visit to the log. `url` may be absolute or root-relative; only the
 * path is kept. Returns the number of entries in the log after the call.
 */
export function recordPageVisit(url: string): number {
    const path = toPath(url);
    const visits = getPageVisits();
    const now = new Date();

    if (isRepeatOfLastVisit(visits, path, now)) {
        return visits.length;
    }

    const visit: PageVisit = {path, visitedAt: now.toISOString()};
    const updated = [...visits, visit].slice(-maxPageVisits);
    write(StorageKeys.pagesVisited, updated);
    return updated.length;
}

// ------------------------------------------------------------------ storage

function read<K extends StorageKey>(key: K, validate: Validator<K>, fallback: StorageSchema[K]): StorageSchema[K] {
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(key);
    } catch {
        return fallback; // Storage is disabled for this origin.
    }

    if (raw === null) {
        return fallback;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return fallback; // Not JSON - something else wrote this key.
    }

    return validate(parsed) ?? fallback;
}

function write<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Disabled or full. Activity tracking isn't worth failing the page over.
    }
}

// --------------------------------------------------------------- validation

function asItemCount(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function asPageVisits(value: unknown): readonly PageVisit[] | null {
    return Array.isArray(value) ? value.filter(isPageVisit) : null;
}

function isPageVisit(value: unknown): value is PageVisit {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Partial<PageVisit>;
    return typeof candidate.path === "string" && typeof candidate.visitedAt === "string";
}

// ----------------------------------------------------------------- internals

function toPath(url: string): string {
    try {
        return new URL(url, window.location.origin).pathname;
    } catch {
        return url;
    }
}

function isRepeatOfLastVisit(visits: readonly PageVisit[], path: string, now: Date): boolean {
    const last = visits.at(-1);
    if (last === undefined || last.path !== path) {
        return false;
    }

    const elapsedMs = now.getTime() - Date.parse(last.visitedAt);
    return Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < visitDedupeWindowMs;
}
