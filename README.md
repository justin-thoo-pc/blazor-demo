# blazor-demo
Partscheck framework bake-off using Blazor

This repo hosts a Blazor Web App (single ASP.NET Core project `PartsBlazor`) backed by a `json-server` mock API.

## Project layout

- `PartsBlazor/PartsBlazor.sln` — solution file, open this in Rider.
- `PartsBlazor/PartsBlazor/PartsBlazor` — the app project (ASP.NET Core host, Razor components, TypeScript).
- `PartsBlazor/PartsBlazor/PartsBlazor.Tests` — xUnit tests for the C# and `*.test.ts` tests for the TypeScript (excluded from the app project's compile via `PartsBlazor.csproj`). See [Unit tests](#unit-tests).
- `PartsBlazor.json-server/parts.json` — mock data served via [json-server](https://github.com/typicode/json-server), used as the app's backing API (`ApiUrl` in `appsettings.json`, default `http://localhost:4000`).
- TypeScript lives next to the Razor component it belongs to, e.g. `Components/UI/PartsGrid.razor.ts`, and is compiled by `tsc` to a matching `.razor.js` file alongside it (see `tsconfig.json`'s `include`). Don't hand-edit the generated `.razor.js` files — edit the `.ts` source. Source maps are emitted *inline* (embedded in the `.js`), so there are no `.js.map` files to worry about; see [Debugging the front-end code](#debugging-the-front-end-code).

## Architecture / render mode

Interactivity is configured **per page/component**, and every interactive component uses `@rendermode InteractiveServer` (`PartsGrid`, `PartsForm`, `ConfirmDialog`, `Header`, `Sidebar`, `ContactUs`). `Program.cs` registers only `AddInteractiveServerComponents()` / `AddInteractiveServerRenderMode()` — there is **no WebAssembly project**, so nothing runs client-side except the hand-written TypeScript. See `DesignDecisions/004.Interactivity-Mode-Decision.md` for the reasoning, the alternatives considered, and the deployment consequences (sticky sessions, WebSocket support).

Two consequences worth knowing when debugging:

- **UI events aren't HTTP requests.** Clicks, keystrokes, and form submits travel as frames over the SignalR WebSocket at `/_blazor?id=...`, and the re-rendered DOM diff comes back the same way. They won't appear as rows in Chrome's Network tab — filter to **WS**, click the `_blazor` row, and read the **Messages** tab (with DevTools open *before* the page loads).
- **Calls to json-server come from the server, not the browser.** `Services/PartsService.cs` is a server-side typed `HttpClient`; there is no `fetch`/`XHR` anywhere in the Razor or TypeScript. To watch API traffic, look at the json-server console rather than browser DevTools. This also means json-server needs no CORS config and its URL is never exposed to the client.

## Prerequisites

- [JetBrains Rider](https://www.jetbrains.com/rider/) with the .NET 10 SDK support (this project targets `net10.0`).
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (npm) — used to compile the TypeScript files. Version **22 or newer** is required to run the TypeScript tests, which rely on Node's built-in test runner and its ability to execute `.ts` files directly.
- `json-server` to serve the mock API: `npm install -g json-server` (or run it via `npx`).

## First-time setup

1. Open `PartsBlazor/PartsBlazor.sln` in Rider.
2. Restore npm packages for the TypeScript build (Rider will also do this automatically on build via the `CompileTypeScript` MSBuild target in `PartsBlazor.csproj`, but you can do it manually):

   ```bash
   cd PartsBlazor/PartsBlazor/PartsBlazor
   npm install
   ```

## Running the mock API (json-server)

The app expects the API at `http://localhost:4000` (see `appsettings.json` → `ApiUrl`). Start it before running the app:

```bash
npx json-server@0.17.4 --watch PartsBlazor.json-server/parts.json --port 4000
```

> **Note:** `json-server`'s current `latest` tag resolves to a 1.x rewrite with a breaking API (paginated responses are wrapped in a `{data: [...]}` envelope instead of a flat array with an `X-Total-Count` header, and `_limit` is renamed to `_per_page`). `PartsService.cs` targets the classic 0.x API, so the version must be pinned to `0.17.4` — don't drop the version pin here.

Leave this running in a terminal (or a Rider "npm"/shell run configuration) alongside the app.

## Two workflows: debugging vs. live CSS/UI iteration

Rider's Debug icon and `dotnet watch run` each want to own the app process, and you can't cleanly get full breakpoint debugging *and* live `.razor.css`/hot-reload in the exact same session. Pick whichever fits what you're doing:

### Workflow A — debugging (breakpoints in C#, Razor, TypeScript)

1. In the Rider run configuration dropdown, select the `PartsBlazor: http` (or `https`) launch profile — these are read from `Properties/launchSettings.json`.
2. Click **Debug** (not just Run) to start the server project under the debugger.
3. **C# breakpoints**: set them directly in `.cs` / `.razor` files (server project or shared code) in Rider — they'll be hit as normal since the app is launched under the debugger.
4. **TypeScript breakpoints are a separate thing** — the .NET debugger doesn't cover them, and the `inspectUri` entry in `launchSettings.json` doesn't help here (see the note in [Debugging the front-end code](#debugging-the-front-end-code)). Use browser DevTools, described in that section.
5. **`.razor.css` changes in this mode do NOT live-update.** The CSS-isolation bundle (`PartsBlazor.styles.css`) is only regenerated at build time, so a saved `.razor.css` edit has no effect until you stop debugging and rebuild/restart. Batch your styling tweaks and restart when you're ready to see them, rather than expecting an in-place refresh.

### Workflow B — live CSS/UI iteration (no attached debugger)

Run the app via `dotnet watch run` from a terminal instead of Rider's Debug icon:

```bash
cd PartsBlazor/PartsBlazor/PartsBlazor
dotnet watch run
```

This enables the `dotnet watch` browser-refresh middleware, which recompiles `.razor.css` changes and pushes the updated stylesheet into the browser without a full page reload or app restart — this is the actual mechanism behind "CSS hot reload," and it only runs under `dotnet watch`, not a plain Rider Debug session.

> **Note:** this project's `Program.cs` uses `app.MapStaticAssets()`, which serves static assets (including the CSS-isolation bundle) via a build-time manifest with content-hashed, immutable-cache URLs. This can interfere with the browser-refresh swap even under `dotnet watch` — if CSS changes still don't apply live, try a hard refresh (Ctrl+F5) first, and if that doesn't help, temporarily swap in `app.UseStaticFiles()` to confirm `MapStaticAssets()` is the culprit.

If you need to hit a breakpoint while running this way, use Rider's **Run → Attach to Process** and pick the running `dotnet` process. This works for most C# hot-reload-style edits, but whenever `dotnet watch` does a full restart (rather than an in-place delta), it kills and respawns the process, dropping the attachment — you'll need to reattach.

### TypeScript, either workflow

TypeScript is never hot-reloaded automatically — it needs to be recompiled to `.js` and the browser refreshed:

```bash
cd PartsBlazor/PartsBlazor/PartsBlazor
npm run watch
```

This runs `tsc --watch`, recompiling any `.razor.ts` file to its `.razor.js` counterpart on save. After a recompile, refresh the browser tab to pick up the new JS (browsers don't hot-swap plain `<script>`/module files).

Alternatively, run everything together with:

```bash
npm run dev
```

which uses `concurrently` to run `tsc --watch` and `dotnet watch run` side by side (Workflow B, with TypeScript watching included).

## Unit tests

Both the C# and the TypeScript tests live in `PartsBlazor/PartsBlazor/PartsBlazor/PartsBlazor.Tests` (that folder is excluded from the app project's compile, see `PartsBlazor.csproj`).

### TypeScript tests

Run them with npm, from the app project directory:

```bash
cd PartsBlazor/PartsBlazor/PartsBlazor
npm test
```

That runs `node --test "PartsBlazor.Tests/**/*.test.ts"`. There's **no test framework to install and no build step** — the assertions come from Node's built-in `node:test` / `node:assert`, and Node ≥ 22 executes the `.ts` files directly by stripping the type annotations. The tests import the `.razor.ts` source, *not* the compiled `.razor.js`, so you don't need `tsc` to have run first.

Currently covered: `UserActivity.razor.test.ts` — `recordPageVisit` normalises a URL down to its path and collapses Blazor's duplicate navigation report into a single visit.

Two things to know when adding more:

- **Name the file `*.test.ts` and put it in `PartsBlazor.Tests/`**, or `npm test` won't pick it up. Don't put tests under `Components/` — `tsconfig.json` globs that directory and would compile them into `.razor.js` files that ship as static web assets.
- **`window` doesn't exist in Node.** The module under test reads `window.localStorage` and `window.location.origin`, so the test stubs both on `globalThis` *before* importing the module (hence the top-level `await import(...)` rather than a static `import`). Anything else touching the DOM needs the same treatment.

### C# tests

```bash
cd PartsBlazor
dotnet test
```

## Debugging the front-end code

Almost nothing runs in the browser in this app. The only client-side code you can put a breakpoint in is the hand-written TypeScript in `Components/**/*.razor.ts` — everything else (event handlers, rendering, API calls) executes on the server and is debugged with normal C# breakpoints in Rider. If you're chasing a bug in a `@onclick` handler or in `PartsService`, you want C# breakpoints, not this section.

### Source maps: why they're inline

`tsconfig.json` uses `inlineSourceMap` + `inlineSources` rather than `sourceMap`. This is deliberate — **don't switch it back to `"sourceMap": true`.**

The Blazor SDK registers collocated JavaScript as static web assets by globbing `**/*.razor.js`. That glob doesn't match `.js.map`, so a separate map file is emitted to disk but never served: DevTools follows the `//# sourceMappingURL=` comment, gets a 404, and silently falls back to showing you the compiled JavaScript. You can confirm what's actually served by checking the build manifest:

```bash
grep -o '"RelativePath": "[^"]*"' PartsBlazor/PartsBlazor/PartsBlazor/obj/Debug/net10.0/staticwebassets.build.json
```

Inline maps sidestep the problem entirely — the mappings *and* the original TypeScript text are embedded in the `.razor.js` file that does get served, so no extra file needs to reach the browser and no MSBuild plumbing is required.

### Setting breakpoints in DevTools

1. Have the TypeScript compiler running (`npm run watch`, or `npm run dev` for everything at once) so the `.js` is current.
2. Open the app, then open DevTools (F12).
3. Go to **Sources → Page →** your origin → `Components/UI/` — the `.ts` files appear there as real TypeScript. Set breakpoints on the `.ts` lines directly.
4. Interact with the page. When a breakpoint hits, the call stack, scope, and stepping all show TypeScript, not the compiled output.

**Modules load lazily.** Every TypeScript module is imported on demand from its component's `OnAfterRenderAsync`:

```csharp
_module = await JS.InvokeAsync<IJSObjectReference>(
    "import", "./Components/UI/UserActivity.razor.js");
```

The file therefore won't exist in the Sources tree until the owning component has rendered at least once. Two consequences:

- To break on something that runs *during* that first import (e.g. `UserActivity.recordPageVisit` on initial page load), you can't pre-place the breakpoint — add a temporary `debugger;` statement in the `.ts`, recompile, and reload.
- The currently importable modules are `Components/UI/PartsGrid.razor.js`, `Components/UI/UserActivity.razor.js`, and `Components/Pages/ContactUs.razor.js`. Navigate to the page that owns a module before looking for it.

### Poking at a module from the console

Because the modules are plain ES modules, you can import one in the DevTools console and call its exports directly — useful for checking state without setting up a repro:

```javascript
const m = await import('/Components/UI/UserActivity.razor.js');
m.getPageVisits();
m.getItemsAdded();
```

For anything that reads or writes `localStorage`, **Application → Local Storage** shows the raw stored values. `UserActivity.razor.ts` owns the `pc_items_added` and `pc_pages_visited` keys, and it deliberately swallows storage errors and silently discards malformed entries — so a disabled-storage browser and an empty log look identical from the outside. If the numbers look wrong, breakpoint inside the `catch` blocks in `read`/`write`, or inspect `parsed` before the validator runs.

### Rider and `inspectUri`

`launchSettings.json` sets `inspectUri` to `.../_framework/debug/ws-proxy`. That's the **Blazor WebAssembly** debug proxy, and this app has no WebAssembly — `Program.cs` registers only `AddInteractiveServerComponents()` / `AddInteractiveServerRenderMode()`, so that endpoint doesn't exist and the setting does nothing. It's harmless, but don't expect it to give you TypeScript breakpoints in Rider.

If you'd rather stay in the IDE than use DevTools, create a Rider **JavaScript Debug** run configuration pointed at the app's URL (e.g. `https://localhost:7156`) and start it after the app is running. That launches a Chrome instance under Rider's JS debugger and binds breakpoints set in the `.ts` files. It's an independent run configuration from the .NET one — you run both.

### When breakpoints won't bind

- **Stale JavaScript.** `tsc` isn't watching, or you edited the `.ts` and never recompiled. Run `npm run build` and reload.
- **Cached JavaScript.** `MapStaticAssets()` serves content-hashed, immutably-cached URLs. Hard-refresh (Ctrl+F5), or tick **Disable cache** in the DevTools Network tab with DevTools left open.
- **You're looking at the compiled `.js`.** If Sources shows JavaScript rather than TypeScript, the inline source map didn't survive — check that `tsconfig.json` still has `inlineSourceMap`/`inlineSources` and that the emitted `.razor.js` ends with a long base64 `sourceMappingURL` comment.
- **Nothing's happening at all.** Confirm the interaction is actually client-side. UI events go over the SignalR WebSocket to the server (see [Architecture / render mode](#architecture--render-mode)); if there's no TypeScript in the path, there's no JavaScript breakpoint to hit.

## Typical dev workflow

- **Debugging a specific issue**: start json-server, run `npm run watch` in a terminal for TypeScript, then Debug the `PartsBlazor: https` launch profile in Rider (Workflow A). Restart the debug session to pick up `.razor.css` changes. For breakpoints in `.ts` files, use browser DevTools alongside it — see [Debugging the front-end code](#debugging-the-front-end-code).
- **Iterating on layout/styling**: start json-server, then run `npm run dev` in a terminal (Workflow B — this runs `dotnet watch run` and `tsc --watch` together). Edit `.razor.css`/`.razor`/`.ts` files and see changes reflected without restarting; use Attach to Process only if you need an actual breakpoint.
