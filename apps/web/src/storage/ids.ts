/** Local random identifiers. Never derived from content, names or file names. */
export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
export const nowIso = () => new Date().toISOString();
