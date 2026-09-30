# V9 — CMS / Media / Cursor update

## Public experience
- Cursor replaced with an instant, point-like comet front and directional laser trail that stretches with pointer velocity and fades when motion stops.
- Click interaction remains a small directional spark burst.
- Premium hover/focus/transitions and reduced-motion-safe polish added without changing the existing Three.js scenes.
- Space global Earth artwork and the Explore poster now resolve from admin-controlled media fields.

## Content model
Both Luxury and Space now use one centralized content payload containing:
- navigation labels/links
- hero title, copy, CTA, poster and video
- section labels, headings, body copy and quotes
- collection items and background imagery
- cinematic interlude image/video
- motion/reveal image sequences
- process / journey chapters
- stats
- celestial targets / mission cards / technology cards / timeline
- CTA and footer copy/links
- all route-page title/copy/tag/image/detail fields

## Admin
The old limited editor was replaced by a recursive Content Studio. Every string, number, boolean, color, array item, route field, image and video slot in the content model is exposed to the editor.

Media fields have an inline upload button. Uploaded files are saved server-side under `public/uploads/<session-token>/` and return stable `/uploads/...` URLs, replacing temporary browser `blob:` URLs.

## API
- `/api/session` now persists published content to `data/sessions/<session-token>.json` instead of an in-memory Map.
- `/api/media` lists and accepts image/video uploads for the active session.
- Browser localStorage remains a fallback cache for offline/local preview behavior.

## Notes
The persistence layer is filesystem-backed for a self-hosted Node deployment. Serverless hosting such as Vercel should use a database/object-storage adapter for durable production persistence.
