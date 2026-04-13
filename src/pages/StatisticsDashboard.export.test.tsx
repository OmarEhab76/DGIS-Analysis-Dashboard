import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatisticsDashboard from './StatisticsDashboard';
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

vi.mock('@/components/dashboard/Sidebar', () => ({
  default: ({ onExportReport, isExportDisabled }: { onExportReport: () => void; isExportDisabled?: boolean }) => (
    <button type="button" onClick={onExportReport} disabled={isExportDisabled}>
      Export Report
    </button>
  ),
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

describe('StatisticsDashboard export behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuery).mockImplementation(
      ((options: { queryKey: unknown[] }) => {
        const scope = String(options.queryKey[0]);

        if (scope === 'dashboard-labels') {
          return LABELS_QUERY_RESULT;
        }

        return DETECTIONS_QUERY_RESULT;
      }) as never
    );
  });

  it('does not download and shows an error toast when no detections match filters', () => {
    render(<StatisticsDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /export report/i }));

    expect(downloadCsvFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No points found for the current filters.');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('downloads csv and shows success toast when detections are available', () => {
    const detections = [
      {
        id: 1,
        name: 'Hickory',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 10,
        y: 20,
        z: 30,
        confidence: 94,
        droneId: 2,
        percentX: 50,
        percentY: 50,
      },
    ];

    vi.mocked(useQuery).mockImplementation(
      ((options: { queryKey: unknown[] }) => {
        const scope = String(options.queryKey[0]);

        if (scope === 'dashboard-labels') {
          return LABELS_QUERY_RESULT;
        }

        return {
          ...DETECTIONS_QUERY_RESULT,
          data: detections,
        };
      }) as never
    );

    render(<StatisticsDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /export report/i }));

    expect(downloadCsvFile).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Exported 1 points to CSV.');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('disables export while query data is loading', () => {
    vi.mocked(useQuery).mockImplementation(
      ((options: { queryKey: unknown[] }) => {
        const scope = String(options.queryKey[0]);

        if (scope === 'dashboard-labels') {
          return {
            ...LABELS_QUERY_RESULT,
            isLoading: true,
          };
        }

        return DETECTIONS_QUERY_RESULT;
      }) as never
    );

    render(<StatisticsDashboard />);

    expect(screen.getByRole('button', { name: /export report/i })).toBeDisabled();
  });
});