import type { HairAnalysis, StyleAnalysis } from '@iroke/shared';
import { env } from '../env';
import type { ImageBlob } from '../providers/types';
import { analyzeHair } from './hairAnalyzer';
import { mockAnalyzeHair, mockAnalyzeStyle } from './mock';
import { analyzeStyle } from './styleAnalyzer';

/** AI_MODE에 맞는 분석기 */
export const analyzers: {
  hair: (image: ImageBlob) => Promise<HairAnalysis>;
  style: (image: ImageBlob) => Promise<StyleAnalysis>;
} = env.aiMode === 'gemini' ? { hair: analyzeHair, style: analyzeStyle } : { hair: mockAnalyzeHair, style: mockAnalyzeStyle };
