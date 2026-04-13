import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Index from './Index';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { downloadCsvFile } from '@/lib/csvExport';

const LABELS_QUERY_RESULT = {
  data: [{ name: 'Hickory', group: 'trees', count: 5 }],
  isLoading: false,
  isError: false,
};

const DETECTIONS_QUERY_RESULT = {
  data: [],
  isLoading: false,
  isError: false,
};

const STATS_QUERY_RESULT = {
  data: { totalDetections: 0, totalTrees: 0, totalPlants: '-', areaScanned: 0 },
  isLoading: false,
  isError: false,
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/dashboard/Navbar', () => ({
  default: () => <div>Navbar</div>,
}));

vi.mock('@/components/dashboard/MapView', () => ({
  default: () => <div>MapView</div>,
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/csvExport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/csvExport')>('@/lib/csvExport');
  return {
    ...actual,
    downloadCsvFile: vi.fn(),
  };
});

describe('Index export behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuery).mockImplementation(
      ((options: { queryKey: unknown[] }) => {
        const scope = String(options.queryKey[0]);

        if (scope === 'dashboard-labels') {
          return LABELS_QUERY_RESULT;
        }

        if (scope === 'dashboard-detections') {
          return DETECTIONS_QUERY_RESULT;
        }

        return STATS_QUERY_RESULT;
      }) as never
    );
  });

  it('does not download and shows an error toast when no detections match filters', () => {
    render(<Index />);

    fireEvent.click(screen.getByRole('button', { name: /export report/i }));

    expect(downloadCsvFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No points found for the current filters.');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
