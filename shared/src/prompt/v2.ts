import type { HairDensity, HairProfile, HairTexture } from '../types';
import type { PromptOptions } from './index';
import { buildV1 } from './v1';

/** v2: v1 + 조건별 시각 단서 보강. 평가자가 구분하기 어려웠던 조건을 강조한다. */
const TEXTURE_CUES: Record<HairTexture, string> = {
  straight: 'Strands fall straight and sleek from root to tip with no wave or curl pattern.',
  wavy: 'Soft S-shaped waves through the mid-lengths and ends, not tight curls.',
  curly: 'Clearly defined curls with a visible spiral pattern from the mid-lengths to the ends, with natural curl volume.',
};

const DENSITY_CUES: Record<HairDensity, string> = {
  low: 'The hair looks sparse: the scalp is slightly visible at the part and crown, and the ends look thin and see-through.',
  medium: 'Normal fullness.',
  high: 'The hair looks very full and voluminous, with no scalp visible and thick, heavy ends.',
};

export function buildV2(profile: HairProfile, styleTag: string, options: PromptOptions): string[] {
  const lines = buildV1(profile, styleTag, options);
  if (options.task === 'tone') {
    return [
      ...lines,
      'Apply the color evenly to all visible hair, including roots and ends. Do not change skin tone or the background.',
    ];
  }
  return [
    ...lines,
    `Texture must be clearly readable: ${TEXTURE_CUES[profile.texture]}`,
    `Density must be clearly readable: ${DENSITY_CUES[profile.density]}`,
    'The texture and density described here take priority over the reference image.',
  ];
}
