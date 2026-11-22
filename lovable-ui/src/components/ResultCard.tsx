import { useEffect, useState } from 'react';
import { motion, animate, useReducedMotion } from 'framer-motion';
import { ChartNoAxesCombined, Sparkles } from 'lucide-react';
import { friendlyBrand, eur, type CarInput, type ModelVersion, type Prediction } from '@/api';
import { StatTiles } from './StatTiles';
function Price({ amount }: { amount: number }) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => { if (reduced) { setValue(amount); return; } const controls = animate(0, amount, { duration: 0.85, ease: 'easeOut', onUpdate: v => setValue(Math.round(v)) }); return () => controls.stop(); }, [amount, reduced]);
  return <span>{eur(value)}</span>;
}
export function ResultCard({ result, car, version, mock }: { result: Prediction | null; car: CarInput | null; version: ModelVersion; mock: boolean }) {
  return <section className="panel result-panel" aria-label="Estimated value"><div className="panel-heading !pb-0"><h2 className="panel-title"><ChartNoAxesCombined />Estimated value</h2><span className="live-badge"><Sparkles size={10} />{mock ? 'DEMO MODEL' : 'AI POWERED'}</span></div>
    <CarArt />
    <div aria-live="polite" aria-atomic="true">{result && car ? <motion.div key={result.prediction_id} className="valuation-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><p className="result-car-label">{friendlyBrand(car.brand)} {car.model} · {car.year}</p><div className="price-display"><Price amount={result.estimated_price} /></div><p className="error-note">{mock ? 'Illustrative demo valuation' : 'Estimated UK market value'}</p><div className="range-line" /><div className="range-prices"><span>{eur(Math.max(0, result.estimated_price - version.metrics.mae))}</span><span>{eur(result.estimated_price + version.metrics.mae)}</span></div><p className="error-note">Typical error ±{eur(version.metrics.mae)}</p></motion.div> : <div className="empty-result"><div className="empty-price">€ — — —</div><h3>A little detail. A clearer picture.</h3><p>Tell us about the car and get a data-driven<br className="hidden sm:block" /> estimate of its UK market value.</p></div>}</div>
    <StatTiles version={version} />
  </section>;
}

function CarArt() {
  return <svg className="car-art" viewBox="0 0 400 150" role="img" aria-label="Illustration of a hatchback car" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="oklch(.7 .16 282)" /><stop offset="1" stopColor="oklch(.6 .22 300)" /></linearGradient></defs>
    <ellipse cx="200" cy="128" rx="150" ry="9" fill="currentColor" opacity=".08" />
    <path d="M52 108 L60 84 Q64 74 76 72 L128 66 Q150 40 188 38 L248 38 Q284 40 306 68 L340 76 Q358 80 360 98 L360 108 Z" fill="url(#body)" />
    <path d="M142 66 Q158 48 190 46 L246 46 Q270 48 288 68 Z" fill="oklch(.95 .02 250)" opacity=".85" />
    <path d="M214 46 L214 68" stroke="oklch(.7 .16 282)" strokeWidth="3" />
    <circle cx="108" cy="110" r="22" fill="oklch(.25 .02 280)" /><circle cx="108" cy="110" r="10" fill="oklch(.8 .01 280)" />
    <circle cx="304" cy="110" r="22" fill="oklch(.25 .02 280)" /><circle cx="304" cy="110" r="10" fill="oklch(.8 .01 280)" />
    <rect x="344" y="84" width="14" height="8" rx="3" fill="oklch(.95 .1 90)" />
  </svg>;
}
