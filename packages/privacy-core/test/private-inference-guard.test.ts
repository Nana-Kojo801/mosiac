import { describe, expect, it, vi } from 'vitest';
import { checkDeviceReadiness, NetworkFence, PrivateEgressBlocked, PrivateInferenceRefused, runPrivateInference, isPromptEcho } from '../src/private-inference-guard';

const chrome = (availability: string) => ({
  LanguageModel: { availability: vi.fn(async () => availability) },
  navigator: { userAgentData: { brands: [{ brand: 'Chromium' }, { brand: 'Google Chrome' }] } },
  fetch: vi.fn(async () => new Response('{}')) as unknown as typeof fetch,
});
const PROMPT = 'List disclosure-risk categories in this text as one short line. Text: CANARY-UNIT-TEST private fictional text.';

describe('checkDeviceReadiness', () => {
  it('refuses when the Prompt API is absent (the SDK would silently use the cloud)', async () => {
    expect(await checkDeviceReadiness({ navigator: {} })).toEqual({ ok: false, reason: 'NO_PROMPT_API' });
  });
  it('refuses Chromium, whose Prompt API is an echo stub', async () => {
    const g = { ...chrome('available'), navigator: { userAgentData: { brands: [{ brand: 'Chromium' }] } } };
    expect((await checkDeviceReadiness(g)).ok).toBe(false);
  });
  it.each(['downloadable', 'downloading', 'unavailable'])('refuses when availability is %s', async (a) => {
    expect(await checkDeviceReadiness(chrome(a))).toMatchObject({ ok: false, reason: 'MODEL_NOT_AVAILABLE', detail: a });
  });
  it('refuses when availability throws', async () => {
    const g = chrome('available'); g.LanguageModel.availability = vi.fn(async () => { throw new Error('boom'); });
    expect(await checkDeviceReadiness(g)).toMatchObject({ ok: false, reason: 'AVAILABILITY_ERROR' });
  });
  it('accepts Google Chrome with an available model', async () => {
    expect(await checkDeviceReadiness(chrome('available'))).toEqual({ ok: true, availability: 'available' });
  });
});

describe('NetworkFence', () => {
  it('blocks AI endpoint requests only while a private task is active', async () => {
    const g = chrome('available');
    const fence = new NetworkFence(g);
    fence.install();
    await expect(g.fetch!('https://firebasevertexai.googleapis.com/v1beta/x', { method: 'POST' })).resolves.toBeInstanceOf(Response);
    await expect(fence.run(() => g.fetch!('https://firebasevertexai.googleapis.com/v1beta/x', { method: 'POST' }))).rejects.toBeInstanceOf(PrivateEgressBlocked);
    await expect(fence.run(() => g.fetch!('https://content-firebaseappcheck.googleapis.com/v1/x'))).resolves.toBeInstanceOf(Response);
    expect(fence.violations).toHaveLength(1);
    expect(fence.active).toBe(false);
  });
  it('releases the fence when the task throws', async () => {
    const fence = new NetworkFence(chrome('available'));
    await expect(fence.run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(fence.active).toBe(false);
  });
});

describe('runPrivateInference', () => {
  it('never calls the model when the device is not ready', async () => {
    const call = vi.fn();
    await expect(runPrivateInference(PROMPT, call, { fence: new NetworkFence({}), g: { navigator: {} } })).rejects.toBeInstanceOf(PrivateInferenceRefused);
    expect(call).not.toHaveBeenCalled();
  });
  it('rejects a result the SDK reports as cloud', async () => {
    const g = chrome('available');
    await expect(runPrivateInference(PROMPT, async () => ({ text: 'ok', inferenceSource: 'in_cloud' }), { fence: new NetworkFence(g), g })).rejects.toMatchObject({ reason: 'SOURCE_NOT_ON_DEVICE' });
  });
  it('rejects an echo labelled on_device', async () => {
    const g = chrome('available');
    const echo = `On-device model is not available in Chromium, this API is just echoing back the input:\n${PROMPT}`;
    await expect(runPrivateInference(PROMPT, async () => ({ text: echo, inferenceSource: 'on_device' }), { fence: new NetworkFence(g), g })).rejects.toMatchObject({ reason: 'STUB_ECHO' });
  });
  it('blocks egress if the SDK tries the cloud mid-call', async () => {
    const g = chrome('available');
    const fence = new NetworkFence(g);
    const call = async () => { await g.fetch!('https://firebasevertexai.googleapis.com/v1beta/models/m:generateContent', { method: 'POST', body: PROMPT }); return { text: 'x', inferenceSource: 'in_cloud' }; };
    await expect(runPrivateInference(PROMPT, call, { fence, g })).rejects.toBeInstanceOf(PrivateEgressBlocked);
    expect(fence.violations[0].host).toBe('firebasevertexai.googleapis.com');
  });
  it('accepts a genuine on-device result', async () => {
    const g = chrome('available');
    await expect(runPrivateInference(PROMPT, async () => ({ text: 'NARROW_LOCATION, CROSS_RELEASE', inferenceSource: 'on_device' }), { fence: new NetworkFence(g), g })).resolves.toEqual({ text: 'NARROW_LOCATION, CROSS_RELEASE', inferenceSource: 'on_device' });
  });
  it('detects echoes', () => { expect(isPromptEcho(`x ${PROMPT}`, PROMPT)).toBe(true); expect(isPromptEcho('A short answer.', PROMPT)).toBe(false); });
});
