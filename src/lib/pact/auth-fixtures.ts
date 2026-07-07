/**
 * Shared Authorization header matcher for authenticated interactions.
 *
 * The recorded pact must never contain a real JWT — it would be meaningless
 * to the provider verifier, which mints its own token per interaction from
 * the matching provider state (see the backend's
 * spec/pact/support/jwt_fixtures.rb). We only assert the shape here: three
 * base64url segments, which is all any Bearer JWT ever looks like.
 */
import { MatchersV3 } from "@pact-foundation/pact";

/** Shape-only fake — never a real signed JWT. Sent by the mock-server-backed
 * http client during consumer test execution; the regex below is what
 * actually gets recorded in the pact file. */
export const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.abc123signature";

export const bearerToken = () =>
  MatchersV3.regex(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/, `Bearer ${FAKE_TOKEN}`);
