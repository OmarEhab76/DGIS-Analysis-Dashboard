import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
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
  default: ({ onTabChange }: { onTabChange: (tab: 'flora' | 'fauna') => void }) => (
    <div>
      <span>Navbar</span>
      <button type="button" onClick={() => onTabChange('flora')}>Flora Tab</button>
      <button type="button" onClick={() => onTabChange('fauna')}>Fauna Tab</button>
    </div>
  ),
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

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => {
      const child = Array.isArray(children) ? children[0] : children;
      if (isValidElement(child)) {
        return cloneElement(child as ReactElement<{ width?: number; height?: number }>, {
          width: 800,
          height: 400,
        });
      }

      return <div>{children}</div>;
    },
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
    expect(screen.getByText('Confidence Score Distribution')).toBeInTheDocument();
  });

  it('renders confidence histogram from live detections', () => {
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
    expect(screen.getByText('Confidence Score Distribution')).toBeInTheDocument();
  });

  it('renders species section for populated detections', () => {
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

    expect(screen.getByText('Species Count')).toBeInTheDocument();
    expect(screen.queryByText('No species data available')).not.toBeInTheDocument();
  });

  it('keeps flora morphology chart active on flora tab', () => {
    const detections = [
      {
        id: 1,
        name: 'Conifer',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 90,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 2,
        name: 'Conifer',
        timestamp: '2026-01-01T01:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 91,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 3,
        name: 'Conifer',
        timestamp: '2026-01-01T02:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 92,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 4,
        name: 'Maple',
        timestamp: '2026-01-01T03:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 85,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 5,
        name: 'Maple',
        timestamp: '2026-01-01T04:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 86,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 6,
        name: 'Hickory',
        timestamp: '2026-01-01T05:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 87,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 7,
        name: 'Desert Willow',
        timestamp: '2026-01-01T06:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 88,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 8,
        name: 'Buffalograss',
        timestamp: '2026-01-01T07:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 89,
        droneId: 2,
        percentX: 10,
        percentY: 20,
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

    expect(screen.getByText('Tree Morphology Plot')).toBeInTheDocument();
    expect(screen.getByText('Average dimensions vs. number of trees on the selected map')).toBeInTheDocument();
    expect(screen.queryByText('No morphology detections for the current filters.')).not.toBeInTheDocument();
  });

  it('renders fauna morphology chart with weight and size axes when switching to fauna tab', () => {
    const detections = [
      {
        id: 1,
        name: 'Beaver',
        timestamp: '2026-01-01T00:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 90,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 2,
        name: 'Beaver',
        timestamp: '2026-01-01T01:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 91,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
      {
        id: 3,
        name: 'Lynx',
        timestamp: '2026-01-01T02:00:00.000Z',
        x: 1,
        y: 2,
        z: 3,
        confidence: 92,
        droneId: 2,
        percentX: 10,
        percentY: 20,
      },
    ];

    const faunaLabelsQueryResult = {
      ...LABELS_QUERY_RESULT,
      data: [
        { name: 'Beaver', group: 'fauna', count: 2 },
        { name: 'Lynx', group: 'fauna', count: 1 },
      ],
    };

    vi.mocked(useQuery).mockImplementation(
      ((options: { queryKey: unknown[] }) => {
        const scope = String(options.queryKey[0]);

        if (scope === 'dashboard-labels') {
          const tab = String(options.queryKey[2]);
          if (tab === 'fauna') {
            return faunaLabelsQueryResult;
          }
          return LABELS_QUERY_RESULT;
        }

        return {
          ...DETECTIONS_QUERY_RESULT,
          data: detections,
        };
      }) as never
    );

    render(<StatisticsDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /fauna tab/i }));

    expect(screen.getByText('Fauna Morphology Plot')).toBeInTheDocument();
    expect(screen.getByText('Average weight vs. length/height and number of animals on the selected map')).toBeInTheDocument();
    expect(screen.queryByText('No morphology detections for the current filters.')).not.toBeInTheDocument();
    expect(screen.queryByText('Morphology plot is available on flora data only.')).not.toBeInTheDocument();
  });
});