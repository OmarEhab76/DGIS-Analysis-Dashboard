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
    vi.useRealTimers();

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

  it('keeps confidence histogram bins visible when no detections are returned', () => {
    render(<StatisticsDashboard />);

    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /show confidence details for/i })).toHaveLength(11);
  });

  it('renders confidence histogram from live detections and shows bin details on hover', async () => {
    const detections = [
      {
        id: 1,
        name: 'Hickory',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 10,
        y: 20,
        z: 30,
        confidence: 52,
        droneId: 2,
        percentX: 50,
        percentY: 50,
      },
      {
        id: 2,
        name: 'Hickory',
        timestamp: '2026-01-01T01:00:00.000Z',
        x: 12,
        y: 22,
        z: 34,
        confidence: 57,
        droneId: 2,
        percentX: 52,
        percentY: 48,
      },
      {
        id: 3,
        name: 'Maple',
        timestamp: '2026-01-01T02:00:00.000Z',
        x: 14,
        y: 24,
        z: 36,
        confidence: 92,
        droneId: 2,
        percentX: 54,
        percentY: 46,
      },
      {
        id: 4,
        name: 'Maple',
        timestamp: '2026-01-01T03:00:00.000Z',
        x: 16,
        y: 26,
        z: 38,
        confidence: 94,
        droneId: 2,
        percentX: 56,
        percentY: 44,
      },
      {
        id: 5,
        name: 'Maple',
        timestamp: '2026-01-01T04:00:00.000Z',
        x: 18,
        y: 28,
        z: 40,
        confidence: 100,
        droneId: 2,
        percentX: 58,
        percentY: 42,
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

    expect(screen.getByText('79.0%')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /show confidence details for/i })).toHaveLength(11);

    fireEvent.pointerEnter(screen.getByRole('button', { name: /show confidence details for 90-94% bin/i }));

    expect(await screen.findByText('90-94%')).toBeInTheDocument();
    expect(screen.getByText('Detections')).toBeInTheDocument();
    expect(screen.getByText('93.0%')).toBeInTheDocument();
    expect(screen.getByText('Map')).toBeInTheDocument();
    expect(screen.getByText('Temperate Forest')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Flora')).toBeInTheDocument();
  });

  it('shows species hover details with count, avg confidence, and map label', async () => {
    const detections = [
      {
        id: 1,
        name: 'Hickory',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 10,
        y: 20,
        z: 30,
        confidence: 80,
        droneId: 2,
        percentX: 50,
        percentY: 50,
      },
      {
        id: 2,
        name: 'Hickory',
        timestamp: '2026-01-01T01:00:00.000Z',
        x: 12,
        y: 22,
        z: 34,
        confidence: 100,
        droneId: 2,
        percentX: 52,
        percentY: 48,
      },
      {
        id: 3,
        name: 'Maple',
        timestamp: '2026-01-01T02:00:00.000Z',
        x: 14,
        y: 24,
        z: 36,
        confidence: 92,
        droneId: 2,
        percentX: 54,
        percentY: 46,
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

    fireEvent.pointerEnter(screen.getByRole('button', { name: /show details for hickory/i }));

    expect(await screen.findByText('Avg confidence')).toBeInTheDocument();
    expect(screen.getByText('Taxonomy')).toBeInTheDocument();
    expect(screen.getByText('Broadleaf Trees')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('Temperate Forest')).toBeInTheDocument();
    expect(screen.getByText('Map')).toBeInTheDocument();
  });
});