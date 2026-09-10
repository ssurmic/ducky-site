# Duck repeated-tap rendering repair

The owner reported rectangular remnants around the enlarged homepage duck after many
taps on iPhone Safari. The PNG itself is one complete transparent head. The old CSS
animated rotation on the button while independently transitioning scale on the child image.
That nested transform composition is consistent with stale compositor tiles, but the exact
iPhone artifact was not reproduced on our available desktop browsers.

The button now remains stationary. Wobble and triple-tap enlargement share one transform
on the existing image, with a stable composited image layer. No image clones or new assets
are created. Dragging, image callout and tap highlighting are disabled only for this mascot;
keyboard activation and the visible focus ring remain. Reduced-motion CSS removes both
wobble and scaling. The existing tap/stop/three-tap greeting logic is unchanged.

Validation:

- 581 frontend tests passed, including both-language community support interactions.
- Copy lint passed; 1,294 links passed; no backend or payment behavior changed.
- Chrome: 320/393/1200px × Chinese/English × light/dark, nine rapid clicks per case.
  Every case retained one image, a stationary button and no horizontal overflow. The first
  320px test started during page initialization; the loaded-page repeat correctly reached
  the active state after nine clicks. A separate 393px burst used 21 clicks.
- Keyboard Enter stopped the active duck. The stopped image was inspected without remnants.
- Desktop Safari: 15 rapid clicks; the enlarged animated duck rendered as one intact head.
- Screenshot and measurements: `duck-tap-20260909/`. This is desktop Safari plus responsive
  Chrome verification, not a physical iPhone/Safari rendering test.

Production release and verification are recorded after deployment.
