# Boat movement and flotation

The boat's full tilted quaternion previously supplied the propulsion direction.
Pitch could therefore move the hull vertically, while its water-height update
tried to pull it back onto the sea. The default XYZ rotation order also mixed
local hull tilt with world heading. Wave and camera interpolation used fixed
per-frame factors, and anchored/fishing boats returned before updating buoyancy.

The boat pivot now uses YXZ rotation order. Propulsion and lateral movement use
horizontal heading vectors; buoyancy alone controls floating height. Fifteen
weighted samples across the actual length and beam fit the supporting water
plane. Exponential smoothing uses elapsed time, with a slower response for large
hulls. Anchors and deployed fishing gear still hold position and prohibit powered
movement, while allowing the hull to follow waves vertically.

Steering builds yaw rate gradually and integrates that response over elapsed
time. Maximum speed, reverse speed, acceleration/braking profiles and maximum
turn rates remain unchanged. Turning bank is applied around the hull's long axis.
The HUD now reports roll around local X and pitch around local Z. Chase-camera
offsets follow heading, with time-based smoothing and a steady horizon; the large
helm camera continues to follow its cabin transform.

The model waterline offsets were calibrated against the rendered source hulls:

| Model | Previous offset | New offset |
| --- | ---: | ---: |
| Small | -0.10 m | -0.35 m |
| Medium | -6.0 m | -8.0 m |
| Large | -0.6 m | -4.5 m |

These are offsets from each normalized model pivot, including its rigging/bounds,
rather than physical draft specifications. Mission buoys now use the scene sea
level independently of these offsets, so changing vessel draft cannot sink the
buoy markers. Mission completion rules, grading, quizzes and database persistence
are unchanged.

## Verification

- All 243 frontend regression tests passed. Added checks cover 15/30/60/144 FPS,
  hull alignment at different headings, gradual steering, horizontal propulsion,
  anchor/fishing/engine-off flotation, chase-camera stability and buoy waterlines.
- Production build passed with the existing large-bundle warning.
- Local Edge checks drove all three boats, switched chase/orbit/helm cameras,
  deployed/retracted anchors and exercised rain and graphics settings without
  browser exceptions or fatal errors.
- Separate browser samples confirmed all three anchored boats continue to heave
  in normal and rainy weather, with zero horizontal or heading drift. Hull tilt
  remained within the per-vessel limits. Flat-water screenshots were inspected
  before and after adjusting the waterlines.

The measurements and screenshots are from the local browser. Client hardware,
visual preference and the published frontend should still be checked together.
