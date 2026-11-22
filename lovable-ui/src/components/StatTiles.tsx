import { Crosshair, ChartNoAxesCombined, Cpu } from 'lucide-react';
import { eur, type ModelVersion } from '@/api';
export function StatTiles({ version }: { version: ModelVersion }) {
  const stats = [{ icon: Crosshair, value: `${(version.metrics.r2 * 100).toFixed(1)}%`, label: 'Model accuracy (R²)' }, { icon: ChartNoAxesCombined, value: eur(version.metrics.mae), label: 'Typical error (MAE)' }, { icon: Cpu, value: version.algorithm, label: 'Prediction model' }];
  return <div className="stats">{stats.map(stat => <div className="stat-tile" key={stat.label}><stat.icon className="stat-icon" /><div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div></div>)}</div>;
}
