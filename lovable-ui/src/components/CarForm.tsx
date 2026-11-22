import { CarFront, ChevronDown, ArrowRight, Sparkles, ShieldCheck, LoaderCircle, Car, Crown, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlyBrand, km, titleCase, type CarInput, type Options } from '@/api';
const presets = [
  { name: 'Family hatchback', icon: CarFront, car: { brand: 'vw', model: 'Golf', year: 2019, mileage: 72000, transmission: 'Manual', fuel_type: 'Petrol', engine_size: 1.5, tax: 190, mpg: 5.8 } },
  { name: 'Premium estate', icon: Crown, car: { brand: 'bmw', model: '3 Series', year: 2020, mileage: 52000, transmission: 'Automatic', fuel_type: 'Diesel', engine_size: 2, tax: 220, mpg: 4.9 } },
  { name: 'City car', icon: Car, car: { brand: 'ford', model: 'Fiesta', year: 2018, mileage: 48000, transmission: 'Manual', fuel_type: 'Petrol', engine_size: 1, tax: 190, mpg: 4.8 } },
  { name: 'Hybrid SUV', icon: Leaf, car: { brand: 'toyota', model: 'RAV4', year: 2021, mileage: 40000, transmission: 'Automatic', fuel_type: 'Hybrid', engine_size: 2.5, tax: 205, mpg: 5.6 } },
];
function RangeField({ label, value, display, min, max, step, onChange, start, end }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (n: number) => void; start: string; end: string }) {
  return <div className="slider-field"><div className="field-title"><label className="field-label" htmlFor={label}>{label}</label><span className="field-value">{display}</span></div><input id={label} aria-label={label} className="range-control" type="range" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} /><div className="range-ends"><span>{start}</span><span>{end}</span></div></div>;
}
function SegmentField({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (s: string) => void }) {
  return <div className="segment-field"><span className="field-label" id={`${label}-label`}>{label}</span><div className="segment-group" role="group" aria-labelledby={`${label}-label`}>{values.map(v => <Button type="button" key={v} variant="ghost" className="segment-button" aria-pressed={value === v} onClick={() => onChange(v)}>{titleCase(v)}</Button>)}</div></div>;
}
export function CarForm({ car, setCar, options, busy, onEstimate, preset, setPreset }: { car: CarInput; setCar: (car: CarInput) => void; options: Options; busy: boolean; onEstimate: () => void; preset: string; setPreset: (s: string) => void }) {
  const update = <K extends keyof CarInput>(key: K, value: CarInput[K]) => { setCar({ ...car, [key]: value }); setPreset(''); };
  function applyPreset(next: CarInput, name: string) {
    const brand = options.brands.includes(next.brand) ? next.brand : options.brands[0] ?? '';
    const models = options.models_by_brand[brand] ?? [];
    setCar({ ...next, brand, model: models.includes(next.model) ? next.model : models[0] ?? '', transmission: options.transmissions.find(v => v.toLowerCase() === next.transmission.toLowerCase()) ?? options.transmissions[0] ?? '', fuel_type: options.fuel_types.find(v => v.toLowerCase() === next.fuel_type.toLowerCase()) ?? options.fuel_types[0] ?? '', year: Math.max(options.year_range[0], Math.min(options.year_range[1], next.year)) }); setPreset(name);
  }
  return <form className="panel form-panel" onSubmit={e => { e.preventDefault(); onEstimate(); }}>
    <div className="panel-heading"><h2 className="panel-title"><CarFront />Describe the car</h2><span className="step-number">01 / DETAILS</span></div>
    <span className="field-label">Start with a quick preset</span><div className="preset-row">{presets.map(p => <Button key={p.name} type="button" variant="outline" className="preset-button" data-selected={preset === p.name} onClick={() => applyPreset(p.car, p.name)}><p.icon className="!size-3" />{p.name}</Button>)}</div>
    <div className="fields-row"><div><label className="field-label" htmlFor="brand">Brand</label><div className="select-wrap"><select id="brand" value={car.brand} className="car-select" onChange={e => { setCar({ ...car, brand: e.target.value, model: options.models_by_brand[e.target.value]?.[0] ?? '' }); setPreset(''); }}>{options.brands.map(b => <option key={b} value={b}>{friendlyBrand(b)}</option>)}</select><ChevronDown /></div></div><div><label className="field-label" htmlFor="model">Model</label><div className="select-wrap"><select id="model" className="car-select" value={car.model} onChange={e => update('model', e.target.value)}>{(options.models_by_brand[car.brand] ?? []).map(m => <option key={m}>{m}</option>)}</select><ChevronDown /></div></div></div>
    <RangeField label="Registration year" value={car.year} display={String(car.year)} min={options.year_range[0]} max={options.year_range[1]} step={1} start={String(options.year_range[0])} end={String(options.year_range[1])} onChange={v => update('year', v)} />
    <RangeField label="Mileage" value={car.mileage} display={km(car.mileage)} min={0} max={240000} step={1000} start="0 km" end="240.000 km" onChange={v => update('mileage', v)} />
    <SegmentField label="Transmission" values={options.transmissions} value={car.transmission} onChange={v => update('transmission', v)} />
    <SegmentField label="Fuel type" values={options.fuel_types} value={car.fuel_type} onChange={v => update('fuel_type', v)} />
    <RangeField label="Engine size" value={car.engine_size} display={`${car.engine_size.toFixed(1)} L`} min={0.6} max={5} step={0.1} start="0.6 L" end="5.0 L" onChange={v => update('engine_size', v)} />
    <div className="fields-row cost-fields"><div><label className="field-label" htmlFor="tax">Annual road tax</label><div className="select-wrap"><input id="tax" className="number-field" type="number" min={0} step={1} required value={Number.isNaN(car.tax) ? '' : car.tax} onChange={e => update('tax', e.target.value === '' ? NaN : Number(e.target.value))} /><span className="input-unit">€ / yr</span></div></div><div><label className="field-label" htmlFor="mpg">Fuel economy</label><div className="select-wrap"><input id="mpg" className="number-field" type="number" min={1} step={0.1} required value={Number.isNaN(car.mpg) ? '' : car.mpg} onChange={e => update('mpg', e.target.value === '' ? NaN : Number(e.target.value))} /><span className="input-unit">L / 100 km</span></div></div></div>
    <Button type="submit" disabled={busy} variant="estimate">{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? 'Calculating estimate…' : 'Estimate price'}{!busy && <ArrowRight className="ml-auto" />}</Button><p className="form-note"><ShieldCheck size={11} />No registration or personal details needed</p>
  </form>;
}
