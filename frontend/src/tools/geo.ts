export function parseCoordinate(value: string | number, ref?: string): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    const raw = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(raw)) {
        return null;
    }

    const normalizedRef = (ref ?? '').toString().trim().toUpperCase();
    const sign = normalizedRef === 'S' || normalizedRef === 'W' ? -1 : 1;
    return Math.abs(raw) * sign;
}

const COMPASS_16 = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
] as const;

export function toCompass16(directionDegrees: number | null | undefined): string | null {
    if (directionDegrees === null || directionDegrees === undefined || !Number.isFinite(directionDegrees)) {
        return null;
    }

    const normalized = ((directionDegrees % 360) + 360) % 360;
    const index = Math.round(normalized / 22.5) % 16;
    return COMPASS_16[index] ?? null;
}
