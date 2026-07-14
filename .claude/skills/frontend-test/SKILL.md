---
name: frontend-test
description: Use whenever writing or updating Vitest + Testing Library tests in this repo (clinic-for-life frontend) — creating a new component/hook/lib test, adding a test for a code change, or fixing a failing/flaky test. Covers the mock conventions, QueryClientProvider wrapper, jsdom polyfills, and known gotchas (Radix Select, file uploads, overflow-measuring components, Embla carousels) so tests match the rest of the suite instead of re-deriving the boilerplate each time.
---

# Frontend tests (Vitest + Testing Library)

CLAUDE.md requires a test alongside every new/changed piece of code, co-located
as `*.test.ts` / `*.test.tsx` in the same directory. `npm run test` must pass
before the work is done. This skill is the concrete "how" for this repo.

## Before writing anything

Find a sibling test file for a component in the same folder (or the closest
similar one, e.g. `src/components/treino/*.test.tsx`) and match its shape.
The conventions below are already followed consistently across `src/`; don't
invent a new pattern.

## Standard file shape

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip"; // only if the tree renders a Tooltip
import { MyThing } from "./my-thing";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return { ...actual, createExercise: vi.fn(), updateExercise: vi.fn() };
});
const mockCreateExercise = vi.mocked(createExercise);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateExercise.mockResolvedValue(/* ... */);
});
```

Rules this encodes:
- **Mock the API layer, never the network.** `vi.mock("@/lib/api/<module>", async (importOriginal) => ...)`, spreading `actual` and overriding only the functions the test exercises, so types (`Exercise`, `Workout`, …) stay real and importable.
- **Mock `@/lib/api/http` directly only for tests of the http client itself** — everywhere else, mock the higher-level `@/lib/api/*` module the component actually calls.
- **Mock `sonner`** (`toast.success`/`toast.error`) in every file that triggers a mutation, and assert on it instead of on UI toast text.
- **Retries off** in the test `QueryClient` — a real retry delay makes failing-mutation tests hang/timeout.
- Query keys used by `qc.setQueryData`/`invalidateQueries` in the component under test (e.g. `["treinos", alunoId]`) don't need to be pre-seeded unless the test asserts on the cache directly — most tests just assert on rendered UI after a mutation resolves.

## Selecting elements

Select by role/label/text, never by class name or test id, per CLAUDE.md.
`getByLabelText` for icon-only buttons (they carry `aria-label`), `getByRole("dialog")`
+ `within(dialog)` to scope queries once a `Dialog`/`AlertDialog` opens.

## Covering states

Every component with data fetching needs: loading, error, empty, and success
cases at minimum. For a mutation, cover the success path and the error-toast
path (`mockX.mockRejectedValue(new Error(...))` → `expect(toast.error).toHaveBeenCalled()`).

## Known environment gotchas (already patched in `src/test/setup.ts`)

`hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`,
`HTMLMediaElement.prototype.play`/`pause` are polyfilled globally — don't re-stub
them per-file.

## Gotchas that need a per-file stub

- **Radix `Select`**: if a test needs to actually change a `Select` value and
  jsdom's lack of layout breaks Radix's positioning, mock `@/components/ui/select`
  with native `<select>`/`<option>` elements instead of fighting Radix in jsdom.
- **File inputs**: use `fireEvent.change` (not `userEvent.upload`) when the file
  you're passing doesn't match the input's `accept` attribute — `userEvent.upload`
  enforces `accept` and will silently no-op.
- **Overflow-measuring components** (anything using `line-clamp` + a "Ver mais/Ver
  menos" toggle, e.g. `CollapsibleNote`): jsdom computes `scrollHeight`/`clientHeight`
  as `0`, so overflow never triggers on its own. Stub both getters on
  `HTMLElement.prototype` with `vi.spyOn(...).mockReturnValue(...)` **before** the
  `render()` call (the check runs on mount), then `.mockRestore()` after:
  ```ts
  const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(40);
  const clientHeightSpy = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(20);
  render(<CollapsibleNote notes="..." variant="plain" />);
  // ...assertions...
  scrollHeightSpy.mockRestore();
  clientHeightSpy.mockRestore();
  ```
- **Embla-based carousels** (`@/components/ui/carousel`, used by the guided
  execution dialog): Embla reads `window.matchMedia` on mount, which jsdom
  doesn't implement. Stub it in `beforeEach` for any tree that renders one:
  ```ts
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  ```

## Pure helpers (no React)

For non-component modules (e.g. `src/lib/exercise-kind.ts`), skip the RTL/mock
machinery entirely — plain `describe`/`it` with direct function calls and
`expect(...).toBe(...)` is enough. Build minimal fixtures with only the fields
the function reads.

## Out of scope for this skill

- **Pact contract tests** (`*.pact.test.ts`) are a separate suite — see
  `docs/pact.md`. Required in the same PR when `src/lib/api/*.ts` gains/changes
  a call, but run via `npm run test:pact`, never inside `npm run test`.
- **Playwright E2E** (`npm run test:e2e`) — see `docs/e2e.md`. Runs against the
  offline mock (`VITE_OFFLINE=true`), not this Vitest setup.

## Before reporting done

Run `npm run test` (and `npm run lint` for the non-test code) — both must pass.
