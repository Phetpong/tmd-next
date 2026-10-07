"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutDashboard, Map, Settings2, Info, Activity, CalendarDays, MapPin, Download } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { toPng } from 'html-to-image';

const STATIONS = [
  { id: 'mueang', name: 'อ.เมืองกำแพงเพชร', isMain: true, district: 'เมืองกำแพงเพชร', offsetX: 0, offsetY: 25 },
  { id: 'mueang_nikom', name: 'นิคมฯทุ่งโพธิ์ทะเล', isMain: false, district: 'เมืองกำแพงเพชร', offsetX: 35, offsetY: -35 },
  { id: 'sai_ngam', name: 'อ.ไทรงาม', isMain: true, district: 'ไทรงาม', offsetX: 0, offsetY: 0 },
  { id: 'khlong_lan', name: 'อ.คลองลาน', isMain: true, district: 'คลองลาน', offsetX: 0, offsetY: 30 },
  { id: 'khlong_lan_plangsee', name: 'บ้านแปลงสี่', isMain: false, district: 'คลองลาน', offsetX: 25, offsetY: 75 },
  { id: 'khlong_lan_angklong', name: 'อ่างคลองมดแดง', isMain: false, district: 'คลองลาน', offsetX: -45, offsetY: -30 },
  { id: 'khlong_lan_klongkayang', name: 'บ้านคลองแขยง', isMain: false, district: 'คลองลาน', offsetX: 45, offsetY: -30 },
  { id: 'khanu', name: 'อ.ขาณุวรลักษบุรี', isMain: true, district: 'ขาณุวรลักษบุรี', offsetX: 0, offsetY: 0 },
  { id: 'khlong_khlung', name: 'อ.คลองขลุง', isMain: true, district: 'คลองขลุง', offsetX: 0, offsetY: 0 },
  { id: 'phran_kratai', name: 'อ.พรานกระต่าย', isMain: true, district: 'พรานกระต่าย', offsetX: 0, offsetY: 0 },
  { id: 'lan_krabue', name: 'อ.ลานกระบือ', isMain: true, district: 'ลานกระบือ', offsetX: 0, offsetY: 0 },
  { id: 'sai_thong', name: 'อ.ทรายทองวัฒนา', isMain: true, district: 'ทรายทองวัฒนา', offsetX: 0, offsetY: 0 },
  { id: 'pang_sila', name: 'อ.ปางศิลาทอง', isMain: true, district: 'ปางศิลาทอง', offsetX: 0, offsetY: 25 },
  { id: 'bueng_samakkhi', name: 'อ.บึงสามัคคี', isMain: true, district: 'บึงสามัคคี', offsetX: 0, offsetY: 15 },
  { id: 'kosamphi', name: 'อ.โกสัมพีนคร', isMain: true, district: 'โกสัมพีนคร', offsetX: 20, offsetY: -15 },
  { id: 'kosamphi_thaphutra', name: 'บ้านท่าพุทรา', isMain: false, district: 'โกสัมพีนคร', offsetX: -25, offsetY: 25 }
];

export default function App() {
  // State to hold data for each district. Initialized to empty string for empty inputs.
  const [districtData, setDistrictData] = useState<Record<string, string>>(() => {
    const initialState: Record<string, string> = {};
    STATIONS.forEach(s => {
      initialState[s.id] = '';
    });
    return initialState;
  });

  const [currentDate, setCurrentDate] = useState('');
  const [tooltipContent, setTooltipContent] = useState('');
  const mapRef = useRef(null);

  const downloadMap = () => {
    const mainElement = document.getElementById('dashboard-main');
    if (!mainElement) return;

    // Save original styles to restore later
    const originalStyle = mainElement.getAttribute('style');
    
    const A4_WIDTH = 1200;
    const A4_HEIGHT = Math.floor(A4_WIDTH * 1.4142); // A4 Aspect Ratio

    // Temporarily take element out of flex flow completely using fixed positioning 
    // and strictly define dimensions to prevent html-to-image offset bugs.
    mainElement.style.position = 'fixed';
    mainElement.style.left = '0';
    mainElement.style.top = '0';
    mainElement.style.width = `${A4_WIDTH}px`;
    mainElement.style.minWidth = `${A4_WIDTH}px`;
    mainElement.style.height = `${A4_HEIGHT}px`;
    mainElement.style.zIndex = '-1000'; // prevent flashing over UI

    // Use html-to-image to capture the entire layout in A4 ratio
    toPng(mainElement, {
      cacheBust: true,
      backgroundColor: '#e0f2fe', // sky-100 base color
      width: A4_WIDTH,
      height: A4_HEIGHT,
      style: {
        width: `${A4_WIDTH}px`,
        height: `${A4_HEIGHT}px`,
        minWidth: `${A4_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        transform: 'none',
        transformOrigin: 'top left',
        margin: '0'
      },
      filter: (node) => {
        // Exclude the download button from the generated image
        if (node.id === 'download-button') return false;
        return true;
      }
    })
    .then((dataUrl) => {
      // Restore original styles
      if (originalStyle) {
        mainElement.setAttribute('style', originalStyle);
      } else {
        mainElement.removeAttribute('style');
      }

      const link = document.createElement('a');
      link.download = `kamphaengphet_report_${currentDate || 'today'}.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      // Restore original styles
      if (originalStyle) {
        mainElement.setAttribute('style', originalStyle);
      } else {
        mainElement.removeAttribute('style');
      }
      console.error('Error generating image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ กรุณาลองใหม่อีกครั้ง');
    });
  };

  // Set today's date on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
  }, []);

  // Handle input changes from the sidebar
  const handleInputChange = (id: string, value: string) => {
    setDistrictData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Determine fill color for SVG map based on rainfall criteria
  const getFillColor = (value: string) => {
    const val = value.toString().trim().toUpperCase();
    if (val === '' || val === '-' || val === null) return '#9ca3af'; // Gray (ไม่ได้รับข้อมูล)
    if (val === '0.0' || val === '0') return '#ffffff'; // White (ไม่มีฝนตก)
    if (val === 'T') return '#60a5fa'; // Blue (ฝนวัดไม่ได้/เล็กน้อยมาก)
    if (val === 'U') return '#818cf8'; // Indigo (มีฝนตกแต่ไม่ทราบปริมาณ)
    
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num >= 90.1) return '#ef4444'; // Red (หนักมาก)
      if (num >= 35.1) return '#f97316'; // Orange (หนัก)
      if (num >= 10.1) return '#facc15'; // Yellow (ปานกลาง)
      if (num >= 0.1) return '#4ade80'; // Green (เล็กน้อย)
      return '#ffffff';
    }
    return '#9ca3af';
  };

  const getColorClass = (value: string) => {
    const color = getFillColor(value);
    if (color === '#9ca3af') return 'bg-gray-400 text-white border-gray-500';
    if (color === '#ffffff') return 'bg-white text-slate-800 border-slate-300';
    if (color === '#60a5fa') return 'bg-blue-400 text-white border-blue-500';
    if (color === '#818cf8') return 'bg-indigo-400 text-white border-indigo-500';
    if (color === '#ef4444') return 'bg-red-500 text-white border-red-600';
    if (color === '#f97316') return 'bg-orange-500 text-white border-orange-600';
    if (color === '#facc15') return 'bg-yellow-400 text-slate-800 border-yellow-500';
    if (color === '#4ade80') return 'bg-green-400 text-slate-800 border-green-500';
    return 'bg-gray-400 text-white border-gray-500';
  };

  const formatDisplayValue = (val: string) => {
    const v = val.toString().trim().toUpperCase();
    if (v === 'T') return 'เล็กน้อย';
    if (v === 'U') return 'ฝนตก';
    return val;
  };

  // Fill with random data for demonstration purposes
  const fillRandomData = () => {
    const newData: Record<string, string> = {};
    STATIONS.forEach(s => {
      newData[s.id] = Math.floor(Math.random() * 100).toString();
    });
    setDistrictData(newData);
  };

  // Clear all data
  const clearData = () => {
    const newData: Record<string, string> = {};
    STATIONS.forEach(s => {
      newData[s.id] = '';
    });
    setDistrictData(newData);
  };

  // Calculate max rainfall for the summary card
  const maxRainfallData = useMemo(() => {
    let max = -1;
    let maxStation: string | null = null;
    STATIONS.forEach(s => {
      const val = parseFloat(districtData[s.id]);
      if (!isNaN(val) && val > max) {
        max = val;
        maxStation = s.name;
      }
    });
    return { max: max > -1 ? max : 0, district: maxStation };
  }, [districtData]);

  // Sort stations based on rainfall (descending)
  const sortedStations = useMemo(() => {
    return [...STATIONS].sort((a, b) => {
      const parseVal = (val: string) => {
        if (val === '' || val === '-') return -2;
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
        return -1; // Treat T or มีฝนตก as slightly above empty but below numbers
      };
      const valA = parseVal(districtData[a.id]);
      const valB = parseVal(districtData[b.id]);
      return valB - valA;
    });
  }, [districtData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* LEFT SIDEBAR: Inputs */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col h-auto md:h-screen sticky top-0 z-10">
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">จัดการข้อมูล</h2>
          </div>
          <p className="text-sm text-slate-500 mb-2">กรอกตัวเลขเพื่ออัปเดตสีพื้นที่อัตโนมัติ</p>
          <div className="bg-sky-50 rounded p-3 text-xs text-slate-700 border border-sky-100">
            <strong>คำแนะนำ:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>กรอก <strong>T</strong> สำหรับฝนตกเล็กน้อยมาก</li>
              <li>กรอก <strong>U</strong> สำหรับมีฝนตกแต่ไม่ทราบปริมาณ</li>
            </ul>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button 
              onClick={fillRandomData}
              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold py-2 px-3 rounded-md transition-colors"
            >
              สุ่มข้อมูล
            </button>
            <button 
              onClick={clearData}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 px-3 rounded-md transition-colors"
            >
              ล้างข้อมูล
            </button>
          </div>
        </div>

        {/* District Input List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {Array.from(new Set(STATIONS.map(s => s.district))).map((districtName) => (
            <div key={districtName} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <h3 className="font-bold text-slate-800 text-sm border-b pb-1 mb-1">{districtName}</h3>
              {STATIONS.filter(s => s.district === districtName).map(station => (
                <div key={station.id} className="flex flex-col pl-2 mb-2">
                  <label htmlFor={station.id} className="text-xs font-medium text-slate-600 mb-1 flex justify-between">
                    <span>{station.name} {station.isMain ? '' : '(จุดย่อย)'}</span>
                    <span className={`w-2.5 h-2.5 rounded-full mt-0.5 border border-slate-300 ${getColorClass(districtData[station.id]).split(' ')[0]}`}></span>
                  </label>
                  <input
                    type="text"
                    id={station.id}
                    value={districtData[station.id] || ''}
                    onChange={(e) => handleInputChange(station.id, e.target.value)}
                    className="w-full text-sm font-bold bg-white text-slate-900 px-3 py-1.5 rounded-md border border-slate-200 focus:border-indigo-400 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 shadow-sm transition-all"
                    placeholder="ระบุค่า"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {}
      {/* MAIN CONTENT: Dashboard & Grid */}
      <main className="flex-1 flex flex-col h-auto md:h-screen overflow-y-auto bg-sky-50 relative">
        <div id="dashboard-main" className="flex flex-col bg-gradient-to-b from-sky-100 to-sky-200 shrink-0 pb-8">
        {/* Header Banner */}
        <header className="w-full relative overflow-hidden shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 30%, #059669 60%, #10b981 100%)' }}>
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-300 rounded-full blur-2xl"></div>
            <div className="absolute top-0 right-1/3 w-40 h-40 bg-teal-200 rounded-full blur-2xl"></div>
          </div>
          {/* Subtle diagonal lines */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.3) 30px, rgba(255,255,255,0.3) 31px)' }}></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center max-w-5xl mx-auto gap-6 md:gap-10 px-6 md:px-12 py-6 md:py-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/20 backdrop-blur-sm p-1.5 shadow-2xl ring-2 ring-white/30">
                <img src="/tmd_logo.png" alt="กรมอุตุนิยมวิทยา" className="w-full h-full rounded-full object-contain drop-shadow-lg" />
              </div>
            </div>

            {/* Title block */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
              <p className="text-emerald-200 text-xs md:text-sm font-semibold tracking-widest uppercase">
                กรมอุตุนิยมวิทยา &bull; Thai Meteorological Department
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                รายงานปริมาณน้ำฝน
              </h1>
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-1">
                <h2 className="text-xl md:text-2xl font-bold text-emerald-100" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                  จังหวัดกำแพงเพชร
                </h2>
                <span className="hidden md:inline text-emerald-300 text-2xl font-light">|</span>
                <h3 className="text-base md:text-lg font-black text-emerald-900 bg-gradient-to-r from-yellow-300 to-yellow-400 px-5 py-1.5 rounded-full shadow-lg border-2 border-yellow-200 uppercase tracking-wide transform transition-transform hover:scale-105" style={{ textShadow: 'none' }}>
                  สถานีอุตุนิยมวิทยากำแพงเพชร
                </h3>
              </div>
            </div>

          </div>

          {/* Bottom accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-emerald-300 to-teal-400"></div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 md:p-8 flex-1 flex flex-col z-10">
          
          <div className="w-full max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-4 mb-4 relative z-20">
            {/* Date picker */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-emerald-800 px-5 py-2.5 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <input 
                type="date" 
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent border-none font-bold text-slate-700 focus:outline-none focus:ring-0 p-0 cursor-pointer"
              />
            </div>

            {/* Download Button */}
            <button 
              id="download-button"
              onClick={downloadMap}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md border border-indigo-200 transition-all"
            >
              <Download className="w-4 h-4" /> บันทึกรูปภาพ
            </button>
          </div>

          {/* Map View */}
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative">
            
            {/* Max Rainfall Float */}
            <div className="absolute top-4 right-8 z-10 bg-white border-4 border-rose-500 rounded-3xl p-4 shadow-xl transform rotate-2 hidden md:block">
               <div className="text-center">
                 <p className="text-slate-700 font-bold text-sm mb-1">ปริมาณฝนสูงสุดวันนี้</p>
                 <div className="bg-amber-100 text-amber-800 text-2xl font-black rounded-xl py-1 px-4 border-2 border-amber-300">
                   {maxRainfallData.max.toFixed(1)} มม.
                 </div>
                 <p className="text-rose-600 font-bold text-sm mt-2 flex items-center justify-center gap-1">
                   <MapPin className="w-4 h-4" /> ที่ {maxRainfallData.district || '-'}
                 </p>
               </div>
            </div>

            <div className="w-full relative" ref={mapRef}>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: 29000,
                  center: [99.52, 16.38]
                }}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography="/kamphaengphet.geojson">
                  {({ geographies }) => (
                    <>
                      {/* 1. Draw all districts first so borders don't overlap labels */}
                      {geographies.map((geo: any) => {
                        const districtName = geo.properties?.amp_th;
                        const mainStation = STATIONS.find(s => s.district === districtName && s.isMain);
                        const value = mainStation ? districtData[mainStation.id] : '';
                        const fillColor = getFillColor(value);
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor}
                            stroke="#64748b"
                            strokeWidth={2}
                            style={{
                              default: { outline: "none", transition: "all 250ms" },
                              hover: { fill: "#818cf8", outline: "none", cursor: "pointer", transition: "all 250ms" },
                              pressed: { outline: "none" },
                            } as any}
                          />
                        );
                      })}
                      {/* 2. Draw all labels on top */}
                      {geographies.map((geo: any) => {
                        const districtName = geo.properties?.amp_th;
                        const stationsInDistrict = STATIONS.filter(s => s.district === districtName);
                        const centroid = geoCentroid(geo);
                        
                        return (
                          <g key={`marker-group-${geo.rsmKey}`}>
                            {stationsInDistrict.map((station, i) => {
                              const value = districtData[station.id];
                              if (value === '') return null;
                              
                              return (
                                <Marker key={`marker-${geo.rsmKey}-${i}`} coordinates={centroid}>
                                  <g transform={`translate(${station.offsetX}, ${station.offsetY})`}>
                                    <text
                                      textAnchor="middle"
                                      y={station.isMain ? -16 : -13}
                                      style={{ 
                                        fontFamily: "system-ui, sans-serif", 
                                        fill: "#0f172a", 
                                        fontSize: station.isMain ? "13px" : "10.5px", 
                                        fontWeight: "800", 
                                        pointerEvents: "none",
                                        stroke: "#ffffff",
                                        strokeWidth: station.isMain ? 3.5 : 2.5,
                                        strokeLinejoin: "round",
                                        paintOrder: "stroke"
                                      }}
                                    >
                                      {station.name}
                                    </text>
                                    <rect 
                                      x={station.isMain ? (formatDisplayValue(value).length > 4 ? -35 : -28) : (formatDisplayValue(value).length > 4 ? -28 : -22)} 
                                      y={station.isMain ? -5 : -3} 
                                      width={station.isMain ? (formatDisplayValue(value).length > 4 ? 70 : 56) : (formatDisplayValue(value).length > 4 ? 56 : 44)} 
                                      height={station.isMain ? 20 : 16} 
                                      rx={station.isMain ? 10 : 8} 
                                      fill="#ffffff" 
                                      stroke={station.isMain ? "#4f46e5" : "#64748b"} 
                                      strokeWidth={station.isMain ? 2 : 1.5} 
                                      opacity={0.95} 
                                    />
                                    <text
                                      textAnchor="middle"
                                      y={station.isMain ? 9.5 : 8.5}
                                      style={{ fontFamily: "system-ui, sans-serif", fill: "#1e293b", fontSize: station.isMain ? "12px" : "10px", fontWeight: "800", pointerEvents: "none" }}
                                    >
                                      {formatDisplayValue(value)}
                                    </text>
                                  </g>
                                </Marker>
                              );
                            })}
                          </g>
                        );
                      })}
                    </>
                  )}
                </Geographies>
              </ComposableMap>
            </div>
            <Tooltip id="map-tooltip" content={tooltipContent} />
          </div>

          {/* Legend */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 mt-4 mb-8 mx-auto w-full max-w-4xl">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 mb-3 border-b pb-2">
              <Info className="w-5 h-5 text-indigo-500" /> เกณฑ์ปริมาณฝน
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-gray-400"></span> ไม่ได้รับข้อมูล</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-white"></span> ไม่มีฝนตก (0.0)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-blue-400"></span> เล็กน้อยมาก (T)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-indigo-400"></span> ตกแต่ไม่ทราบปริมาณ (U)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-green-400"></span> เล็กน้อย (0.1 - 10.0)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-yellow-400"></span> ปานกลาง (10.1 - 35.0)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-orange-500"></span> หนัก (35.1 - 90.0)</div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border border-slate-300 bg-red-500"></span> หนักมาก (90.1 ขึ้นไป)</div>
            </div>
          </div>

          {/* Grid Layout for Top 4 Stations */}
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" /> สถานีที่มีปริมาณฝนสูงสุด (4 อันดับแรก)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedStations.slice(0, 4).map((station) => {
                const value = districtData[station.id];
                const colorClasses = getColorClass(value);
                
                return (
                  <div 
                    key={station.id} 
                    className={`
                      relative overflow-hidden rounded-2xl border-2 p-4 h-32 
                      flex flex-col justify-between shadow-sm hover:shadow-md
                      transition-all duration-500 ease-in-out transform hover:-translate-y-1
                      ${colorClasses}
                    `}
                  >
                    <div className="z-10 relative">
                      <h3 className="font-bold text-lg drop-shadow-sm leading-tight">{station.name}</h3>
                      {!station.isMain && <span className="text-xs opacity-75">{station.district}</span>}
                    </div>
                    
                    <div className="z-10 relative flex items-end justify-between">
                      <span className="text-xs opacity-90 font-bold mb-1">ปริมาณฝน</span>
                      <span className={`${value !== '' && formatDisplayValue(value).length > 4 ? 'text-xl' : 'text-3xl'} font-black tracking-tighter drop-shadow-md`}>
                        {value !== '' ? formatDisplayValue(value) : '-'}
                      </span>
                    </div>

                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
        </div> {/* End of capture zone */}

        {/* NON-CAPTURED ZONE: Rest of the stations */}
        <div className="flex-1 bg-sky-50 p-4 md:p-8 pt-8 z-10">
          <div className="w-full max-w-4xl mx-auto">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" /> สถานีอื่นๆ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {sortedStations.slice(4).map((station) => {
                const value = districtData[station.id];
                const colorClasses = getColorClass(value);
                
                return (
                  <div 
                    key={station.id} 
                    className={`
                      relative overflow-hidden rounded-2xl border-2 p-4 h-32 
                      flex flex-col justify-between shadow-sm hover:shadow-md
                      transition-all duration-500 ease-in-out transform hover:-translate-y-1
                      ${colorClasses}
                    `}
                  >
                    <div className="z-10 relative">
                      <h3 className="font-bold text-lg drop-shadow-sm leading-tight">{station.name}</h3>
                      {!station.isMain && <span className="text-xs opacity-75">{station.district}</span>}
                    </div>
                    
                    <div className="z-10 relative flex items-end justify-between">
                      <span className="text-xs opacity-90 font-bold mb-1">ปริมาณฝน</span>
                      <span className={`${value !== '' && formatDisplayValue(value).length > 4 ? 'text-xl' : 'text-3xl'} font-black tracking-tighter drop-shadow-md`}>
                        {value !== '' ? formatDisplayValue(value) : '-'}
                      </span>
                    </div>

                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>
      
    </div>
  );
}