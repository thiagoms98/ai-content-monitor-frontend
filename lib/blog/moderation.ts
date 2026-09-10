import { z } from 'zod';
export type Analysis = { status: 'approved' | 'blocked'; severity: number; duration_ms: number; categories: string[]; analyzed?: string[] };
export type Post = { id: string; text: string; image?: string; createdAt: string; analysis: Analysis };
export const MAX_IMAGE_BYTES = 4_000_000;
export async function analyze(text: string, image: string | undefined, endpoint: string): Promise<Analysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...(image ? { image: image.split(',')[1] } : {}) }),
      signal: controller.signal, cache: 'no-store', credentials: 'omit',
    });
    if (!response.ok) throw new Error(response.status === 422 ? 'O conteúdo não pôde ser validado. Confira o texto e a imagem.' : 'O serviço de análise está indisponível. Tente novamente.');
    const parsed = z.object({ status: z.enum(['approved', 'blocked']), severity: z.number().int().min(0), duration_ms: z.number().min(0), categories: z.array(z.string()), analyzed: z.array(z.string()).optional() }).safeParse(await response.json());
    if (!parsed.success) throw new Error('A API retornou uma resposta inválida. O post não foi publicado.');
    const result = parsed.data;
    if (!['approved', 'blocked'].includes(result.status) || !Number.isInteger(result.severity) || result.severity < 0 || !Number.isFinite(result.duration_ms) || !Array.isArray(result.categories) || !result.categories.every((v: unknown) => typeof v === 'string')) throw new Error('A API retornou uma resposta inválida. O post não foi publicado.');
    if (image && (!Array.isArray(result.analyzed) || !result.analyzed.includes('image'))) throw new Error('A API não confirmou a análise da imagem. O post não foi publicado.');
    if (result.status === 'approved' && result.severity > 0) throw new Error('Resultado de moderação inconsistente. O post não foi publicado.');
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('A análise demorou demais. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar à API. Confira o endereço do backend e a configuração de CORS.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export async function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Selecione uma imagem JPG ou PNG.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter até 4 MB.');
  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Não foi possível ler a imagem.')); reader.readAsDataURL(file); });
  await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => img.width >= 50 && img.height >= 50 && img.width <= 7200 && img.height <= 7200 ? resolve() : reject(new Error('A imagem deve ter entre 50 e 7200 pixels em cada dimensão.')); img.onerror = () => reject(new Error('A imagem está corrompida ou é inválida.')); img.src = data; });
  return data;
}
