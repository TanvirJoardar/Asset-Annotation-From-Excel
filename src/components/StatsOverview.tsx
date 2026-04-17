import { CheckCircle, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import type { Stats } from '../types';

interface StatsOverviewProps {
  stats: Stats;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-label">Source Spreadsheet</span>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-400" />
          <span className="stat-value">{stats.excelFiles > 0 ? 'Loaded' : 'Missing'}</span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-label">Images Referenced</span>
        <div className="flex items-center gap-2">
          <ImageIcon className="text-fuchsia-400" />
          <span className="stat-value">{stats.distinctImages}</span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-label">Total Annotations</span>
        <div className="flex items-center gap-2">
          <CheckCircle className="text-violet-400" />
          <span className="stat-value">{stats.annotationsFound}</span>
        </div>
      </div>
    </div>
  );
}
