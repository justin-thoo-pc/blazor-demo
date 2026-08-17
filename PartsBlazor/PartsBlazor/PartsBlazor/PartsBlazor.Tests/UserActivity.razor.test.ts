/**
 * Unit tests for Components/UI/UserActivity.razor.ts.
 *
 * Run with `npm test` from PartsBlazor/PartsBlazor/PartsBlazor. Node runs the
 * TypeScript directly (type stripping), so there's no build step and no test
 * framework to install - `node:test` and `node:assert` are built in.
 *
 * The module under test talks to `window.localStorage` and
 * `window.location.origin`, neither of which exists in Node, so both are
 * stubbed on `globalThis` before the module is imported.
 */

import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
    private readonly entries = new Map<string, string>();

    getItem(key: string): string | null {
        return this.entries.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.entries.set(key, value);
    }

    clear(): void {
        this.entries.clear();
    }
}

const storage = new MemoryStorage();

(globalThis as any).window = {
    localStorage: storage,
    location: {origin: "https://localhost:7156"},
};

const {StorageKeys, getPageVisits, recordPageVisit} = await import(
    "../Components/UI/UserActivity.razor.ts"
);

beforeEach(() => storage.clear());

test("recordPageVisit keeps only the path and collapses an immediate repeat", () => {
    assert.equal(recordPageVisit("https://localhost:7156/parts?sku=ABC#top"), 1);

    // Blazor reports the same navigation twice; the second call is the same visit.
    assert.equal(recordPageVisit("/parts"), 1);

    const visits = getPageVisits();
    assert.equal(visits.length, 1);
    assert.equal(visits[0].path, "/parts");

    const stored = JSON.parse(storage.getItem(StorageKeys.pagesVisited)!);
    assert.deepEqual(stored, visits);
});
