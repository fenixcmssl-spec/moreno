import { GoogleGenAI } from '@google/genai';

/**
 * =========================================================================
 * FenixCMS SaaS — Core AI Service (Google Gemini Integration)
 * =========================================================================
 * Server-only engine for text generation, SEO copywriting, visual media analysis,
 * accessibility alt-tag synthesis, and multimodal product enhancements.
 * =========================================================================
 */

let geminiClientInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada en el entorno del servidor.');
    }

    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClientInstance;
}

export interface GenerateTextOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
}

export interface GenerateBlogArticleOptions {
  title: string;
  tone?: string;
  keywords?: string[] | string;
  locale?: string;
  category?: string;
  merchantName?: string;
}

export interface GeneratedBlogArticle {
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDesc: string;
  tags: string[];
  category: string;
}

export interface VisualAnalysisOptions {
  imageUrl?: string;
  imageBuffer?: Buffer | Uint8Array;
  base64Data?: string;
  mimeType?: string;
  prompt?: string;
}

export class AiService {
  /**
   * Default high-efficiency model alias
   */
  public static readonly DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
  public static readonly DEFAULT_VISION_MODEL = 'gemini-2.5-flash';

  /**
   * Generic text content generation
   */
  static async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    const ai = getGeminiClient();
    const model = options?.model || this.DEFAULT_TEXT_MODEL;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature ?? 0.7,
        responseMimeType: options?.responseMimeType,
      },
    });

    return response.text || '';
  }

  /**
   * Multimodal vision analysis for uploaded media, screenshots, or catalog images
   */
  static async analyzeImage(options: VisualAnalysisOptions): Promise<string> {
    const ai = getGeminiClient();
    const model = this.DEFAULT_VISION_MODEL;

    let base64String = options.base64Data || '';
    let mimeType = options.mimeType || 'image/jpeg';

    // If image URL is provided and no base64 buffer was given, fetch remote image safely
    if (!base64String && options.imageUrl) {
      try {
        const fetchRes = await fetch(options.imageUrl, {
          headers: {
            'User-Agent': 'FenixCMS-AI-Vision/1.0',
          },
        });
        if (!fetchRes.ok) {
          throw new Error(`Failed to fetch image: ${fetchRes.statusText}`);
        }
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64String = buffer.toString('base64');
        mimeType = fetchRes.headers.get('content-type') || mimeType;
      } catch (err: any) {
        throw new Error(`Error al descargar la imagen para análisis visual: ${err.message}`);
      }
    } else if (options.imageBuffer) {
      base64String = Buffer.isBuffer(options.imageBuffer)
        ? options.imageBuffer.toString('base64')
        : Buffer.from(options.imageBuffer).toString('base64');
    }

    if (!base64String) {
      throw new Error('No se proporcionaron datos de imagen válidos (URL, buffer o base64).');
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64String,
      },
    };

    const textPart = {
      text: options.prompt || 'Describe this image in detail.',
    };

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, textPart] },
    });

    return response.text || '';
  }

  /**
   * Generates a perfect accessibility & SEO Alt text in under 10 words
   */
  static async generateImageAltText(imageUrlOrBuffer: string | Buffer, filename?: string): Promise<string> {
    const prompt = `Analiza detalladamente esta imagen de producto o comercio online.
Devuelve EXCLUSIVAMENTE una etiqueta 'alt' descriptiva, concisa y optimizada para SEO y accesibilidad (Web Content Accessibility Guidelines - WCAG).
REGLA ESTRICTA: La respuesta debe tener MENOS DE 10 PALABRAS en español (o el idioma principal).
No incluyas comillas, introducciones, ni texto adicional. Solo el texto del alt.
Nombre de archivo de referencia: ${filename || 'desconocido'}.`;

    const options: VisualAnalysisOptions = typeof imageUrlOrBuffer === 'string'
      ? { imageUrl: imageUrlOrBuffer, prompt }
      : { imageBuffer: imageUrlOrBuffer, prompt };

    const alt = await this.analyzeImage(options);
    
    // Clean and sanitize string (remove quotes, markdown, line breaks)
    return alt
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  }

  /**
   * Generates a complete SEO-optimized blog article with structured HTML/Markdown
   */
  static async generateBlogArticle(options: GenerateBlogArticleOptions): Promise<GeneratedBlogArticle> {
    const ai = getGeminiClient();
    const model = this.DEFAULT_TEXT_MODEL;

    const tone = options.tone || 'profesional y persuasivo';
    const locale = options.locale || 'es';
    const keywords = Array.isArray(options.keywords) 
      ? options.keywords.join(', ') 
      : (options.keywords || 'comercio online, tendencias, guía de compra');
    const category = options.category || 'Guías y Consejos';
    const merchant = options.merchantName || 'Fénix Store';

    const systemPrompt = `Eres un redactor experto en marketing de contenidos, comercio electrónico y SEO para la plataforma FenixCMS.
Tu tarea es redactar artículos de blog altamente atractivos, estructurados y optimizados para los motores de búsqueda de Google.
Debes devolver OBLIGATORIAMENTE un objeto JSON con la estructura exacta solicitada sin bloques markdown adicionales envolventes si es posible.`;

    const userPrompt = `Redacta un artículo completo de blog para el comercio '${merchant}'.
Título propuesto: "${options.title}"
Tono de voz: ${tone}
Palabras clave principales a incorporar naturalmente: ${keywords}
Idioma: ${locale}
Categoría: ${category}

Estructura requerida en la respuesta JSON:
{
  "title": "Título definitivo optimizado para SEO y CTR (máx. 70 caracteres)",
  "excerpt": "Resumen conciso y persuasivo del artículo (1-2 frases, aprox. 150 caracteres)",
  "content": "Cuerpo completo del artículo formateado en HTML semántico (usando <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <div class='highlight-box'>). Debe tener entre 400 y 800 palabras, con introducción enganchante, secciones temáticas y una conclusión con llamada a la acción (CTA) hacia la tienda.",
  "seoTitle": "Título SEO para meta tag <title> (máx 60 caracteres)",
  "seoDesc": "Meta descripción optimizada para Google Search (máx 155 caracteres)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "${category}"
}`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    
    try {
      const parsed = JSON.parse(rawText);
      return {
        title: parsed.title || options.title,
        excerpt: parsed.excerpt || `Guía completa sobre ${options.title}`,
        content: parsed.content || `<p>${parsed.excerpt || options.title}</p>`,
        seoTitle: parsed.seoTitle || parsed.title || options.title,
        seoDesc: parsed.seoDesc || parsed.excerpt || options.title,
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['ecommerce', 'tendencias', 'fenix'],
        category: parsed.category || category,
      };
    } catch {
      // Fallback in case JSON was wrapped in markdown code blocks
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || options.title,
        excerpt: parsed.excerpt || `Guía completa sobre ${options.title}`,
        content: parsed.content || `<p>${parsed.excerpt || options.title}</p>`,
        seoTitle: parsed.seoTitle || parsed.title || options.title,
        seoDesc: parsed.seoDesc || parsed.excerpt || options.title,
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['ecommerce', 'tendencias', 'fenix'],
        category: parsed.category || category,
      };
    }
  }
}
