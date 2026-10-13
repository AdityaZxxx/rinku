/**
 * A failed submit leaves focus on the submit button with no pointer to the field
 * that failed. Reads the store, not the DOM, because fields have not re-rendered.
 */
interface FieldMetaSource {
  getFieldMeta(name: string): { errors: ReadonlyArray<unknown> } | undefined;
}

export function focusFirstInvalidField(
  formApi: FieldMetaSource,
  names: readonly string[],
) {
  const firstInvalid = names.find(
    (name) => (formApi.getFieldMeta(name)?.errors.length ?? 0) > 0,
  );
  if (firstInvalid) {
    document.getElementById(firstInvalid)?.focus();
  }
}
