import { TreePine, Flower2, BarChart3 } from 'lucide-react';
import { DashboardTab } from '@/types/dashboard';

interface NavbarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const Navbar = ({ activeTab, onTabChange }: NavbarProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <TreePine className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground text-sm">DGIS Dashboard</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm">
          <TreePine className="w-4 h-4 text-primary" />
          Temperate Forest
        </button>

        <div className="flex rounded-full bg-secondary overflow-hidden">
          <button
            onClick={() => onTabChange('flora')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
              activeTab === 'flora' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground'
            }`}
          >
            <Flower2 className="w-4 h-4" /> Flora
          </button>
          <button
            onClick={() => onTabChange('fauna')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
              activeTab === 'fauna' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground'
            }`}
          >
            <TreePine className="w-4 h-4" /> Fauna
          </button>
        </div>
      </div>

      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        <BarChart3 className="w-4 h-4" />
        Statistics Dashboard
      </button>
    </header>
  );
};

export default Navbar;
