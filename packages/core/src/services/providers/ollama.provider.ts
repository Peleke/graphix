/**
 * Ollama Text Generation Provider
 *
 * Works with local Ollama instances or remote deployments (RunPod, Docker, etc.)
 * Uses the Ollama HTTP API for text generation.
 */

import type {
  TextGenerationProvider,
  TextProvider,
  GenerateOptions,
  GenerateResult,
} from "../text-generation.types.js";
import { DEFAULT_TEXT_CONFIG } from "../text-generation.types.js";

export class OllamaProvider implements TextGenerationProvider {
  readonly name: TextProvider = "ollama";
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultTimeout: number;

  constructor(
    baseUrl: string = DEFAULT_TEXT_CONFIG.ollamaUrl,
    model: string = DEFAULT_TEXT_CONFIG.ollamaModel,
    timeoutMs: number = DEFAULT_TEXT_CONFIG.timeoutMs
  ) {
    // Validate URL to prevent SSRF attacks
    this.baseUrl = this.validateAndNormalizeUrl(baseUrl);
    this.model = model;
    this.defaultTimeout = timeoutMs;
  }

  /**
   * Validate and normalize URL to prevent SSRF attacks.
   * Blocks cloud metadata endpoints, localhost variants, and private IP ranges.
   */
  private validateAndNormalizeUrl(url: string): string {
    // Remove trailing slash
    const normalized = url.replace(/\/$/, "");

    // Parse URL to validate format
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error(`Invalid Ollama URL: ${url}`);
    }

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid protocol for Ollama URL. Only http and https are allowed.`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and loopback addresses
    const localhostPatterns = [
      "localhost",
      "127.0.0.1",
      "::1",
      "[::1]",
      "0.0.0.0",
      "0177.0.0.1", // Octal encoding of 127.0.0.1
      "2130706433", // Decimal encoding of 127.0.0.1
    ];
    if (localhostPatterns.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
      // Allow localhost only in development (explicit opt-in)
      if (process.env.ALLOW_LOCAL_OLLAMA !== "true") {
        throw new Error(`Ollama URL cannot use localhost/loopback. Set ALLOW_LOCAL_OLLAMA=true for local development.`);
      }
    }

    // Block cloud metadata endpoints (exact matches)
    const blockedHosts = [
      "169.254.169.254", // AWS/GCP/Azure metadata
      "metadata.google.internal",
      "metadata.internal",
      "100.100.100.200", // Alibaba Cloud metadata
      "fd00:ec2::254", // AWS IPv6 metadata
      "instance-data", // AWS alternate
      "metadata.azure.com", // Azure alternate
    ];
    if (blockedHosts.includes(hostname)) {
      throw new Error(`Ollama URL hostname is blocked for security reasons.`);
    }

    // Block private IP ranges (SSRF protection for internal networks)
    if (this.isPrivateIP(hostname)) {
      throw new Error(`Ollama URL cannot use private/internal IP addresses for security reasons.`);
    }

    // Block file:// and other dangerous protocols that might sneak through
    if (normalized.toLowerCase().startsWith("file:")) {
      throw new Error(`Invalid protocol for Ollama URL.`);
    }

    return normalized;
  }

  /**
   * Check if hostname is a private/internal IP address.
   * Blocks 10.x.x.x, 172.16-31.x.x, 192.168.x.x, and link-local (169.254.x.x).
   */
  private isPrivateIP(hostname: string): boolean {
    // Parse IPv4 addresses
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4Match) {
      return false; // Not an IP address, let DNS resolve
    }

    const [, a, b, c, d] = ipv4Match.map(Number);

    // Validate octets
    if ([a, b, c, d].some((octet) => octet > 255)) {
      return false;
    }

    // Private ranges (RFC 1918)
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16

    // Link-local (169.254.0.0/16) - except metadata which is blocked separately
    if (a === 169 && b === 254) return true;

    // Loopback (127.0.0.0/8) - already covered but be thorough
    if (a === 127) return true;

    return false;
  }

  /**
   * Check if Ollama server is available by querying the tags endpoint.
   */
  async isAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        return false;
      }

      // Optionally check if the specific model is available
      const data = await response.json();
      const models = data.models || [];
      const modelNames = models.map((m: { name: string }) => m.name);

      // Check if model exists (with or without :latest tag)
      return modelNames.some(
        (name: string) =>
          name === this.model ||
          name === `${this.model}:latest` ||
          name.startsWith(`${this.model}:`)
      );
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate text using Ollama's generate API.
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Build the full prompt with system prompt if provided
      let fullPrompt = prompt;
      if (options?.systemPrompt) {
        fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
      }

      const requestBody: Record<string, unknown> = {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? DEFAULT_TEXT_CONFIG.temperature,
          num_predict: options?.maxTokens ?? DEFAULT_TEXT_CONFIG.maxTokens,
        },
      };

      // Add stop sequences if provided
      if (options?.stopSequences && options.stopSequences.length > 0) {
        requestBody.options = {
          ...(requestBody.options as object),
          stop: options.stopSequences,
        };
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      // Validate Content-Type to prevent response spoofing
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Unexpected response type from Ollama: ${contentType || "missing"}`);
      }

      const result = await response.json();

      return {
        text: result.response || "",
        model: result.model || this.model,
        provider: "ollama",
        // Ollama provides eval_count (output tokens) and prompt_eval_count (input tokens)
        tokensUsed: (result.eval_count || 0) + (result.prompt_eval_count || 0),
        inputTokens: result.prompt_eval_count,
        outputTokens: result.eval_count,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama request timed out after ${timeoutMs / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get the current model name.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
