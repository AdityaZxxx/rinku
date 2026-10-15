# Sign in and the dashboard

Signing in with email and password opens the dashboard hub, the sidebar and
digit keys navigate its sections, the profile picker switches between a
profile's pages, and onboarding creates a profile with a claimed handle.

## Sub-features

- `sign-in-success` signs in with valid credentials and lands on the dashboard.
- `sign-in-failure` shows one generic message for wrong credentials or an
  unknown email, without revealing which one failed.
- `protected-redirect` sends an unauthenticated visit to a protected route to
  `/login` with a `next` parameter that returns to it after sign-in.
- `sidebar-nav` moves between sections through the sidebar and the digit
  keys 1 through 7.
- `profile-switch` switches between profiles from the sidebar picker.
- `create-profile` creates a profile through onboarding with a fresh handle.
- `username-rules` rejects handles that are malformed, reserved, or taken.

## How to get to it (user POV)

- Visit `/login` directly, or get redirected there from `/dashboard`,
  `/account`, `/onboarding`, or any `/<username>/<section>` editor URL while
  signed out.
- Reach sections from the sidebar (`aria-label="Main"`) or digit keys:
  1 dashboard, 2 overview, 3 links, 4 profile, 5 appearance, 6 insights,
  7 settings (source: `lib/dashboard/shortcuts.ts`).
- Switch profiles from the sidebar picker at the top of the dashboard; each
  entry shows the profile title or username.
- Create a profile from the same picker: "Create new profile" opens
  `/onboarding`.

## Driving it with the browser

Preconditions:

- Instance healthy per the doctor on your port (examples use 3100).
- `VERIFY_RINKU_EMAIL` and `VERIFY_RINKU_PASSWORD` read from `.env.local` in
  the shell, not echoed.

- **Sign in.** Open `http://127.0.0.1:<port>/login`. Fill the input with id
  `email` and the input with id `password`, then click the "Sign in"
  button. Poll `get url` for `/dashboard` (the navigation runs in a
  transition, so a single immediate check can still show `/login`): the
  page lists the account's existing profiles as cards linking to
  `/<username>/overview`, and the sidebar "Account" button shows the
  signed-in email, which must be the verify account's.
- **Wrong credentials.** Repeat with a deliberately wrong password. The form
  shows exactly "Unable to sign in. Check your email and password, then try
  again." and stays on `/login`.
- **Protected redirect.** Open `http://127.0.0.1:3100/dashboard` in a signed-out
  tab (sign out via the sidebar "Account" menu first, or use a fresh browser
  profile). The URL becomes `/login?next=%2Fdashboard`. Sign in; the browser
  returns to `/dashboard`.
- **Digit navigation.** On any dashboard page, press the digit for a section
  (for example "3"). The browser lands on the matching editor section.
- **Create a profile.** Open the sidebar profile picker, click "Create new
  profile". On `/onboarding`, fill the username field with
  `verify-<run token>` and a short title, then submit. The browser lands on
  `/<username>/overview`.
- **Username rejection.** On the same form, enter `login` (reserved) and then
  an existing handle such as the account's real profile username. The field
  shows an availability error within about a second: availability is checked
  as you type with a 400 ms debounce, and again on submit.
- **Proof.** Save the post-sign-in dashboard screenshot and the onboarding
  result. Second view with psql: `select username, title from profiles where
username like 'verify-%'` shows the created row, and
  `select username, released_at from profile_usernames where username like
'verify-%' and released_at is null` shows the active claim.

## Gotchas

- The account's pre-existing profiles are off limits: never open an editor
  for one with intent to change it, and never pick one as the verification
  target. If a step needs a profile, always create a fresh `verify-%` one.
- The availability check debounces 400 ms; asserting on the error too early
  turns a real rejection into a false pass.
- Signup is a separate flow and needs either email confirmation or a
  working Google provider, neither guaranteed on this project. Verification
  signs in; it does not sign up.
- The username field lowercases: page addresses are lowercase only. A mixed
  case entry is normalized, not rejected.
- Digit shortcuts bail when focus is in an editable field or a dialog is
  open: click an empty part of the page before pressing a digit.
