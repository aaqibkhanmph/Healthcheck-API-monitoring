import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { History, BarChart3, TrendingUp, Zap, Shield } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HistoricalChart = ({ siteHistory, siteId, siteName, site }) => {
  const [timeRange, setTimeRange] = useState('24h');

  if (!siteHistory) {
    return (
      <div className="premium-card flex flex-col justify-center items-center h-[450px] text-center space-y-6">
        <div className="p-6 bg-slate-100 dark:bg-white/5 rounded-full animate-pulse border border-dashed border-slate-300 dark:border-white/10">
          <BarChart3 className="w-12 h-12 text-slate-300 dark:text-white/10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white opacity-40">Awaiting Signal Data</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Node sync in progress...</p>
        </div>
      </div>
    );
  }

  const { hourlyData, dailyData } = siteHistory;

  const deriveDailyData = (points) => {
    if (!points || points.length === 0) return [];

    const grouped = {};
    points.forEach(p => {
      const d = new Date(p.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    return Object.keys(grouped).map(dateKey => {
      const dayPoints = grouped[dateKey];

      const totalResponseTime = dayPoints.reduce((sum, p) => sum + (p.responseTime || 0), 0);
      const avgResponseTime = Math.round(totalResponseTime / dayPoints.length);

      const upCount = dayPoints.filter(p => p.status === 'operational').length;
      const uptime = Math.round((upCount / dayPoints.length) * 100 * 10) / 10;

      return {
        timestamp: dayPoints[0].timestamp,
        avgResponseTime,
        uptime,
      };
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const processedDailyData = dailyData && dailyData.length > 0 ? dailyData : deriveDailyData(hourlyData);

  const prepareChartData = () => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const primaryColor = '#6366f1';
    const secondaryColor = '#10b981';

    if (timeRange === '24h') {
      const labels = (hourlyData || []).map(data => {
        const d = new Date(data.timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });

      const responseTimeData = (hourlyData || []).map(data => data.responseTime);

      return {
        labels,
        datasets: [
          {
            label: 'LATENCY',
            data: responseTimeData,
            borderColor: primaryColor,
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) return null;
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
              gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
              return gradient;
            },
            fill: true,
            tension: 0.45,
            borderWidth: 4,
            pointRadius: (context) => {
              const dataPoint = hourlyData?.[context.dataIndex];
              return dataPoint?.status === 'outage' ? 8 : 0;
            },
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 10,
            pointHoverBackgroundColor: (context) => {
              const dataPoint = hourlyData?.[context.dataIndex];
              return dataPoint?.status === 'outage' ? '#ef4444' : primaryColor;
            },
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 4,
          }
        ]
      };
    } else {
      const labels = (processedDailyData || []).map(data =>
        new Date(data.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
      );

      return {
        labels,
        datasets: [
          {
            label: 'AVG LATENCY',
            data: (processedDailyData || []).map(data => data.avgResponseTime),
            borderColor: primaryColor,
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: primaryColor,
          },
          {
            label: 'STABILITY',
            data: (processedDailyData || []).map(data => data.uptime),
            borderColor: secondaryColor,
            backgroundColor: 'transparent',
            yAxisID: 'y1',
            tension: 0.4,
            fill: false,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: secondaryColor,
          }
        ]
      };
    }
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, bottom: 20 }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { size: 11, weight: '900', family: 'Inter' },
        bodyFont: { size: 13, weight: '700', family: 'Inter' },
        padding: 16,
        cornerRadius: 16,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            const dataPoint = hourlyData[context.dataIndex];
            const status = dataPoint?.status === 'operational' ? '🟢 OPERATIONAL' : '🔴 OUTAGE';
            return [`LATENCY: ${context.parsed.y}ms`, `STATUS: ${status}`];
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: '800', family: 'Inter' },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.05)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: '800', family: 'Inter' },
          padding: 10
        },
        beginAtZero: true
      },
      ...(timeRange === '30d' ? {
        y1: {
          position: 'right',
          grid: { display: false },
          ticks: { color: '#10b981', font: { size: 10, weight: '800', family: 'Inter' } },
          min: 90
        }
      } : {})
    }
  };

  return (
    <div className="premium-card p-10 space-y-10 relative group">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              Performance Matrix
            </h3>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${timeRange === '24h'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl translate-y-[-1px]'
              : 'text-slate-500 hover:text-indigo-500'
              }`}
          >
            24H Pulse
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${timeRange === '30d'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl translate-y-[-1px]'
              : 'text-slate-500 hover:text-indigo-500'
              }`}
          >
            30D Trend
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full relative">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="flex flex-wrap items-center gap-10 pt-8 border-t border-slate-200 dark:border-white/5">
        <LegendItem 
            dotColor="bg-indigo-500" 
            label="LATENCY PULSE" 
            value={`${hourlyData?.[hourlyData.length - 1]?.responseTime || '--'}ms`} 
        />
        <LegendItem 
            dotColor={site?.status === 'outage' ? "bg-red-500" : "bg-emerald-500"} 
            label="NODE STABILITY" 
            value={(() => {
                if (!hourlyData || hourlyData.length === 0) return 'UNKNOWN';
                const upCount = hourlyData.filter(p => p.status === 'operational').length;
                const ratio = Math.round((upCount / hourlyData.length) * 100);
                return `${ratio}% ${ratio > 98 ? 'OPTIMAL' : ratio > 90 ? 'RELIABLE' : 'CRITICAL'}`;
            })()} 
        />

        <div className="ml-auto hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <Shield className={`w-4 h-4 ${site?.status === 'outage' ? 'text-red-500' : 'text-emerald-500'}`} />
          <span>Status: {site?.statusText || 'Active'}</span>
        </div>
      </div>
    </div>
  );
};

function LegendItem({ dotColor, label, value }) {
  return (
    <div className="flex items-center gap-4 group/leg">
      <div className={`w-3 h-3 rounded-full ${dotColor} shadow-lg shadow-current opacity-80 group-hover/leg:scale-125 transition-transform`}></div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">{label}</span>
        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
      </div>
    </div>
  );
}

export default HistoricalChart;
