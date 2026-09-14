import { z } from 'zod';

const analysisSchema = z.object({
  status: z.enum(['approved', 'blocked']),
  severity: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
  categories: z.array(z.string()),
  analyzed: z.record(z.boolean()),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type Post = { id: string; text: string; image?: string; createdAt: string; analysis: Analysis };
export const DEFAULT_API_ENDPOINT = '/api/backend';
export const MAX_TEXT_LENGTH = 10_000;
export const MAX_IMAGE_BYTES = 4_000_000;

function validateImageFile(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Selecione uma imagem JPG ou PNG.');
  if (!file.size) throw new Error('A imagem está vazia.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('A imagem deve ter até 4 MB.');
}

export async function analyze(text: string, image?: File, endpoint = DEFAULT_API_ENDPOINT): Promise<Analysis> {
  const apiUrl = endpoint.trim().replace(/\/+$/, '');
  if (!apiUrl) throw new Error('Serviço de publicação ainda não configurado.');
  if (!/^https?:\/\/[^\s]+$/i.test(apiUrl) && !/^\/(?!\/)[^\s?#\\]+$/.test(apiUrl)) {
    throw new Error('Informe uma URL HTTP ou HTTPS válida para a API.');
  }
  const content = text.trim();
  if (!content && !image) throw new Error('Informe um texto, uma imagem ou ambos.');
  if (content.length > MAX_TEXT_LENGTH) throw new Error('O texto deve ter até 10.000 caracteres.');
  if (image) validateImageFile(image);

  const body = new FormData();
  if (content) body.append('text', content);
  if (image) body.append('image', image, image.name);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      // O navegador define Content-Type e o boundary do multipart.
      body,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 422) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(typeof errorBody?.detail === 'string'
          ? errorBody.detail
          : 'O conteúdo não pôde ser validado. Confira o texto e a imagem.');
      }
      if (response.status === 413) throw new Error('A imagem excede o tamanho permitido pelo serviço.');
      if (response.status === 429) throw new Error('Muitas análises em pouco tempo. Aguarde e tente novamente.');
      throw new Error('O serviço de análise está indisponível. Tente novamente.');
    }
    const parsed = analysisSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new Error('A API retornou uma resposta inválida. O post não foi publicado.');
    const result = parsed.data;
    if (content && result.analyzed.text !== true) throw new Error('A API não confirmou a análise do texto. O post não foi publicado.');
    if (image && result.analyzed.image !== true) throw new Error('A API não confirmou a análise da imagem. O post não foi publicado.');
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A análise demorou demais. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar ao serviço de análise. Confira sua conexão e tente novamente.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readImage(file: File): Promise<string> {
  validateImageFile(file);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.width >= 50 && img.height >= 50 && img.width <= 7200 && img.height <= 7200
      ? resolve()
      : reject(new Error('A imagem deve ter entre 50 e 7200 pixels em cada dimensão.'));
    img.onerror = () => reject(new Error('A imagem está corrompida ou é inválida.'));
    img.src = data;
  });
  return data;
}
