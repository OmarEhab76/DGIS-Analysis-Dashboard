import { BarChart3, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BiomeId, BiomeOption, DashboardTab } from '@/types/dashboard';

interface NavbarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  selectedBiome: BiomeId;
  biomeOptions: BiomeOption[];
  onBiomeChange: (biome: BiomeId) => void;
}

const Navbar = ({ activeTab, onTabChange, selectedBiome, biomeOptions, onBiomeChange }: NavbarProps) => {
  const activeBiome = biomeOptions.find((biome) => biome.id === selectedBiome) ?? biomeOptions[0];

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center">
          <img src="/icons/DGIS%20Icon.svg" alt="DGIS Icon" className="w-6 h-6" />
        </div>
        <span className="font-bold text-foreground text-sm">DGIS Dashboard</span>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
              <img src="/icons/Map%20Icon.svg" alt="Map Icon" className="w-5 h-5" />
              {activeBiome.label}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[90vw] max-w-[420px] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Select Map</p>
            <div className="overflow-x-auto pb-1">
              <ToggleGroup
                type="single"
                value={selectedBiome}
                onValueChange={(value) => value && onBiomeChange(value as BiomeId)}
                className="w-max justify-start"
              >
                {biomeOptions.map((biome) => (
                  <ToggleGroupItem key={biome.id} value={biome.id} className="rounded-full whitespace-nowrap px-3 text-xs h-8">
                    {biome.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Only Temperate Forest currently has live database detections and stats.</p>
          </PopoverContent>
        </Popover>

        <div className="flex rounded-full bg-secondary overflow-hidden">
          <button
            onClick={() => onTabChange('flora')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
              activeTab === 'flora' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground'
            }`}
          >
            <img src="/icons/Flora.svg" alt="Flora Icon" className="w-5 h-5" /> Flora
          </button>
          <button
            onClick={() => onTabChange('fauna')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm transition-colors ${
              activeTab === 'fauna' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground'
            }`}
          >
            <img src="/icons/Fauna.svg" alt="Fauna Icon" className="w-5 h-5" /> Fauna
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
