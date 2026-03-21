export interface ReceiptItem {
  description: string;
  value: number;
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface ReceiptData {
  items: ReceiptItem[];
  date: string | null;
  description: string | null;
}

export interface ReceiptExtractor {
  extract(base64Image: string, mediaType: ImageMediaType): Promise<ReceiptData>;
}

const PROMPT = `Analise esta imagem de cupom fiscal brasileiro. Extraia:
1. Todos os itens comprados com descrição e valor em reais (número decimal, ex: 12.50)
2. A data da compra no formato YYYY-MM-DD
3. Uma descrição curta e clara da compra (ex: "Cigarro Marlboro", "Compras supermercado", "Medicamentos farmácia")

Retorne APENAS um JSON válido neste formato, sem markdown:
{"items": [{"description": "string", "value": number}], "date": "YYYY-MM-DD", "description": "string"}

Se não conseguir ler algum item, pule-o. Se não encontrar a data, use null para o campo date.
Se não for um cupom fiscal, retorne {"items": [], "date": null, "description": null}.`;

function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // DD/MM/YYYY or DD-MM-YYYY
  const match = date.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return null;
}

function parseReceiptData(text: string): ReceiptData {
  try {
    const parsed = JSON.parse(text);
    return { items: parsed.items ?? [], date: normalizeDate(parsed.date), description: parsed.description ?? null };
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { items: parsed.items ?? [], date: normalizeDate(parsed.date), description: parsed.description ?? null };
    }
    return { items: [], date: null, description: null };
  }
}

// --- Anthropic provider ---

function createAnthropicExtractor(): ReceiptExtractor {
  // Lazy import so the SDK isn't loaded if not used
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Anthropic = require("@anthropic-ai/sdk").default;
  const client = new Anthropic();

  return {
    async extract(base64Image, mediaType) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return parseReceiptData(text);
    },
  };
}

// --- OpenAI provider ---

function createOpenAIExtractor(): ReceiptExtractor {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai").default;
  const client = new OpenAI();

  return {
    async extract(base64Image, mediaType) {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64Image}` } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";
      return parseReceiptData(text);
    },
  };
}

// --- Factory ---

const providers: Record<string, () => ReceiptExtractor> = {
  anthropic: createAnthropicExtractor,
  openai: createOpenAIExtractor,
};

let instance: ReceiptExtractor | null = null;

export function getReceiptExtractor(): ReceiptExtractor {
  if (!instance) {
    const provider = process.env.OCR_PROVIDER || "anthropic";
    const factory = providers[provider];
    if (!factory) throw new Error(`Unknown OCR provider: ${provider}. Use: ${Object.keys(providers).join(", ")}`);
    instance = factory();
  }
  return instance;
}
