import type { HairProfile } from '../types';
import type { PromptOptions } from './index';
import { DENSITY_TEXT, TEXTURE_TEXT, colorKeepText, damageText, lengthRule, toneText } from './phrases';

/** v1: 프로필 속성을 서술형으로 전달 */
export function buildV1(profile: HairProfile, styleTag: string, options: PromptOptions): string[] {
  if (options.task === 'tone') {
    return [
      `Recolor the hair to ${toneText(options.toneLevel)}.`,
      'Keep the same hue; change only how light or dark the hair is.',
      'Keep the hairstyle, cut, length, texture and volume exactly the same.',
    ];
  }

  const lines = [
    options.hasReference
      ? `Apply the hairstyle "${styleTag}" shown in the second image. Take the cut, shape, silhouette and bangs from it; do not copy the reference person's face, hair texture or hair density.`
      : `Apply the hairstyle "${styleTag}".`,
    "Render it as it would realistically look on this person's own hair:",
    lengthRule(profile, options.hasReference),
    `- texture: ${TEXTURE_TEXT[profile.texture]}`,
    `- density: ${DENSITY_TEXT[profile.density]}`,
    `- condition: ${damageText(profile.damage)}`,
    colorKeepText(profile),
  ];
  return lines;
}
