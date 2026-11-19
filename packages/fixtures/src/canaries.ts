/**
 * Unique fictional canary strings for privacy boundary tests (spec 11.2).
 * Used only by automated tests; never shown in the sample, screenshots or video.
 */
export const CANARIES = ['CANARY-MOSAIC-0F3A-PRIVATE', 'CANARY-MOSAIC-91C7-RELEASE', 'CANARY-MOSAIC-5D2E-FILENAME'] as const;

export const CANARY_DRAFT = `Interviewer: Tell me about the night rota.\n\nP-99 (${CANARIES[0]}): I was the only person on nights who could run the analyser.\n\nContact: p99@example.org`;
export const CANARY_RELEASE = `Participants (${CANARIES[1]}) were drawn from the overnight laboratory team.`;
export const CANARY_FILENAME = `${CANARIES[2]}-transcript.txt`;
