// House colors with neon outline effects for year group cards
// Each house has a base color and a complementary neon glow color

export interface HouseColor {
  base: string;       // Card background color
  baseGradient: string; // Gradient for card background
  neon: string;       // Neon outline/glow color
  text: string;       // Text color on top of base
}

export const HOUSE_COLORS: Record<string, HouseColor> = {
  'Mensah House': {
    base: '#F59E0B',
    baseGradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)',
    neon: '#FDE047', // gold/lime neon
    text: '#1a1a00',
  },
  'Danso House': {
    base: '#DC2626',
    baseGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
    neon: '#FB923C', // orange neon (opposing)
    text: '#ffffff',
  },
  'Brew House': {
    base: '#2563EB',
    baseGradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
    neon: '#22D3EE', // cyan neon (opposing)
    text: '#ffffff',
  },
  'Gedi House': {
    base: '#16A34A',
    baseGradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 50%, #15803D 100%)',
    neon: '#A3E635', // lime neon (opposing)
    text: '#ffffff',
  },
  'Andoh House': {
    base: '#7C3AED',
    baseGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
    neon: '#F0ABFC', // pink/magenta neon (opposing)
    text: '#ffffff',
  },
};

export const DEFAULT_HOUSE_COLOR: HouseColor = {
  base: '#0B2D6B',
  baseGradient: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
  neon: '#3B82F6',
  text: '#ffffff',
};

export function getHouseColor(house?: string | null): HouseColor {
  if (!house) return DEFAULT_HOUSE_COLOR;
  // Try exact match first, then partial match
  if (HOUSE_COLORS[house]) return HOUSE_COLORS[house];
  const lower = house.toLowerCase();
  for (const [key, val] of Object.entries(HOUSE_COLORS)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase().replace(' house', ''))) {
      return val;
    }
  }
  return DEFAULT_HOUSE_COLOR;
}

// Get a house color for a year group based on the most common house among its members
// Falls back to cycling through houses by year
export function getYearGroupColor(year: number, house?: string | null): HouseColor {
  if (house) return getHouseColor(house);
  // Cycle through house colors by year for visual variety
  const houses = Object.values(HOUSE_COLORS);
  return houses[year % houses.length];
}
