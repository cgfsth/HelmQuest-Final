// Frame the hull that is actually loaded, even while another selection is downloading.
export function getLandingBoatPresentation(boat, profiles, aspect = 16 / 9) {
  const vessel = Object.values(profiles).find(profile => profile.modelFile === boat.userData?.modelPath) || profiles.medium;
  const length = Number.isFinite(boat.userData?.loaMeters) && boat.userData.loaMeters > 0 ? boat.userData.loaMeters : 60;
  const scale = 1.5;
  const renderedLength = length * scale;
  const beam = Number.isFinite(boat.userData?.beamMeters) && boat.userData.beamMeters > 0 ? boat.userData.beamMeters : length * .18;
  const aspectScale = Number.isFinite(aspect) && aspect > 0 ? Math.max(1, 1.6 / aspect) : 1;
  return {
    scale,
    length: renderedLength,
    beam: beam * scale,
    waterlineOffset: (vessel?.waterlineOffset ?? 0) * scale,
    orbitRadius: Math.hypot(renderedLength, beam * scale) * 1.3 * aspectScale,
    orbitVariation: renderedLength / 9,
    cameraHeight: renderedLength * .2,
    lookHeight: renderedLength / 9,
  };
}
