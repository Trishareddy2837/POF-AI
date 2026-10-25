# POF-AI: PATH OF FUTURE

Career exploration and planning for students, built with React, TypeScript, Tailwind CSS, and Supabase.

## What is included

- A redesigned public home page, course and career carousels, opportunity cards, responsive navigation, and the POF-AI visual system.
- Account creation, email sign-in, Google sign-in, password visibility, and separate publisher/admin entry points.
- A combined dashboard and progress overview, profile form, AI career analysis, a catalogue of 100 careers, interactive recommendations, and saved personalized roadmaps.
- Roadmap phases with related course and learning-resource suggestions, including YouTube topic search links.
- Course, internship, hackathon, and job pages. Example catalogue entries are labelled as examples; externally sourced listings are shown only when they meet the page's source and freshness checks.
- Resume draft editing, PDF/DOCX text extraction in the browser, private uploads for signed-in users, job-description suggestions from the configured AI provider, and print-to-PDF.
- Roadmap-aware LeetCode topic links. POF-AI does not execute or submit code and does not read LeetCode activity.
- A light/dark appearance toggle and a trusted-role admin dashboard for platform counts and account management.
- The earlier quiz pages are hidden while that feature is deferred; the old assessment SQL is retained for a future rebuild and is not needed for the new core setup.

## Local setup

1. Install Node.js LTS and run `npm install`.
2. Create a Supabase project and apply migrations `0001` through `0008` in order. Then apply `0010_profile_education_details.sql` to enable the extra profile education fields. Skip `0009_secure_assessments_and_analytics.sql`; assessments are deferred and this site version does not need it. If you already partly ran 0009, do not rerun it for this release; 0010 does not depend on it.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only the public anon key belongs in frontend variables. Never place a service-role key in a `VITE_` variable.
4. In Supabase Authentication URL Configuration, set the Site URL and add `/auth/callback` and `/reset-password` redirect URLs for local and deployed sites.
5. For Google sign-in, enable the Google provider in Supabase and add Supabase's callback URL to the Google OAuth client's allowed redirect URLs.
6. Run `npm run dev` to start the local site.

Without Supabase, public browsing and clearly labelled demo roadmap previews work. Saving account data, private uploads, real authentication, and admin controls need the configured Supabase project.

## AI and Edge Functions

AI use is optional and stays server-side. Configure the existing secrets on Supabase Edge Functions: `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL`. Deploy the `career-analysis` function for career analysis, roadmap generation, and resume-tailoring suggestions. A user's resume text and job description are sent only after the user checks the consent box and requests suggestions; contact details are removed first. Do not enter confidential information.

AI generated content is validated by the app. If the provider returns invalid data or fails, the app reports the failure rather than silently presenting it as a successful personalized result. The labelled demo roadmap mode is separate from real AI.

## Roles and administration

- `/publisher` is for invited publisher accounts. Publisher membership and publishing permissions are enforced by Supabase policies.
- `/admin/login` and `/admin` are for users whose trusted Supabase `app_metadata.role` is `careerforge_admin`. A profile field or browser setting cannot grant this role.
- Deploy `supabase/functions/pof-admin` for admin overview and account-management actions. It uses Supabase's server-side service-role environment; never expose that key to the browser.
- Admin actions include inspecting user accounts and counts, changing display names, suspending/restoring access, and deleting an account. Use an administrator account only for trusted staff.

## Data and integrations

Curated course and career content is local catalogue data, not a live provider feed. Opportunity examples are labelled and do not represent confirmed open vacancies. External applications, course enrollment synchronization, certificates, LeetCode activity, and email notifications are not integrated. User-marked progress is self-reported.

PDF and DOCX resume text extraction happens in the browser. Scanned image-only PDFs do not include OCR and may produce no extracted text. Private resume storage needs migration `0008` and the configured private storage bucket/policies.

## Checks

Run `npm test`, `npm run lint`, and `npm run build` from this folder. These checks do not validate live Supabase policies, OAuth configuration, Edge Function secrets, or production provider calls. Review and apply SQL against a development Supabase project before production.

## Deployment

Run `npm run build`; the static site is written to `dist/`. Configure the two `VITE_SUPABASE_` values on your host, add the deployed auth URLs in Supabase, and configure single-page-app rewrites to `/index.html`. Deploy the needed Supabase migrations and Edge Functions separately.
