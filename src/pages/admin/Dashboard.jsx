import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spin, message, Alert, Typography, Divider, Button } from 'antd';
import { 
  InboxOutlined, 
  FileExcelOutlined,
  ShoppingCartOutlined,
  DollarCircleOutlined,
  TagsOutlined,
  PayCircleOutlined,
  ShopOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { statisticAPI } from '../../apis';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import dayjs from 'dayjs';

ChartJS.register(...registerables);

const { Title, Text } = Typography;

/* ─── Stat card config ───────────────────────────────────────── */
const STATS = [
  { key: 'totalBookings', label: 'Tổng đặt chỗ', format: (v) => Number(v).toLocaleString('vi-VN'), suffix: 'đơn', icon: <ShoppingCartOutlined />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'totalRevenue', label: 'Doanh thu', format: (v) => Number(v).toLocaleString('vi-VN'), suffix: '₫', icon: <DollarCircleOutlined />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'totalTickets', label: 'Ghế đã bán', format: (v) => Number(v).toLocaleString('vi-VN'), suffix: 'ghế', icon: <TagsOutlined />, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'averageBookingValue', label: 'Giá trị TB / Đơn', format: (v) => Math.round(Number(v)).toLocaleString('vi-VN'), suffix: '₫', icon: <PayCircleOutlined />, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'totalTheaters', label: 'Số rạp', format: (v) => Number(v).toLocaleString('vi-VN'), suffix: 'rạp', icon: <ShopOutlined />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'totalMovies', label: 'Số phim', format: (v) => Number(v).toLocaleString('vi-VN'), suffix: 'phim', icon: <VideoCameraOutlined />, color: 'text-rose-600', bg: 'bg-rose-50' },
];

/* ─── Shared chart options ───────────────────────────────────── */
const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 12 }, color: '#555' } },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('vi-VN')} ₫`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 12 }, color: '#6b7280' },
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: {
        font: { size: 11 },
        color: '#6b7280',
        callback: (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Number(v).toLocaleString('vi-VN'),
      },
    },
  },
};

/* ─── Empty state ────────────────────────────────────────────── */
const Empty = () => (
  <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-300">
    <InboxOutlined className="text-4xl" />
    <Text className="text-sm text-gray-300">Chưa có dữ liệu</Text>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [genreData, setGenreData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [theaterData, setTheaterData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  /* ── fetch ─── */
  const toArr = (res) => {
    const p = res?.data;
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') {
      if (Array.isArray(p.data)) return p.data;
      if (Array.isArray(p.items)) return p.items;
      return Object.values(p);
    }
    return [];
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovRes, genreRes, monthRes, yearRes, theaterRes] = await Promise.all([
        statisticAPI.getOverview(),
        statisticAPI.getRevenueByGenre({}),
        statisticAPI.getDailySales({}),
        statisticAPI.getYearlyRevenue({}),
        statisticAPI.getTheaterRevenueByYear({}),
      ]);
      setOverview(ovRes.data.data);
      setGenreData(toArr(genreRes));
      setMonthlyData(toArr(monthRes));
      setYearlyData(toArr(yearRes));
      setTheaterData(toArr(theaterRes));
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Tải dữ liệu thất bại';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── export ── */
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const res = await statisticAPI.exportDashboard();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Xuất file thành công!');
    } catch {
      message.error('Xuất file thất bại!');
    } finally {
      setExportLoading(false);
    }
  };

  /* ── normalize ─── */
  const norm = (d) => {
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object') return Object.values(d);
    return [];
  };

  /* ── chart renderers ─── */
  const renderPie = (data, lk, vk) => {
    const arr = norm(data);
    if (!arr.length) return <Empty />;
    return (
      <Pie
        data={{
          labels: arr.map((i) => i[lk]),
          datasets: [{
            data: arr.map((i) => i[vk]),
            backgroundColor: [
              '#f97316', '#ef4444', '#f59e0b', '#e879f9',
              '#fb7185', '#fbbf24', '#f43f5e', '#fb923c',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 10, font: { size: 12 }, color: '#555' } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString('vi-VN')} ₫` } },
          },
        }}
      />
    );
  };

  const renderLine = (data, xk, yk) => {
    const arr = norm(data);
    if (!arr.length) return <Empty />;
    const labels = arr.map((i) => {
      if (xk === 'month') return `Th${i[xk]}`;
      if (xk === 'year') return `${i[xk]}`;
      return typeof i[xk] === 'string' ? dayjs(i[xk]).format('MM/DD') : i[xk];
    });
    return (
      <Line
        data={{
          labels,
          datasets: [{
            label: 'Doanh thu',
            data: arr.map((i) => i[yk]),
            fill: true,
            backgroundColor: 'rgba(59,130,246,0.10)',
            borderColor: '#3b82f6',
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            borderWidth: 2,
          }],
        }}
        options={{
          ...baseOpts,
          scales: {
            ...baseOpts.scales,
            x: { ...baseOpts.scales.x },
            y: { ...baseOpts.scales.y },
          },
        }}
      />
    );
  };

  const YEAR_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#a7f3d0', '#065f46', '#d1fae5'];
  const THEATER_COLORS = ['#f97316', '#fb923c', '#ea580c', '#fdba74', '#c2410c', '#fed7aa', '#9a3412', '#ffedd5'];

  const renderBar = (data, xk, yk, palette) => {
    const arr = norm(data);
    if (!arr.length) return <Empty />;
    const colors = arr.map((_, i) => palette[i % palette.length]);
    return (
      <Bar
        data={{
          labels: arr.map((i) => i[xk]),
          datasets: [{
            label: 'Doanh thu',
            data: arr.map((i) => i[yk]),
            backgroundColor: colors,
            hoverBackgroundColor: colors.map((c) => c + 'cc'),
            borderRadius: 6,
            borderSkipped: false,
          }],
        }}
        options={{ ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: false } } }}
      />
    );
  };

  /* ── render ─── */
  return (
    <Spin spinning={loading} tip="Đang tải...">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>Dashboard</Title>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            loading={exportLoading}
            onClick={handleExport}
            className="bg-primary"
          >
            Xuất Excel
          </Button>
        </div>

        {error && <Alert message={error} type="error" showIcon className="mb-5 rounded-xl" />}

        {/* Stat cards */}
        {overview && (
          <Row gutter={[16, 16]} className="mb-6">
            {STATS.map((s) => (
              <Col key={s.key} xs={24} sm={12} md={8} lg={4}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 p-5 group relative overflow-hidden">
                  <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-[2.5] ${s.bg}`}></div>
                  
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className={`p-2.5 rounded-xl ${s.bg} ${s.color} transition-transform duration-300 group-hover:-translate-y-1`}>
                      <span className="text-xl flex">{s.icon}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-600">
                      {s.label}
                    </p>
                  </div>
                  
                  <div className="relative z-10 flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">
                      {s.format(overview[s.key] ?? 0)}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${s.bg} ${s.color}`}>
                      {s.suffix}
                    </span>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}

        {/* Row 1: Pie + Line */}
        <Row gutter={[16, 16]} className="mb-5">
          <Col xs={24} lg={10}>
            <Card title="Doanh thu theo thể loại" className="rounded-xl border-gray-200 shadow-sm">
              <div className="h-72">
                {renderPie(genreData, 'genreName', 'totalRevenue')}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title="Doanh thu theo tháng" className="rounded-xl border-gray-200 shadow-sm">
              <div className="h-72">
                {renderLine(monthlyData, 'month', 'totalRevenue')}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Bar year + Bar theater */}
        <Row gutter={[16, 16]} className="mb-5">
          <Col xs={24} lg={12}>
            <Card title="Doanh thu theo năm" className="rounded-xl border-gray-200 shadow-sm">
              <div className="h-72">
                {renderBar(yearlyData, 'year', 'totalRevenue', YEAR_COLORS)}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Doanh thu theo rạp" className="rounded-xl border-gray-200 shadow-sm">
              <div className="h-72">
                {renderBar(theaterData, 'theaterName', 'totalRevenue', THEATER_COLORS)}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
