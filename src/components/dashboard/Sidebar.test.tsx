import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { DashboardLabel, Filters } from '@/types/dashboard';

const faunaLabels: DashboardLabel[] = [
  { name: 'Beaver', group: 'fauna', count: 4 },
  { name: 'Lynx', group: 'fauna', count: 2 },
];

const floraLabels: DashboardLabel[] = [
  { name: 'Birch Tree', group: 'trees', count: 5 },
  { name: 'Conifer', group: 'trees', count: 3 },
  { name: 'Agave', group: 'plants', count: 1 },
];

function renderSidebar(options?: {
  activeTab?: 'flora' | 'fauna';
  labels?: DashboardLabel[];
  selectedLabels?: string[];
}) {
  const onFiltersChange = vi.fn();
  const filters: Filters = {
    dateFrom: '',
    dateTo: '',
    confidenceMin: 81,
    selectedLabels: options?.selectedLabels ?? [],
  };

  render(
    <Sidebar
      activeTab={options?.activeTab ?? 'fauna'}
      selectedBiome="temperate-forest"
      labels={options?.labels ?? faunaLabels}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onExportReport={vi.fn()}
    />
  );

  return { onFiltersChange, filters };
}

describe('Sidebar group headers', () => {
  it('shows Animals instead of Fauna in the filter header for fauna tab', () => {
    renderSidebar({ activeTab: 'fauna', labels: faunaLabels });

    expect(screen.getByRole('button', { name: 'Animals' })).toBeInTheDocument();
    expect(screen.queryByText('Fauna')).not.toBeInTheDocument();
  });

  it('selects all labels when Animals header is clicked', () => {
    const { onFiltersChange, filters } = renderSidebar({ activeTab: 'fauna', labels: faunaLabels, selectedLabels: [] });

    fireEvent.click(screen.getByRole('button', { name: 'Animals' }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      selectedLabels: ['Beaver', 'Lynx'],
    });
  });

  it('deselects all fauna labels when Animals header is clicked and all are selected', () => {
    const { onFiltersChange, filters } = renderSidebar({
      activeTab: 'fauna',
      labels: faunaLabels,
      selectedLabels: ['Beaver', 'Lynx', 'Conifer'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Animals' }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      selectedLabels: ['Conifer'],
    });
  });

  it('shows indeterminate state for partial Animals selection', () => {
    renderSidebar({ activeTab: 'fauna', labels: faunaLabels, selectedLabels: ['Beaver'] });

    expect(screen.getByRole('checkbox', { name: 'Toggle Animals labels' })).toHaveAttribute('data-state', 'indeterminate');
  });

  it('toggles only tree labels when Trees header is clicked in flora tab', () => {
    const { onFiltersChange, filters } = renderSidebar({ activeTab: 'flora', labels: floraLabels, selectedLabels: ['Agave'] });

    fireEvent.click(screen.getByRole('button', { name: 'Trees' }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      selectedLabels: ['Agave', 'Birch Tree', 'Conifer'],
    });
  });
});
