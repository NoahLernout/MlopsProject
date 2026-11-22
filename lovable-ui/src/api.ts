export interface CarInput {
  brand: string; model: string; year: number; transmission: string; mileage: number;
  fuel_type: string; tax: number; mpg: number; engine_size: number;
}
export interface Options { brands: string[]; models_by_brand: Record<string, string[]>; transmissions: string[]; fuel_types: string[]; year_range: [number, number] }
export interface ModelVersion { model_name: string; algorithm: string; metrics: { mae: number; rmse: number; r2: number }; git_sha: string; image_tag: string }
export interface Prediction { estimated_price: number; currency: 'EUR'; model_algorithm: string; prediction_id: number }
export interface RecentPrediction extends CarInput { id: number; created_at: string; estimated_price: number }
export const brandLabels: Record<string, string> = { vw: 'Volkswagen', merc: 'Mercedes-Benz', vauxhall: 'Vauxhall', ford: 'Ford', bmw: 'BMW', audi: 'Audi', toyota: 'Toyota', skoda: 'Škoda', hyundai: 'Hyundai', kia: 'Kia' };
export const friendlyBrand = (value: string) => brandLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
// The model is trained on UK data (pounds, miles, mpg). The UI works in euro, km and L/100 km and converts at the API boundary.
export const GBP_TO_EUR = 1.15;            // fixed approximate rate
export const KM_PER_MILE = 1.609344;
export const MPG_TO_L100 = 282.481;        // UK mpg <-> litres per 100 km
export const eur = (value: number) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
export const km = (value: number) => `${Math.round(value).toLocaleString('nl-BE')} km`;
const r = (n: number, d = 0) => Number(n.toFixed(d));
export const toApiCar = (c: CarInput): CarInput => ({ ...c, mileage: Math.round(c.mileage / KM_PER_MILE), tax: r(c.tax / GBP_TO_EUR, 2), mpg: r(MPG_TO_L100 / c.mpg, 1) });
export const fromApiCar = <T extends CarInput>(c: T): T => ({ ...c, mileage: Math.round(c.mileage * KM_PER_MILE), tax: Math.round(c.tax * GBP_TO_EUR), mpg: r(MPG_TO_L100 / c.mpg, 1) });
export const defaultCar: CarInput = { brand: 'vw', model: 'Golf', year: 2019, mileage: 72000, transmission: 'Manual', fuel_type: 'Petrol', engine_size: 1.5, tax: 190, mpg: 5.8 };
export const mockOptions: Options = {
  brands: ['audi', 'bmw', 'ford', 'hyundai', 'kia', 'merc', 'skoda', 'toyota', 'vauxhall', 'vw'],
  models_by_brand: { vw: ['Golf', 'Polo', 'Passat', 'Tiguan'], merc: ['C Class', 'E Class', 'A Class', 'GLC Class'], bmw: ['1 Series', '3 Series', '5 Series', 'X3'], audi: ['A3', 'A4', 'A6', 'Q5'], ford: ['Fiesta', 'Focus', 'Kuga', 'Mondeo'], toyota: ['Yaris', 'Corolla', 'RAV4', 'Prius'], vauxhall: ['Corsa', 'Astra', 'Insignia', 'Mokka'], skoda: ['Fabia', 'Octavia', 'Superb', 'Kodiaq'], hyundai: ['i10', 'i20', 'i30', 'Tucson'], kia: ['Picanto', 'Ceed', 'Sportage', 'Niro'] },
  transmissions: ['Manual', 'Automatic', 'Semi-Auto'], fuel_types: ['Petrol', 'Diesel', 'Hybrid', 'Electric'], year_range: [2000, 2026],
};
export const mockVersion: ModelVersion = { model_name: 'uk-used-car-regressor', algorithm: 'LightGBM', metrics: { mae: 1327, rmse: 2100, r2: 0.947 }, git_sha: 'a7f3c9d', image_tag: 'v1.4.2' };
let mockMode = false;
let nextId = 104;
let history: RecentPrediction[] = [
  { ...defaultCar, brand: 'bmw', model: '3 Series', year: 2020, mileage: 52000, engine_size: 2, transmission: 'Automatic', id: 103, created_at: '2026-11-22T14:40:00Z', estimated_price: 25800 },
  { ...defaultCar, id: 102, created_at: '2026-11-22T14:20:00Z', estimated_price: 15850 },
  { ...defaultCar, brand: 'ford', model: 'Fiesta', year: 2018, mileage: 94000, engine_size: 1, id: 101, created_at: '2026-11-22T14:00:00Z', estimated_price: 9950 },
];
export const isMockMode = () => mockMode;
export function validateCar(car: CarInput, options: Options): string | null {
  if (!options.brands.includes(car.brand) || !options.models_by_brand[car.brand]?.includes(car.model)) return 'Please select a valid brand and model.';
  if (!Number.isInteger(car.year) || car.year < options.year_range[0] || car.year > options.year_range[1]) return 'Please choose a year within the available range.';
  if (!Number.isFinite(car.mileage) || car.mileage < 0 || car.mileage > 240000) return 'Mileage must be between 0 and 240,000 km.';
  if (!Number.isFinite(car.engine_size) || car.engine_size < 0.6 || car.engine_size > 5) return 'Engine size must be between 0.6 and 5.0 litres.';
  if (!Number.isFinite(car.tax) || car.tax < 0 || !Number.isFinite(car.mpg) || car.mpg <= 0) return 'Enter a valid road tax and fuel economy.';
  if (!options.transmissions.includes(car.transmission) || !options.fuel_types.includes(car.fuel_type)) return 'Please choose a valid transmission and fuel type.';
  return null;
}
export function mockPrice(car: CarInput): number {
  const premium = ['bmw', 'merc', 'audi'].includes(car.brand) ? 1.48 : 1;
  const size = ['Tiguan', 'RAV4', 'Kuga', 'X3', 'Q5'].includes(car.model) ? 1.35 : 1;
  return Math.round(Math.max(1200, (24500 * Math.pow(0.88, 2026 - car.year) - (car.mileage / KM_PER_MILE) * 0.025 + car.engine_size * 1350 + (car.transmission === 'Automatic' ? 1800 : 0) + (car.fuel_type === 'Hybrid' ? 2200 : 0)) * premium * size * GBP_TO_EUR) / 10) * 10;
}
class ApiError extends Error {}
async function request<T>(path: string, fallback: () => T, init?: RequestInit): Promise<T> {
  if (mockMode) return fallback();
  try {
    const response = await fetch(path, init);
    if (response.status >= 400 && response.status < 500 && response.status !== 404) {
      throw new ApiError(response.status === 422 ? 'Please check your car details and try again.' : 'The request could not be completed. Please try again.');
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('API unavailable');
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    mockMode = true;
    return fallback();
  }
}
export const api = {
  options: () => request<Options>('/options', () => mockOptions),
  version: async () => { const v = await request<ModelVersion>('/version', () => mockVersion); return isMockMode() ? v : { ...v, metrics: { ...v.metrics, mae: v.metrics.mae * GBP_TO_EUR, rmse: v.metrics.rmse * GBP_TO_EUR } }; },
  health: () => request<{ status: string; model_loaded: boolean }>('/health', () => ({ status: 'offline', model_loaded: false })),
  predictions: async (limit = 10) => { const rows = await request<RecentPrediction[]>(`/predictions?limit=${limit}`, () => history.slice(0, limit)); return isMockMode() ? rows : rows.map(x => ({ ...fromApiCar(x), estimated_price: x.estimated_price * GBP_TO_EUR })); },
  predict: async (car: CarInput) => { const p = await request<Prediction>('/predict', () => {
    const estimated_price = mockPrice(car);
    const prediction_id = nextId++;
    history = [{ ...car, id: prediction_id, created_at: new Date().toISOString(), estimated_price }, ...history];
    return { estimated_price, currency: 'EUR' as const, model_algorithm: mockVersion.algorithm, prediction_id };
  }, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApiCar(car)) }); return isMockMode() ? p : { ...p, estimated_price: Math.round(p.estimated_price * GBP_TO_EUR), currency: 'EUR' as const }; },
};
