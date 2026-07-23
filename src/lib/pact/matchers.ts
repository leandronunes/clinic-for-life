/**
 * Shared Pact matcher vocabulary, mapped from this API's actual Rails/Postgres
 * types (see swagger/v1/swagger.yaml in the backend repo for the source of
 * truth). Reused by every `*.pact.test.ts` file so the mapping is defined once.
 */
import { MatchersV3 } from "@pact-foundation/pact";

const { regex, string, boolean, decimal, eachLike, datetime, date } = MatchersV3;

/**
 * Postgres bigserial primary/foreign keys, serialized as `.to_s` — numeric
 * strings like "42", never UUIDs. Do not use `MatchersV3.uuid()` for these.
 */
export const idString = (example = "1") => regex(/^\d+$/, example);

/** A closed set of string values (role, status, sex, category, ...). Prefer
 * this over a bare `string()` matcher for enum-like fields — a bare string
 * matcher would silently keep passing even if the provider renamed/changed
 * the allowed values, since it only checks "is this a string". */
export const enumString = (values: readonly string[], example: string) =>
  regex(new RegExp(`^(${values.join("|")})$`), example);

/** `render_unprocessable` always sends `record.errors.full_messages` (array). */
export const errorArrayBody = (example = "Erro de validação") => ({
  error: eachLike(string(example), 1),
});

/** `render_unauthorized` / `Authorizable` / `render_not_found` always send a bare string. */
export const errorStringBody = (example = "Unauthorized") => ({
  error: string(example),
});

/** Some failures also carry a machine-readable `code` alongside `error` (e.g. "pending_approval", "email_taken_same_organization"). */
export const errorWithCodeBody = (message: string, code: string) => ({
  error: string(message),
  code: string(code),
});

// Rails serializes `datetime` columns via `&.iso8601` — always UTC with a "Z" suffix.
const ISO8601_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX";
// `date` columns / `.to_date.iso8601` — no time component.
const ISO8601_DATE_FORMAT = "yyyy-MM-dd";

export const iso8601DateTime = (example = "2025-09-12T00:00:00Z") =>
  datetime(ISO8601_DATETIME_FORMAT, example);

export const iso8601Date = (example = "1995-01-01") => date(ISO8601_DATE_FORMAT, example);

// Re-exported so call sites can `import { like, string, boolean, ... } from "@/lib/pact/matchers"`
// instead of reaching for both this module and "@pact-foundation/pact".
export const { like, integer, nullValue, arrayContaining } = MatchersV3;
export { string, boolean, decimal, eachLike, MatchersV3 };
