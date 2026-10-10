// Strong ease-out for deliberate motion: the built-in `ease` starts slow and
// reads sluggish on the moments the user watches. The dnd-kit configs take
// plain CSS easing strings, so one constant keeps every curve identical.
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
