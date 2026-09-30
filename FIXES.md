# Atelier 09 / NOVA 01 — motion + CMS pass

## What changed
- Reworked the desktop experience cursor into a cyan/gold laser-star with velocity-based beam trail, aura, and click cracker/ripple burst.
- Kept the cursor disabled on touch/coarse pointers and normal inside the admin panel.
- Removed the image-reveal wheel interception. The reveal now follows native page scrolling with a single RAF-driven CSS progress variable.
- Reduced reveal section motion/filter work and improved composition so the title does not sit directly on top of the image grid.
- Centered the luxury lion and stopped the global document scroll from moving the lion camera.
- Rebuilt the Explore Earth scene as a lightweight Three.js sphere using realistic day/normal/cloud planet textures instead of the old transparent/stylised GLB material stack.
- Reduced 3D device pixel ratio to 1x, disabled unnecessary local clipping, added R3F performance scaling, and kept heavy scenes deferred until near the viewport.
- Changed cinematic background videos to pause when outside the viewport.
- Changed the page loader so it does not wait for `window.load` and remote media before releasing the page.
- Added a real Admin **Page manager** for every Luxury and Space route. Route title, tag, copy, and hero image can be edited and saved through the existing session API.
- Route pages now read their saved page overrides from the same session content mechanism as the homepage.
- Removed the unused 56 MB Earth GLB and related Earth assets because the new Earth implementation no longer needs them.

## Validation
TypeScript was checked with the locally available TypeScript compiler. Full Next.js production build could not be executed in this sandbox because package installation requires network access and the dependency tree is not installed here.
