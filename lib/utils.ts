import type { CSSProperties } from "react";

export { cn } from "cn";

/** CSSProperties extended with the custom-property keys React's type omits. */
export type CssVariables = CSSProperties & Record<`--${string}`, string | number>;
