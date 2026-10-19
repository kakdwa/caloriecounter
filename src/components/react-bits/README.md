# React Bits source

`AnimatedContent.tsx` is adapted from David Haz's React Bits TS-CSS component,
retrieved on 2026-10-19 from the official repository at commit
`e12c22192ac7b4b452c5e2feb9b586d74765d696`:

https://github.com/DavidHDev/react-bits/blob/e12c22192ac7b4b452c5e2feb9b586d74765d696/src/ts-default/Animations/AnimatedContent/AnimatedContent.tsx

The public registry did not respond, so the matching registry JSON was fetched
from `public/r/AnimatedContent-TS-CSS.json` in that same official commit. The
component's props and implementation were read before integration.

Calorie uses the mount animation for a newly returned AI review. The original
GSAP context, timeline, configurable displacement, opacity, easing, callback
refs, reduced-motion branch and cleanup remain. Unused ScrollTrigger, wipe,
blur, tilt, stagger and disappearance branches were removed so one response
animation does not load a scroll-animation engine. Completion clears transform
and opacity with DOM style removal, avoiding a new unscoped GSAP tween.

The existing `gsap` dependency satisfies its dependency requirement. The
copyright and full license are shipped at `public/licenses/react-bits.txt`.
