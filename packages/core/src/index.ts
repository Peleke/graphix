/**
 * @graphix/core
 *
 * Core business logic for graphix - services, generation, composition.
 * This package has no transport concerns - it's a pure library.
 *
 * Usage:
 * 1. Import types and factory functions
 * 2. Call createDatabase() or setDefaultDatabase() to initialize
 * 3. Call setConfig() if you need non-default config
 * 4. Use service getters or create services with explicit DI
 *
 * @example
 * import {
 *   createDatabase,
 *   setDefaultDatabase,
 *   setConfig,
 *   getProjectService,
 *   createDefaultConfig
 * } from '@graphix/core';
 *
 * // Initialize
 * const connection = createDatabase({ mode: 'sqlite', sqlitePath: './my.db' });
 * setDefaultDatabase(connection);
 * setConfig(createDefaultConfig());
 *
 * // Use services
 * const projects = getProjectService();
 * const myProject = await projects.create({ name: 'My Project' });
 */

// Database
export * from "./db/index.js";

// Services
export * from "./services/index.js";

// Generation
export * from "./generation/index.js";

// Composition
export * from "./composition/index.js";

// Config
export * from "./config/index.js";

// Security Utilities
export * from "./utils/security.js";
