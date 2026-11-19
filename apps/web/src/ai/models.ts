/**
 * The ONLY module that imports firebase/ai (spec 9.1). Everything else talks
 * to the AIGateway, which talks to this port. An architecture test enforces it.
 */
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, type GenerativeModel } from 'firebase/ai';
import type { InferencePolicy } from '@mosaic/schemas';
import { firebaseApp } from './firebase';

export const CLOUD_MODEL = 'gemini-3.5-flash-lite';

export type ModelCall = { text: string; inferenceSource?: string };
export type ModelRequest = { prompt: string; json?: { schema: Record<string, unknown> }; signal?: AbortSignal; timeoutMs?: number };

export interface ModelPort {
  generate(policy: Exclude<InferencePolicy, 'NO_MODEL'>, req: ModelRequest): Promise<ModelCall>;
  initializeDevice(onProgress?: (fraction: number) => void): Promise<void>;
}

const MODE: Record<Exclude<InferencePolicy, 'NO_MODEL'>, (typeof InferenceMode)[keyof typeof InferenceMode]> = {
  ONLY_ON_DEVICE: InferenceMode.ONLY_ON_DEVICE,
  PREFER_ON_DEVICE: InferenceMode.PREFER_ON_DEVICE,
  ONLY_IN_CLOUD: InferenceMode.ONLY_IN_CLOUD,
};

export class FirebaseModelPort implements ModelPort {
  private cache = new Map<string, GenerativeModel>();
  private ai = getAI(firebaseApp(), { backend: new GoogleAIBackend() });

  private model(policy: Exclude<InferencePolicy, 'NO_MODEL'>, schema?: Record<string, unknown>): GenerativeModel {
    const key = `${policy}:${schema ? JSON.stringify(schema) : ''}`;
    let m = this.cache.get(key);
    if (!m) {
      m = getGenerativeModel(this.ai, {
        mode: MODE[policy],
        inCloudParams: { model: CLOUD_MODEL, generationConfig: schema ? { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 1200 } : { maxOutputTokens: 600 } },
        onDeviceParams: {
          createOptions: { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] },
          ...(schema ? { promptOptions: { responseConstraint: schema } } : {}),
        },
      });
      this.cache.set(key, m);
    }
    return m;
  }

  async generate(policy: Exclude<InferencePolicy, 'NO_MODEL'>, req: ModelRequest): Promise<ModelCall> {
    const r = await this.model(policy, req.json?.schema).generateContent(req.prompt, { signal: req.signal, timeout: req.timeoutMs });
    return { text: r.response.text(), inferenceSource: r.response.inferenceSource };
  }

  async initializeDevice(onProgress?: (fraction: number) => void): Promise<void> {
    await this.model('ONLY_ON_DEVICE').initializeDeviceModel(onProgress);
  }
}
