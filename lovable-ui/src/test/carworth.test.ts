import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultCar, friendlyBrand, mockOptions, mockPrice, validateCar } from '@/api';

describe('CarWorth contract', () => {
  it('uses friendly labels without changing API brand values', () => {
    expect(friendlyBrand('vw')).toBe('Volkswagen');
    expect(friendlyBrand('merc')).toBe('Mercedes-Benz');
    expect(defaultCar.brand).toBe('vw');
  });
  it('allows mileage from 0 to 240,000 km only', () => {
    expect(validateCar({ ...defaultCar, mileage: 0 }, mockOptions)).toBeNull();
    expect(validateCar({ ...defaultCar, mileage: 240000 }, mockOptions)).toBeNull();
    expect(validateCar({ ...defaultCar, mileage: 240001 }, mockOptions)).not.toBeNull();
    expect(validateCar({ ...defaultCar, mileage: -1 }, mockOptions)).not.toBeNull();
  });
  it('allows engine sizes from 0.6 to 5.0 litres only', () => {
    expect(validateCar({ ...defaultCar, engine_size: 0.6 }, mockOptions)).toBeNull();
    expect(validateCar({ ...defaultCar, engine_size: 5 }, mockOptions)).toBeNull();
    expect(validateCar({ ...defaultCar, engine_size: 0.5 }, mockOptions)).not.toBeNull();
    expect(validateCar({ ...defaultCar, engine_size: 5.1 }, mockOptions)).not.toBeNull();
  });
  it('rejects a model from another brand', () => {
    expect(validateCar({ ...defaultCar, model: 'Fiesta' }, mockOptions)).not.toBeNull();
  });
  it('produces lower demo prices for higher mileage', () => {
    expect(mockPrice({ ...defaultCar, mileage: 80000 })).toBeLessThan(mockPrice({ ...defaultCar, mileage: 20000 }));
  });
});

describe('Existing API integration', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); });
  it('sends snake_case JSON and relative /predict requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ estimated_price: 11782, currency: 'GBP', model_algorithm: 'LightGBM', prediction_id: 1 }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('@/api');
    await api.predict(defaultCar);
    expect(fetchMock).toHaveBeenCalledWith('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaultCar) });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toHaveProperty('fuel_type', 'Petrol');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toHaveProperty('engine_size', 1.5);
  });
  it('automatically falls back on network failure and reads back recent predictions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { api, isMockMode } = await import('@/api');
    expect((await api.options()).brands).toContain('vw');
    expect(isMockMode()).toBe(true);
    const result = await api.predict(defaultCar);
    const recent = await api.predictions(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.id).toBe(result.prediction_id);
    expect(recent[0]?.estimated_price).toBe(result.estimated_price);
  });
});