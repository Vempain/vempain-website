function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep merge for nested theme/style objects.
 * - Objects are merged recursively
 * - Arrays are replaced (override wins)
 * - Other primitives are replaced (override wins)
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
    const result: Record<string, unknown> = {...base};

    for (const [key, overrideValue] of Object.entries(override)) {
        const baseValue = result[key];

        if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
            result[key] = deepMerge(baseValue, overrideValue);
        } else {
            result[key] = overrideValue;
        }
    }

    return result as T;
}

