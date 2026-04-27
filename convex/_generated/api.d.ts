/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as carousels from "../carousels.js";
import type * as folders from "../folders.js";
import type * as imageBatch from "../imageBatch.js";
import type * as imageGeneration from "../imageGeneration.js";
import type * as imagePrompts from "../imagePrompts.js";
import type * as imageReprocess from "../imageReprocess.js";
import type * as images from "../images.js";
import type * as personas from "../personas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  carousels: typeof carousels;
  folders: typeof folders;
  imageBatch: typeof imageBatch;
  imageGeneration: typeof imageGeneration;
  imagePrompts: typeof imagePrompts;
  imageReprocess: typeof imageReprocess;
  images: typeof images;
  personas: typeof personas;
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
