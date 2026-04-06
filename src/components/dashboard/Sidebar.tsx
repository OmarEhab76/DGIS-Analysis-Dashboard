import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { DashboardLabel, DashboardTab, Filters } from '@/types/dashboard';

interface SidebarProps {
  activeTab: DashboardTab;
  labels: DashboardLabel[];
  isLoadingLabels?: boolean;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const Sidebar = ({ activeTab, labels, filters, onFiltersChange, isLoadingLabels = false }: SidebarProps) => {
  const toggleLabel = useCallback(
    (name: string) => {
      const selected = filters.selectedLabels.includes(name)
        ? filters.selectedLabels.filter((label) => label !== name)
        : [...filters.selectedLabels, name];
      onFiltersChange({ ...filters, selectedLabels: selected });
    },
    [filters, onFiltersChange]
  );

  const colorMap: Record<string, string> = {
    'Hickory': 'bg-success',
    'Maple': 'bg-maple',
    'Wood Frog': 'bg-success',
    'White-tailed Deer': 'bg-sunflower',
    'Red Fox': 'bg-maple',
    'Raccoon': 'bg-lavender',
    'American Black Bear': 'bg-primary',
  };

  const sectionTitle = activeTab === 'flora' ? 'Trees' : 'Fauna';

  const renderLabelList = (items: DashboardLabel[]) =>
    items.map((s) => (
      <label key={s.name} className="flex items-center justify-between py-1 cursor-pointer group">
        <div className="flex items-center gap-2">
          <div className={`relative w-4 h-4 rounded border border-border flex items-center justify-center transition-colors ${
            filters.selectedLabels.includes(s.name) ? colorMap[s.name] || 'bg-primary' : 'bg-secondary'
          }`}>
            <input
              type="checkbox"
              checked={filters.selectedLabels.includes(s.name)}
              onChange={() => toggleLabel(s.name)}
              className="sr-only"
            />
            {filters.selectedLabels.includes(s.name) && (
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-foreground group-hover:text-primary transition-colors">{s.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{s.count}</span>
      </label>
    ));

  return (
    <aside className="w-56 flex-shrink-0 bg-card border-r border-border p-4 flex flex-col gap-5 overflow-y-auto">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        <p className="text-xs text-muted-foreground">Refine your analysis parameters</p>
      </div>

      {/* Date Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Date Range</span>
          <span className="text-[10px] font-semibold text-primary">LAST 7 DAYS</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">FROM</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="w-full bg-secondary text-foreground text-sm rounded-md px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">TO</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="w-full bg-secondary text-foreground text-sm rounded-md px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Confidence Score</span>
          <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
            ≥ {filters.confidenceMin}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.confidenceMin}
          onChange={(e) => onFiltersChange({ ...filters, confidenceMin: Number(e.target.value) })}
          className="w-full accent-primary h-1.5"
        />
      </div>

      {/* Active category labels */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-1">{sectionTitle}</h3>
        {isLoadingLabels && <p className="text-xs text-muted-foreground">Loading labels...</p>}
        {!isLoadingLabels && labels.length === 0 && <p className="text-xs text-muted-foreground">No labels available.</p>}
        {!isLoadingLabels && renderLabelList(labels)}
      </div>

      <button className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        <Download className="w-4 h-4" />
        Export Report
      </button>
    </aside>
  );
};

export default Sidebar;
