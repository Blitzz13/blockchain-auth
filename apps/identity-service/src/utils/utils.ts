export function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
    if (value === undefined || value === null) {
      throw new Error(`Expected '${name}' to be defined, but received ${value}`);
    }
}