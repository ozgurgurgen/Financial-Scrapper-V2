import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { multiLLMService } from './MultiLLMService.ts';

export interface HealingRule {
  sourceId: string;
  detectedFormat: string;
  targetSchema: string;
  extractionLogic: string;
  lastHealedAt: string;
  successCount: number;
}

export class SelfHealingSchemaParser {
  private static instance: SelfHealingSchemaParser;
  private memoryRules = new Map<string, HealingRule>();

  public static getInstance(): SelfHealingSchemaParser {
    if (!SelfHealingSchemaParser.instance) {
      SelfHealingSchemaParser.instance = new SelfHealingSchemaParser();
    }
    return SelfHealingSchemaParser.instance;
  }

  /**
   * Attempts to parse raw data using AI when standard JSON / Regex parser fails
   */
  public async healAndExtract<T>(
    sourceId: string,
    rawPayload: string,
    targetSchemaDescription: string,
    sampleStructureExample?: string
  ): Promise<{ data: T; healingUsed: boolean; error?: string }> {
    // If rawPayload is empty or too short
    if (!rawPayload || rawPayload.trim().length === 0) {
      return { data: null as any, healingUsed: false, error: 'Boş veri içeriği.' };
    }

    try {
      const prompt = `
You are a resilient Self-Healing Data Parser for a mission-critical financial & market intelligence system.
The original API endpoint changed its response format, or returned messy HTML/XML/JSON.

TARGET DATA SCHEMA:
${targetSchemaDescription}

${sampleStructureExample ? `TARGET EXAMPLE FORMAT:\n${sampleStructureExample}` : ''}

RAW RECEIVED PAYLOAD (First 3500 chars):
\`\`\`
${rawPayload.substring(0, 3500)}
\`\`\`

TASK:
1. Carefully extract the intended records/fields from this raw payload.
2. Return ONLY a valid JSON object or JSON array matching the target schema.
3. Do NOT include markdown code blocks, explanations, or commentary. Output pure valid JSON.
`;

      const text = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'You are an autonomous AI self-healing data parser. Return only valid JSON.',
        temperature: 0.1,
      });

      const cleaned = (text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Record successful healing rule
      this.memoryRules.set(sourceId, {
        sourceId,
        detectedFormat: rawPayload.startsWith('<') ? 'HTML/XML' : 'Altered JSON',
        targetSchema: targetSchemaDescription,
        extractionLogic: 'MultiLLM Self-Healing Schema Pipeline',
        lastHealedAt: new Date().toISOString(),
        successCount: (this.memoryRules.get(sourceId)?.successCount || 0) + 1,
      });

      return {
        data: parsed as T,
        healingUsed: true,
      };
    } catch (err: any) {
      console.error(`[SelfHealingSchemaParser] AI healing failed for ${sourceId}:`, err);
      // Fallback: Try basic tolerant JSON/regex extraction
      try {
        const cleaned = rawPayload.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '');
        const parsed = JSON.parse(cleaned);
        return { data: parsed as T, healingUsed: false };
      } catch (e) {
        return { data: null as any, healingUsed: false, error: err?.message || 'Onarım başarısız oldu.' };
      }
    }
  }

  public getActiveHealingRules(): HealingRule[] {
    return Array.from(this.memoryRules.values());
  }
}

export const selfHealingSchemaParser = SelfHealingSchemaParser.getInstance();
