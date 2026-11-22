import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Sparkles, Box, CircleHelp } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { api, defaultCar, isMockMode, validateCar, type CarInput, type Options, type ModelVersion, type Prediction, type RecentPrediction } from '@/api';
import { Header } from '@/components/Header';
import { CarForm } from '@/components/CarForm';
import { ResultCard } from '@/components/ResultCard';
import { RecentList } from '@/components/RecentList';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'CarWorth — What is your car worth?' },
    { name: 'description', content: 'Estimate your used car’s UK market value with CarWorth. Compare car details, explore recent estimates, and see model accuracy.' },
    { property: 'og:title', content: 'CarWorth — What is your car worth?' },
    { property: 'og:description', content: 'A data-driven UK used-car price estimate, with transparent model accuracy and typical error.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

function Index() {
  const [dark, setDark] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [version, setVersion] = useState<ModelVersion | null>(null);
  const [online, setOnline] = useState(false);
  const [mock, setMock] = useState(false);
  const [car, setCar] = useState<CarInput>(defaultCar);
  const [result, setResult] = useState<Prediction | null>(null);
  const [resultCar, setResultCar] = useState<CarInput | null>(null);
  const [recent, setRecent] = useState<RecentPrediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState('Family hatchback');

  useEffect(() => {
    let active = true;
    Promise.all([api.options(), api.version(), api.health(), api.predictions()]).then(([o, v, h, r]) => {
      if (!active) return;
      setOptions(o); setVersion(v); setOnline(h.status === 'ok' && h.model_loaded && !isMockMode()); setMock(isMockMode()); setRecent(r);
      const brand = o.brands.includes(defaultCar.brand) ? defaultCar.brand : o.brands[0] ?? '';
      setCar({ ...defaultCar, brand, model: o.models_by_brand[brand]?.includes(defaultCar.model) ? defaultCar.model : o.models_by_brand[brand]?.[0] ?? '', year: Math.min(o.year_range[1], Math.max(o.year_range[0], defaultCar.year)), transmission: o.transmissions.find(t => t.toLowerCase() === 'manual') ?? o.transmissions[0] ?? '', fuel_type: o.fuel_types.find(t => t.toLowerCase() === 'petrol') ?? o.fuel_types[0] ?? '' });
    }).catch(error => toast.error(error instanceof Error ? error.message : 'Unable to load car options. Please refresh.'));
    return () => { active = false; };
  }, []);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); }
  async function estimate() {
    if (!options || busy) return;
    const error = validateCar(car, options);
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const snapshot = { ...car };
      const prediction = await api.predict(snapshot);
      setResult(prediction); setResultCar(snapshot); setMock(isMockMode());
      if (isMockMode()) setOnline(false);
      setRecent(await api.predictions());
      toast.success(isMockMode() ? 'Demo estimate ready' : 'Your estimate is ready');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  function loadCar(item: RecentPrediction) {
    const { brand, model, year, mileage, transmission, fuel_type, tax, mpg, engine_size } = item;
    setCar({ brand, model, year, mileage, transmission, fuel_type, tax, mpg, engine_size }); setPreset('');
    document.getElementById('brand')?.focus({ preventScroll: true });
    toast.success('Car details loaded');
  }

  return <MotionConfig reducedMotion="user"><div className="app-shell"><Header dark={dark} toggleTheme={toggleTheme} online={online} mock={mock} /><main className="page-width">
    <motion.div className="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}><div className="eyebrow"><Sparkles size={12} />Less guesswork. More confidence.</div><h1>What is your car worth?</h1><p>A smarter estimate, powered by real UK car data.<br className="sm:hidden" /> No guesswork. No strings attached.</p></motion.div>
    {options && version ? <motion.div className="workspace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}><CarForm car={car} setCar={setCar} options={options} busy={busy} onEstimate={estimate} preset={preset} setPreset={setPreset} /><div><ResultCard result={result} car={resultCar} version={version} mock={mock} /><RecentList items={recent} onSelect={loadCar} mock={mock} /></div></motion.div> : <div className="workspace" aria-busy="true" aria-label="Loading car options">{[0, 1].map(i => <div key={i} className="panel p-7 space-y-7">{[0, 1, 2, 3, 4, 5].map(j => <div key={j} className="skeleton-bar" />)}</div>)}</div>}
    <footer className="site-footer"><span className="footer-stack"><Box size={12} />Model trained in Azure ML<span className="mx-1">·</span>served with FastAPI on Kubernetes<span className="mx-1">·</span>prices shown in € (approx. 1 £ = 1.15 €)</span><span className="footer-build"><span>build</span><span className="font-mono text-muted-foreground">{version?.image_tag ?? '—'}</span><CircleHelp size={12} aria-label="Model estimates are indicative, not guaranteed sale prices" /></span></footer>
  </main><Toaster theme={dark ? 'dark' : 'light'} richColors position="bottom-right" /></div></MotionConfig>;
}
