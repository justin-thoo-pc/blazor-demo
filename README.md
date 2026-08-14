# blazor-demo
Partscheck framework bake-off using Blazor

This repo hosts a Blazor Web App (server project `PartsBlazor` + WebAssembly client `PartsBlazor.Client`) backed by a `json-server` mock API.

## Project layout

- `PartsBlazor/PartsBlazor.sln` — solution file, open this in Rider.
- `PartsBlazor/PartsBlazor/PartsBlazor` — server project (ASP.NET Core host, runs the app).
- `PartsBlazor/PartsBlazor/PartsBlazor.Client` — Blazor WebAssembly client project.
- `PartsBlazor.json-server/parts.json` — mock data served via [json-server](https://github.com/typicode/json-server), used as the app's backing API (`ApiUrl` in `appsettings.json`, default `http://localhost:4000`).
- TypeScript lives next to the Razor component it belongs to, e.g. `Components/UI/PartsGrid.razor.ts`, and is compiled by `tsc` to a matching `.razor.js` file alongside it (see `tsconfig.json`'s `include`). Don't hand-edit the generated `.razor.js` / `.razor.js.map` files — edit the `.ts` source.

## Prerequisites

- [JetBrains Rider](https://www.jetbrains.com/rider/) with the .NET 10 SDK support (this project targets `net10.0`).
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (npm) — used to compile the TypeScript files.
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
4. **TypeScript breakpoints**: Rider's `inspectUri` is already configured in `launchSettings.json`, which wires up the browser dev tools debug proxy. To hit breakpoints in `.ts` files:
   - Make sure the corresponding `.razor.js.map` file exists (produced by `tsc`, see below) so source maps resolve back to the `.ts` source.
   - Set breakpoints directly in the `.ts` file in Rider, or in Chrome/Edge DevTools under the `webpack://`/source-mapped `.ts` file — both work since Rider attaches via the debug proxy.
   - If breakpoints aren't binding, rebuild the TypeScript (see below) so a fresh `.js.map` is emitted, then refresh the browser.
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

## Typical dev workflow

- **Debugging a specific issue**: start json-server, run `npm run watch` in a terminal for TypeScript, then Debug the `PartsBlazor: https` launch profile in Rider (Workflow A). Restart the debug session to pick up `.razor.css` changes.
- **Iterating on layout/styling**: start json-server, then run `npm run dev` in a terminal (Workflow B — this runs `dotnet watch run` and `tsc --watch` together). Edit `.razor.css`/`.razor`/`.ts` files and see changes reflected without restarting; use Attach to Process only if you need an actual breakpoint.
