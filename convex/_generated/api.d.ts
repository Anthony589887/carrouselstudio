/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _migrations_patch_5_10 from "../_migrations/patch_5_10.js";
import type * as _migrations_patch_5_15c from "../_migrations/patch_5_15c.js";
import type * as _migrations_patch_5_6 from "../_migrations/patch_5_6.js";
import type * as _migrations_patch_5_7 from "../_migrations/patch_5_7.js";
import type * as crons from "../crons.js";
import type * as formats from "../formats.js";
import type * as generation from "../generation.js";
import type * as generations from "../generations.js";
import type * as personas from "../personas.js";
import type * as scripts from "../scripts.js";
import type * as uiAssets from "../uiAssets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_migrations/patch_5_10": typeof _migrations_patch_5_10;
  "_migrations/patch_5_15c": typeof _migrations_patch_5_15c;
  "_migrations/patch_5_6": typeof _migrations_patch_5_6;
  "_migrations/patch_5_7": typeof _migrations_patch_5_7;
  crons: typeof crons;
  formats: typeof formats;
  generation: typeof generation;
  generations: typeof generations;
  personas: typeof personas;
  scripts: typeof scripts;
  uiAssets: typeof uiAssets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
