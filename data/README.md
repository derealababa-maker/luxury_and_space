# Runtime content storage

The admin publishes session content into `data/sessions/<token>.json` and uploaded image/video files into `public/uploads/<token>/`.

This is intentionally filesystem-backed for a self-hosted Node deployment. For Vercel/serverless deployment, replace the persistence layer with a database/object store.
