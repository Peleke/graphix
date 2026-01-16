/**
 * Scene Lighting Service
 *
 * Manages storyboard-level lighting configuration and generates
 * prompt fragments for consistent lighting across panels.
 */

import { eq } from "drizzle-orm";
import { getDefaultDatabase, type Database } from "../db/index.js";
import { storyboards, type Storyboard, type SceneLightingConfig, type LightSource } from "../db/index.js";

// ============================================================================
// Constants
// ============================================================================

export const LIGHT_TYPES = ["sun", "moon", "artificial", "fire", "window", "ambient"] as const;
export type LightType = (typeof LIGHT_TYPES)[number];

export const LIGHT_DIRECTIONS = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "above",
  "below",
] as const;
export type LightDirection = (typeof LIGHT_DIRECTIONS)[number];

export const TIMES_OF_DAY = ["dawn", "morning", "noon", "afternoon", "dusk", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const WEATHER_CONDITIONS = [
  "clear",
  "cloudy",
  "overcast",
  "foggy",
  "rainy",
  "stormy",
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

// ============================================================================
// Prompt Fragment Mappings
// ============================================================================

const TIME_PROMPTS: Record<TimeOfDay, string> = {
  dawn: "dawn lighting, golden hour, soft warm light, long shadows",
  morning: "morning light, bright, clear lighting",
  noon: "midday lighting, harsh overhead light, minimal shadows",
  afternoon: "afternoon light, warm golden tones",
  dusk: "dusk lighting, golden hour, orange and purple sky, dramatic shadows",
  night: "nighttime, dark, moonlit, artificial lighting",
};

const WEATHER_PROMPTS: Record<WeatherCondition, string> = {
  clear: "clear sky, bright sunlight",
  cloudy: "cloudy sky, diffuse lighting, soft shadows",
  overcast: "overcast sky, flat lighting, muted colors",
  foggy: "foggy atmosphere, diffuse light, limited visibility, soft edges",
  rainy: "rainy weather, wet surfaces, reflections, muted colors",
  stormy: "stormy weather, dramatic lighting, dark clouds, occasional lightning",
};

const LIGHT_TYPE_PROMPTS: Record<LightType, string> = {
  sun: "sunlight, natural lighting",
  moon: "moonlight, cool blue tones, night",
  artificial: "artificial lighting, indoor lights",
  fire: "firelight, warm orange glow, flickering light",
  window: "window light, soft directional light, natural",
  ambient: "ambient lighting, soft even illumination",
};

const DIRECTION_PROMPTS: Record<LightDirection, string> = {
  north: "light from behind",
  northeast: "light from behind left",
  east: "side lighting from left, dramatic shadows",
  southeast: "key light from front left",
  south: "front lighting, minimal shadows",
  southwest: "key light from front right",
  west: "side lighting from right, dramatic shadows",
  northwest: "light from behind right",
  above: "overhead lighting, top-down shadows",
  below: "under lighting, dramatic upward shadows, horror lighting",
};

// ============================================================================
// Service
// ============================================================================

export class LightingService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDefaultDatabase();
  }

  /**
   * Set lighting configuration for a storyboard
   */
  async setLighting(storyboardId: string, config: SceneLightingConfig): Promise<Storyboard> {
    // Validate storyboard exists
    const [existing] = await this.db.select().from(storyboards).where(eq(storyboards.id, storyboardId));

    if (!existing) {
      throw new Error(`Storyboard not found: ${storyboardId}`);
    }

    // Validate config
    this.validateLightingConfig(config);

    // Update
    const [updated] = await this.db
      .update(storyboards)
      .set({
        lightingConfig: config,
        updatedAt: new Date(),
      })
      .where(eq(storyboards.id, storyboardId))
      .returning();

    return updated;
  }

  /**
   * Get lighting configuration for a storyboard
   */
  async getLighting(storyboardId: string): Promise<SceneLightingConfig | null> {
    const [storyboard] = await this.db
      .select({ lightingConfig: storyboards.lightingConfig })
      .from(storyboards)
      .where(eq(storyboards.id, storyboardId));

    return storyboard?.lightingConfig ?? null;
  }

  /**
   * Clear lighting configuration
   */
  async clearLighting(storyboardId: string): Promise<Storyboard> {
    const [updated] = await this.db
      .update(storyboards)
      .set({
        lightingConfig: null,
        updatedAt: new Date(),
      })
      .where(eq(storyboards.id, storyboardId))
      .returning();

    if (!updated) {
      throw new Error(`Storyboard not found: ${storyboardId}`);
    }

    return updated;
  }

  /**
   * Generate prompt fragment from lighting config
   *
   * This is called by PromptBuilder to inject lighting into prompts
   */
  generatePromptFragment(config: SceneLightingConfig): string {
    const fragments: string[] = [];

    // Time of day
    if (config.timeOfDay) {
      fragments.push(TIME_PROMPTS[config.timeOfDay]);
    }

    // Weather
    if (config.weather) {
      fragments.push(WEATHER_PROMPTS[config.weather]);
    }

    // Primary light source
    if (config.primarySource) {
      const primary = config.primarySource;
      fragments.push(LIGHT_TYPE_PROMPTS[primary.type]);
      fragments.push(DIRECTION_PROMPTS[primary.direction]);

      // Intensity affects word choice
      if (primary.intensity <= 0.3) {
        fragments.push("dim lighting, low light");
      } else if (primary.intensity >= 0.8) {
        fragments.push("bright lighting, strong light");
      }

      // Color
      if (primary.color) {
        fragments.push(`${primary.color} tinted light`);
      }
    }

    // Secondary light source (fill light)
    if (config.secondarySource) {
      const secondary = config.secondarySource;
      fragments.push(`fill light from ${secondary.direction}`);

      if (secondary.color) {
        fragments.push(`${secondary.color} fill`);
      }
    }

    // Ambient color
    if (config.ambientColor) {
      fragments.push(`${config.ambientColor} ambient tone`);
    }

    return fragments.join(", ");
  }

  /**
   * Suggest lighting configuration based on scene description
   */
  suggestLighting(sceneDescription: string): SceneLightingConfig {
    const desc = sceneDescription.toLowerCase();

    // Detect time of day
    let timeOfDay: TimeOfDay | undefined;
    if (desc.includes("dawn") || desc.includes("sunrise")) timeOfDay = "dawn";
    else if (desc.includes("morning")) timeOfDay = "morning";
    else if (desc.includes("noon") || desc.includes("midday")) timeOfDay = "noon";
    else if (desc.includes("afternoon")) timeOfDay = "afternoon";
    else if (desc.includes("dusk") || desc.includes("sunset") || desc.includes("evening")) timeOfDay = "dusk";
    else if (desc.includes("night") || desc.includes("midnight")) timeOfDay = "night";

    // Detect weather
    let weather: WeatherCondition | undefined;
    if (desc.includes("storm") || desc.includes("lightning") || desc.includes("thunder")) weather = "stormy";
    else if (desc.includes("rain")) weather = "rainy";
    else if (desc.includes("fog") || desc.includes("mist")) weather = "foggy";
    else if (desc.includes("overcast") || desc.includes("gray")) weather = "overcast";
    else if (desc.includes("cloud")) weather = "cloudy";
    else if (desc.includes("sunny") || desc.includes("clear")) weather = "clear";

    // Detect light type
    let lightType: LightType = "sun";
    if (timeOfDay === "night") lightType = "moon";
    if (desc.includes("fire") || desc.includes("campfire") || desc.includes("torch")) lightType = "fire";
    if (desc.includes("indoor") || desc.includes("office") || desc.includes("room")) lightType = "artificial";
    if (desc.includes("window")) lightType = "window";

    // Detect direction from scene elements
    let direction: LightDirection = "southeast"; // default key light
    if (desc.includes("backlit") || desc.includes("silhouette")) direction = "north";
    if (desc.includes("overhead") || desc.includes("under tree") || desc.includes("canopy")) direction = "above";

    // Estimate intensity
    let intensity = 0.7;
    if (timeOfDay === "dawn" || timeOfDay === "dusk") intensity = 0.5;
    if (timeOfDay === "night") intensity = 0.3;
    if (weather === "overcast" || weather === "foggy") intensity = 0.4;
    if (weather === "stormy") intensity = 0.3;

    return {
      primarySource: {
        type: lightType,
        direction,
        intensity,
      },
      timeOfDay,
      weather,
    };
  }

  /**
   * Validate lighting configuration
   */
  private validateLightingConfig(config: SceneLightingConfig): void {
    if (!config.primarySource) {
      throw new Error("Primary light source is required");
    }

    if (!LIGHT_TYPES.includes(config.primarySource.type)) {
      throw new Error(`Invalid light type: ${config.primarySource.type}`);
    }

    if (!LIGHT_DIRECTIONS.includes(config.primarySource.direction)) {
      throw new Error(`Invalid light direction: ${config.primarySource.direction}`);
    }

    if (config.primarySource.intensity < 0 || config.primarySource.intensity > 1) {
      throw new Error("Light intensity must be between 0 and 1");
    }

    if (config.secondarySource) {
      if (!LIGHT_TYPES.includes(config.secondarySource.type)) {
        throw new Error(`Invalid secondary light type: ${config.secondarySource.type}`);
      }
      if (!LIGHT_DIRECTIONS.includes(config.secondarySource.direction)) {
        throw new Error(`Invalid secondary light direction: ${config.secondarySource.direction}`);
      }
    }

    if (config.timeOfDay && !TIMES_OF_DAY.includes(config.timeOfDay)) {
      throw new Error(`Invalid time of day: ${config.timeOfDay}`);
    }

    if (config.weather && !WEATHER_CONDITIONS.includes(config.weather)) {
      throw new Error(`Invalid weather: ${config.weather}`);
    }
  }

  /**
   * List available lighting options
   */
  listOptions(): {
    lightTypes: typeof LIGHT_TYPES;
    directions: typeof LIGHT_DIRECTIONS;
    timesOfDay: typeof TIMES_OF_DAY;
    weatherConditions: typeof WEATHER_CONDITIONS;
  } {
    return {
      lightTypes: LIGHT_TYPES,
      directions: LIGHT_DIRECTIONS,
      timesOfDay: TIMES_OF_DAY,
      weatherConditions: WEATHER_CONDITIONS,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: LightingService | null = null;

export function getLightingService(): LightingService {
  if (!instance) {
    instance = new LightingService();
  }
  return instance;
}

export function resetLightingService(): void {
  instance = null;
}
