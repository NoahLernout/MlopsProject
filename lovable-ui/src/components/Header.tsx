import { CarFront, ExternalLink, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function Header({ dark, toggleTheme, online, mock }: { dark: boolean; toggleTheme: () => void; online: boolean; mock: boolean }) {
  return <header className="topbar"><div className="page-width flex h-full items-center justify-between gap-3">
    <a href="./" className="flex items-center gap-3" aria-label="CarWorth home"><span className="logo-mark"><CarFront size={22} strokeWidth={1.8} /></span><span className="brand-word">CarWorth<span className="text-primary">.</span></span></a>
    <div className="flex items-center gap-5"><span className="api-status"><span className={`status-dot ${online ? 'online' : ''}`} />{online ? 'API online' : mock ? 'API offline · Demo' : 'Connecting'}</span><Button asChild variant="ghost" size="sm" className="api-docs text-muted-foreground text-xs"><a href="/docs" target="_blank" rel="noreferrer">API docs<ExternalLink size={12} /></a></Button><span className="h-5 w-px bg-border" /><Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="text-muted-foreground">{dark ? <Sun size={18} /> : <Moon size={18} />}</Button></div>
  </div></header>;
}
