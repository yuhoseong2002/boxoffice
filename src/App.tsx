import { useState, useEffect, ChangeEvent } from "react";
import { 
  Film, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sun, 
  Moon, 
  Users, 
  Clock, 
  ChevronRight, 
  X, 
  Award, 
  Info, 
  Building2, 
  User, 
  Tag, 
  AlertCircle,
  Activity,
  Sparkles,
  Copy,
  Check,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DailyBoxOffice, 
  BoxOfficeResponse, 
  MovieInfo, 
  MovieDetailResponse, 
  ThemeMode 
} from "./types";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("kobis-boxoffice-theme");
    return (savedTheme as ThemeMode) || "dark";
  });

  // Calculate default date (Yesterday)
  const getYesterdayDateString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const yesterdayStr = getYesterdayDateString();

  // Date and Movie States
  const [selectedDate, setSelectedDate] = useState<string>(yesterdayStr);
  const [boxOfficeList, setBoxOfficeList] = useState<DailyBoxOffice[]>([]);
  const [selectedMovieCd, setSelectedMovieCd] = useState<string | null>(null);
  const [selectedMovieDetail, setSelectedMovieDetail] = useState<MovieInfo | null>(null);
  
  // AI Review States
  const [keywords, setKeywords] = useState<string[]>(["", "", ""]);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Loading & Error States
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Apply Theme on load and change
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("kobis-boxoffice-theme", theme);
  }, [theme]);

  // Fetch Daily Box Office List
  const fetchBoxOffice = async (dateStr: string) => {
    setIsListLoading(true);
    setListError(null);
    const apiDate = dateStr.replace(/-/g, "");
    
    try {
      const response = await fetch(`/api/boxoffice?date=${apiDate}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server returned ${response.status}`);
      }
      
      const data: BoxOfficeResponse = await response.json();
      if (data.boxOfficeResult && data.boxOfficeResult.dailyBoxOfficeList) {
        const list = data.boxOfficeResult.dailyBoxOfficeList;
        setBoxOfficeList(list);
        
        // Auto-select rank 1 movie if we have data on fresh fetch
        if (list.length > 0 && !selectedMovieCd) {
          handleMovieSelect(list[0].movieCd);
        } else if (list.length > 0) {
          // Refresh details of the already selected movie if it still exists in the list
          const exists = list.some(m => m.movieCd === selectedMovieCd);
          if (!exists) {
            handleMovieSelect(list[0].movieCd);
          }
        }
      } else {
        setBoxOfficeList([]);
      }
    } catch (err: any) {
      console.error(err);
      setListError(err.message || "박스오피스 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setIsListLoading(false);
    }
  };

  // Fetch Movie Details
  const fetchMovieDetail = async (movieCd: string) => {
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/movie?movieCd=${movieCd}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server returned ${response.status}`);
      }
      
      const data: MovieDetailResponse = await response.json();
      if (data.movieInfoResult && data.movieInfoResult.movieInfo) {
        setSelectedMovieDetail(data.movieInfoResult.movieInfo);
      } else {
        setSelectedMovieDetail(null);
        setDetailError("상세 영화 데이터가 유효하지 않습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setDetailError(err.message || "영화 상세정보를 불러오는 데 실패했습니다.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Handle Date Change
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
  };

  // Handle Box Office Fetch click or side-effects
  useEffect(() => {
    if (selectedDate) {
      fetchBoxOffice(selectedDate);
    }
  }, [selectedDate]);

  // Handle Movie Select
  const [lastSelectedCd, setLastSelectedCd] = useState<string | null>(null);
  const handleMovieSelect = (movieCd: string) => {
    setSelectedMovieCd(movieCd);
    fetchMovieDetail(movieCd);
    if (lastSelectedCd !== movieCd) {
      setKeywords(["", "", ""]);
      setAiReview(null);
      setAiError(null);
      setLastSelectedCd(movieCd);
    }
  };

  // Generate AI Movie Review
  const generateAiReview = async () => {
    if (!selectedMovieDetail) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiReview(null);

    try {
      const response = await fetch("/api/review/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieNm: selectedMovieDetail.movieNm,
          genres: selectedMovieDetail.genres.map(g => g.genreNm),
          keywords: keywords.filter(Boolean),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      setAiReview(data.review);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "감상평을 생성하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy AI Review to clipboard
  const handleCopyReview = async () => {
    if (!aiReview) return;
    try {
      await navigator.clipboard.writeText(aiReview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  // Utility to format numbers with commas
  const formatNumber = (numStr: string) => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return "0";
    return num.toLocaleString("ko-KR");
  };

  // Utility to format audience numbers in short form like (421902 -> 42.1만)
  const formatAudienceShort = (numStr: string) => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return "0";
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "만";
    }
    return num.toLocaleString("ko-KR");
  };

  // Utility to style rank changes
  const renderRankChangeText = (inten: string, oldNew: "OLD" | "NEW") => {
    if (oldNew === "NEW") {
      return (
        <span className="text-xs text-amber-500 dark:text-amber-400 font-bold italic tracking-tighter uppercase mr-1">
          NEW
        </span>
      );
    }
    const val = parseInt(inten, 10);
    if (isNaN(val) || val === 0) {
      return (
        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-bold italic mr-1">
          - 0
        </span>
      );
    }
    if (val > 0) {
      return (
        <span className="text-xs text-emerald-500 dark:text-emerald-400 font-bold italic mr-1">
          ▲ {val}
        </span>
      );
    }
    return (
      <span className="text-xs text-rose-500 dark:text-rose-400 font-bold italic mr-1">
        ▼ {Math.abs(val)}
      </span>
    );
  };

  const getKoreanDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
    }
    return dateStr;
  };

  // Locate current movie daily stats from cumulative list
  const activeMovieStats = boxOfficeList.find(m => m.movieCd === selectedMovieCd);

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-200 ${
      theme === "dark" 
        ? "bg-neutral-950 text-neutral-100" 
        : "bg-neutral-50 text-neutral-900"
    }`}>
      {/* Upper Header Section matching High Density mockup style */}
      <header className={`h-16 flex items-center justify-between px-6 border-b transition-colors duration-200 sticky top-0 z-40 backdrop-blur-md ${
        theme === "dark"
          ? "bg-neutral-900/85 border-neutral-800"
          : "bg-white/85 border-neutral-200 shadow-sm"
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className="bg-amber-500 text-neutral-950 font-black px-2 py-0.5 rounded text-[11px] tracking-tighter">
            KOBIS API
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">
            박스오피스 <span className="text-neutral-500 font-normal">Daily Insight</span>
          </h1>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Quick Date Picker styled neatly inline */}
          <div className={`flex items-center rounded-lg p-1 border ${
            theme === "dark" 
              ? "bg-neutral-800 border-neutral-700 text-neutral-200" 
              : "bg-neutral-100 border-neutral-200 text-neutral-800"
          }`}>
            <input 
              type="date" 
              value={selectedDate} 
              max={yesterdayStr} 
              onChange={handleDateChange}
              className="bg-transparent border-none text-xs md:text-sm font-semibold px-2 py-0.5 outline-none cursor-pointer"
            />
          </div>

          {/* Theme selection toggle buttons */}
          <div className={`flex items-center space-x-1.5 border-l pl-4 md:pl-6 ${
            theme === "dark" ? "border-neutral-800" : "border-neutral-200"
          }`}>
            <button 
              onClick={() => setTheme("dark")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                theme === "dark" 
                  ? "bg-neutral-800 text-amber-500 shadow-inner" 
                  : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              }`}
              title="다크모드"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTheme("light")}
              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                theme === "light" 
                  ? "bg-neutral-200 text-amber-600 shadow-inner" 
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
              title="라이트모드"
            >
              <Sun className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid/Panels Interface */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden items-stretch">
        
        {/* LEFT COLUMN (lg:col-span-5): Beautiful Cinematic Active Movie View */}
        <section className={`lg:col-span-5 relative group border-b lg:border-b-0 lg:border-r flex flex-col justify-between lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto customize-scrollbar ${
          theme === "dark" ? "border-neutral-800 bg-neutral-950" : "border-neutral-200 bg-neutral-100/40"
        }`}>
          {/* Dynamic background lighting/shadow style depending on image availability (using placeholder ambient graphic) */}
          <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
            <div className={`absolute inset-0 opacity-15 dark:opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${
              theme === "dark" ? "from-amber-500/30 via-neutral-950 to-neutral-950" : "from-amber-400/20 via-neutral-50 to-neutral-50"
            }`} />
            
            {/* Elegant abstract background graphics instead of missing poster to represent high-end media vibe */}
            <div className={`absolute right-4 top-16 w-64 h-64 rounded-full filter blur-3xl opacity-10 ${
              theme === "dark" ? "bg-amber-500" : "bg-neutral-400"
            }`} />
          </div>

          <div className="relative z-20 h-full flex flex-col justify-between p-6 sm:p-8 min-h-[420px] lg:min-h-[unset]">
            
            {/* Section Tag */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-red-600 text-[10px] text-white font-bold px-2.5 py-0.5 rounded tracking-wider uppercase">
                  Active Profile
                </span>
                {activeMovieStats && (
                  <span className={`text-xs font-mono font-medium ${
                    theme === "dark" ? "text-neutral-400" : "text-neutral-600"
                  }`}>
                    현재 {activeMovieStats.rank}위 상영작
                  </span>
                )}
              </div>

              {selectedMovieCd && (
                <button
                  onClick={() => {
                    setSelectedMovieCd(null);
                    setSelectedMovieDetail(null);
                  }}
                  className={`p-1.5 rounded-md hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    theme === "dark" 
                      ? "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200" 
                      : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 shadow-sm"
                  }`}
                  title="선택 닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* If no movie is selected */}
            {!selectedMovieCd ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-12">
                <Film className={`w-12 h-12 mb-4 animate-pulse ${
                  theme === "dark" ? "text-neutral-700" : "text-neutral-400"
                }`} />
                <h3 className="text-base font-bold">선택된 영화가 없습니다</h3>
                <p className={`text-xs max-w-xs mt-1.5 leading-relaxed ${
                  theme === "dark" ? "text-neutral-400" : "text-neutral-500"
                }`}>
                  우측의 고밀도 박스오피스 카드 목록에서 영화를 선택하면 상세 감독, 장르, 배역 정보가 실시간 반영됩니다.
                </p>
              </div>
            ) : isDetailLoading ? (
              <div className="flex-1 flex flex-col justify-end space-y-4 py-8 animate-pulse">
                <div className="h-4 bg-neutral-800 rounded w-1/4" />
                <div className="h-10 bg-neutral-800 rounded w-5/6" />
                <div className="h-4 bg-neutral-800 rounded w-2/3" />
                <div className="border-t border-neutral-800/80 pt-4 grid grid-cols-2 gap-4">
                  <div className="h-6 bg-neutral-800 rounded" />
                  <div className="h-6 bg-neutral-800 rounded" />
                </div>
              </div>
            ) : detailError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                <h4 className="font-bold">데이터를 로드하지 못했습니다</h4>
                <p className="text-xs text-neutral-400 mt-1">{detailError}</p>
                <button
                  onClick={() => fetchMovieDetail(selectedMovieCd)}
                  className="mt-4 px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-500 cursor-pointer"
                >
                  다시 시도
                </button>
              </div>
            ) : selectedMovieDetail ? (
              <div className="flex-grow flex flex-col justify-end">
                {/* Movie Titles */}
                <h2 className="text-3xl sm:text-4xl font-black leading-none mb-1 tracking-tight">
                  {selectedMovieDetail.movieNm}
                </h2>
                {selectedMovieDetail.movieNmEn && (
                  <p className="text-xs font-mono text-neutral-400 tracking-tight mb-4">
                    {selectedMovieDetail.movieNmEn} {selectedMovieDetail.prdtYear && `(${selectedMovieDetail.prdtYear})`}
                  </p>
                )}

                {/* Simulated/Synthesized High Density Context Summary */}
                <p className={`text-xs leading-relaxed mb-6 line-clamp-4 ${
                  theme === "dark" ? "text-neutral-300" : "text-neutral-700"
                }`}>
                  &quot;{selectedMovieDetail.movieNmEn || selectedMovieDetail.movieNm}&quot;은(는) {selectedMovieDetail.genres.length > 0 ? selectedMovieDetail.genres.map(g => g.genreNm).join(", ") : "다양한"} 장르의 {selectedMovieDetail.nations.length > 0 ? selectedMovieDetail.nations[0].nationNm : "한국"} 상영작으로, {selectedMovieDetail.directors.length > 0 ? selectedMovieDetail.directors.map(d => d.peopleNm).join(", ") : "신인"} 감독이 연출을 지휘하였습니다. 국내에서 {selectedMovieDetail.openDt ? `${selectedMovieDetail.openDt}일에 대개봉` : "개봉 완료된"} 영화입니다.
                </p>

                {/* High Density Details Grid */}
                <div className={`grid grid-cols-2 gap-x-4 gap-y-3.5 pt-4.5 border-t ${
                  theme === "dark" ? "border-neutral-800/80" : "border-neutral-200"
                }`}>
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                      Director
                    </span>
                    <span className="text-sm font-bold">
                      {selectedMovieDetail.directors.map(d => d.peopleNm).join(", ") || "정보 준비중"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                      Release Date
                    </span>
                    <span className="text-sm font-mono font-bold">
                      {selectedMovieDetail.openDt ? selectedMovieDetail.openDt.replace(/-/g, ".") : "정보 없음"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                      Daily Audience
                    </span>
                    <span className="text-sm text-amber-500 font-mono font-black">
                      {activeMovieStats ? `${formatNumber(activeMovieStats.audiCnt)}명` : "정보 없음"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                      Total Audience
                    </span>
                    <span className="text-sm font-mono font-bold">
                      {activeMovieStats ? `${formatNumber(activeMovieStats.audiAcc)}명` : "정보 없음"}
                    </span>
                  </div>

                  {/* Supplemental micro stats */}
                  <div className="col-span-2 grid grid-cols-3 gap-2.5 pt-2 mt-1.5 border-t border-dashed border-neutral-800/50">
                    <div>
                      <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider">상영시간</span>
                      <span className="text-xs font-semibold">{selectedMovieDetail.showTm ? `${selectedMovieDetail.showTm}분` : "-"}</span>
                    </div>
                    <div>
                      <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider">매출 점유율</span>
                      <span className="text-xs font-mono font-bold text-amber-500">{activeMovieStats ? `${activeMovieStats.salesShare}%` : "-"}</span>
                    </div>
                    <div>
                      <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider">심의등급</span>
                      <span className="text-xs font-semibold truncate block" title={selectedMovieDetail.audits[0]?.watchGradeNm}>
                        {selectedMovieDetail.audits[0]?.watchGradeNm || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actor badged section */}
                {selectedMovieDetail.actors.length > 0 && (
                  <div className="mt-5.5 pt-4 border-t border-neutral-800/40">
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-2">
                      주연 및 출연진
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 customize-scrollbar">
                      {selectedMovieDetail.actors.slice(0, 12).map((actor, idx) => (
                        <span 
                          key={idx} 
                          className={`text-[11px] font-medium px-2 py-0.5 border rounded-md ${
                            theme === "dark"
                              ? "bg-neutral-900/60 border-neutral-800 text-neutral-300"
                              : "bg-neutral-100 border-neutral-200 text-neutral-700"
                          }`}
                        >
                          {actor.peopleNm} {actor.cast && <span className="text-[9.5px] text-neutral-500 font-normal">({actor.cast})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Review Builder section */}
                <div className={`mt-6 pt-5 border-t ${
                  theme === "dark" ? "border-neutral-800/60" : "border-neutral-200"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="block text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      AI 감상평 메이커
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      직접 입력하거나 하단 코인 클릭!
                    </span>
                  </div>

                  {/* 3 Keyword Inputs */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="relative">
                        <input
                          type="text"
                          value={keywords[idx]}
                          placeholder={`키워드 ${idx + 1}`}
                          maxLength={12}
                          onChange={(e) => {
                            const newK = [...keywords];
                            newK[idx] = e.target.value;
                            setKeywords(newK);
                          }}
                          className={`w-full text-xs font-semibold px-2.5 py-1.5 focus:outline-none border rounded-lg transition-all ${
                            theme === "dark"
                              ? "bg-neutral-900 border-neutral-800 text-neutral-200 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/20"
                              : "bg-white border-neutral-200 text-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 shadow-sm"
                          }`}
                        />
                        {keywords[idx] && (
                          <button
                            onClick={() => {
                              const newK = [...keywords];
                              newK[idx] = "";
                              setKeywords(newK);
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-neutral-250 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recommended Quick Action keywords */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {[
                      "🍿 긴장감최고", "😢 폭풍감동", "🤯 충격반전", 
                      "🎬 다시보고파", "🍯 빅꿀잼", "🔥 전율대박", 
                      "🌌 몰입감지림", "👍 갓벽명작", "👨‍👩‍👧 가족과함께"
                    ].map((kw) => (
                      <button
                        key={kw}
                        onClick={() => {
                          const cleanKw = kw.split(" ")[1]; // Get word part
                          const emptyIdx = keywords.findIndex(k => !k);
                          if (emptyIdx !== -1) {
                            const newK = [...keywords];
                            newK[emptyIdx] = cleanKw;
                            setKeywords(newK);
                          } else {
                            // If all full, overwrite the last one
                            const newK = [...keywords];
                            newK[2] = cleanKw;
                            setKeywords(newK);
                          }
                        }}
                        className={`text-[10.5px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-all active:scale-95 ${
                          theme === "dark"
                            ? "bg-neutral-900 border border-neutral-800/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 hover:border-neutral-700"
                            : "bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm"
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>

                  {/* Action generate button / 감상하기 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={generateAiReview}
                      disabled={isAiLoading || keywords.every(k => !k)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-bold text-xs select-none transition-all active:scale-98 ${
                        keywords.every(k => !k)
                          ? "bg-neutral-800/40 text-neutral-500 cursor-not-allowed border border-transparent"
                          : "bg-amber-500 text-neutral-950 hover:bg-amber-400 font-bold active:scale-95 cursor-pointer shadow-md shadow-amber-500/10"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>{isAiLoading ? "AI가 감상평 집필 중..." : "AI 감상평 작성하기"}</span>
                    </button>

                    {(aiReview || keywords.some(k => k)) && (
                      <button
                        onClick={() => {
                          setKeywords(["", "", ""]);
                          setAiReview(null);
                          setAiError(null);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          theme === "dark"
                            ? "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80"
                            : "bg-white border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 shadow-sm"
                        }`}
                        title="초기화"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Error display */}
                  {aiError && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>{aiError}</p>
                    </div>
                  )}

                  {/* Generated Review Display card */}
                  <AnimatePresence mode="wait">
                    {isAiLoading ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mt-4 p-4.5 rounded-xl border animate-pulse flex flex-col space-y-3.5 ${
                          theme === "dark" ? "bg-neutral-800/40 border-neutral-800" : "bg-neutral-100/60 border-neutral-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full bg-amber-500/40 animate-ping" />
                          <div className="h-3 bg-neutral-700 rounded w-1/3" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-neutral-700 rounded w-full" />
                          <div className="h-3 bg-neutral-700 rounded w-5/6" />
                          <div className="h-3 bg-neutral-700 rounded w-4/5" />
                        </div>
                      </motion.div>
                    ) : aiReview ? (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className={`mt-4 p-4.5 rounded-xl border relative overflow-hidden group/card ${
                          theme === "dark"
                            ? "bg-neutral-900/70 border-amber-500/20 shadow-lg shadow-black/40"
                            : "bg-amber-500/[0.03] border-amber-500/30 shadow-md shadow-amber-500/[0.02]"
                        }`}
                      >
                        {/* Elegant background highlight for the review */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none rounded-bl-full filter blur-md" />

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Critic Review
                          </span>
                          
                          <button
                            onClick={handleCopyReview}
                            className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all shadow-sm cursor-pointer ${
                              copied
                                ? "bg-emerald-500 text-white"
                                : theme === "dark"
                                  ? "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-800"
                                  : "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200"
                            }`}
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>복사 완료!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>텍스트 복사</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Formatting generated text with simple paragraph chunks */}
                        <div className="space-y-2.5 text-xs leading-relaxed max-h-52 overflow-y-auto pr-1 customize-scrollbar font-normal">
                          {aiReview.split("\n\n").map((para, pIdx) => (
                            <p key={pIdx} className={theme === "dark" ? "text-neutral-300" : "text-neutral-800"}>
                              {/* Simple renderer for bold texts **key** */}
                              {para.split("**").map((chunk, cIdx) => (
                                cIdx % 2 === 1 ? (
                                  <strong key={cIdx} className="text-amber-500 font-bold bg-amber-500/8 dark:bg-amber-500/15 px-1.5 py-0.5 rounded italic">
                                    {chunk}
                                  </strong>
                                ) : (
                                  chunk
                                )
                              ))}
                            </p>
                          ))}
                        </div>

                        {/* Signature/Stamp element */}
                        <div className="mt-3.5 flex justify-end items-center text-[8.5px] font-mono tracking-tight uppercase text-neutral-500">
                          <span>Verified by Gemini 3.5 Flash</span>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}

          </div>
        </section>

        {/* RIGHT COLUMN (lg:col-span-7): High Density Cards List Panel */}
        <section className={`lg:col-span-7 p-6 flex flex-col justify-between lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto customize-scrollbar ${
          theme === "dark" ? "bg-neutral-900/45" : "bg-neutral-50"
        }`}>
          <div>
            {/* Context Sub-header */}
            <div className="flex items-center justify-between mb-5.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  {selectedDate ? `${getKoreanDateLabel(selectedDate)} 관람 기준` : "상영작 리스트"}
                </h3>
                <p className="text-lg font-black tracking-tight mt-0.5">
                  박스오피스 <span className="text-amber-500">TOP 10</span> 순위
                </p>
              </div>
              <span className={`text-[10px] font-mono px-3 py-1 rounded-full border ${
                theme === "dark" 
                  ? "bg-neutral-800 border-neutral-700 text-neutral-400" 
                  : "bg-white border-neutral-200 text-neutral-600 shadow-sm"
              }`}>
                KOBIS Live Stream
              </span>
            </div>

            {/* List Loading */}
            {isListLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-[92px] rounded-xl border animate-pulse flex items-center p-4 space-x-3.5 ${
                      theme === "dark" ? "bg-neutral-800/40 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-neutral-800 rounded w-4/5" />
                      <div className="h-2.5 bg-neutral-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listError ? (
              <div className={`p-8 rounded-xl text-center border capitalize flex flex-col items-center justify-center ${
                theme === "dark" ? "bg-neutral-900 border-neutral-800 text-rose-400" : "bg-white border-neutral-200 text-rose-700 shadow-md"
              }`}>
                <AlertCircle className="w-9 h-9 mb-2" />
                <h4 className="font-bold">목록을 불러오지 못했습니다</h4>
                <p className="text-xs mt-1.5 max-w-sm">{listError}</p>
                <button
                  onClick={() => fetchBoxOffice(selectedDate)}
                  className="mt-4 px-3.5 py-1.5 text-xs font-bold bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 text-white rounded hover:bg-neutral-700 transition"
                >
                  새로고침
                </button>
              </div>
            ) : boxOfficeList.length === 0 ? (
              <div className={`p-16 rounded-xl text-center border ${
                theme === "dark" ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-white border-neutral-200 text-neutral-500 shadow-sm"
              }`}>
                <Film className="w-10 h-10 mx-auto mb-3 text-neutral-500 stroke-1" />
                <p className="font-bold text-sm">해당 일자의 박스오피스 정보가 존재하지 않습니다.</p>
                <p className="text-xs mt-1">이전 다른 평일/주말 일자를 선택하여 검색하세요.</p>
              </div>
            ) : (
              /* THE DENSE CARD GRID (matching High Density design layout) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3.5">
                {boxOfficeList.slice(0, 10).map((movie) => {
                  const isSelected = selectedMovieCd === movie.movieCd;
                  const rankNum = movie.rank.padStart(2, "0");
                  const isTopRank = rankNum === "01" || rankNum === "02" || rankNum === "03";

                  return (
                    <div
                      key={movie.movieCd}
                      onClick={() => handleMovieSelect(movie.movieCd)}
                      className={`rounded-xl p-4 flex items-center space-x-4 border transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                        isSelected
                          ? theme === "dark"
                            ? "bg-neutral-800/80 border-amber-500/80 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20"
                            : "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                          : theme === "dark"
                            ? "bg-neutral-800/30 border-neutral-800 hover:bg-neutral-800/55 hover:border-neutral-700"
                            : "bg-white border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow"
                      }`}
                    >
                      {/* Left Rank Indicator (Mockup style text-3xl font-black italic with Highlight) */}
                      <div className={`text-3xl font-black w-8 italic shrink-0 tracking-tight transition-colors ${
                        isSelected || isTopRank
                          ? "text-amber-500"
                          : theme === "dark" 
                            ? "text-neutral-700" 
                            : "text-neutral-400"
                      }`}>
                        {rankNum}
                      </div>

                      {/* Movie brief info block */}
                      <div className="flex-1 min-w-0">
                        {/* Trend Status Block */}
                        <div className="mb-0.5">
                          {renderRankChangeText(movie.rankInten, movie.rankOldAndNew)}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold truncate leading-snug tracking-tight">
                          {movie.movieNm}
                        </h4>

                        {/* Dynamic concise audience info */}
                        <div className="flex items-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mt-1 space-x-2.5">
                          <span>일일 관객수 <strong className="text-amber-500 font-mono font-bold">{formatAudienceShort(movie.audiCnt)}</strong></span>
                          <span className="opacity-40">|</span>
                          <span>누적 <strong className="font-mono">{formatAudienceShort(movie.audiAcc)}</strong></span>
                        </div>
                      </div>

                      {/* Small arrow marker indicator */}
                      <div className={`shrink-0 transition-transform duration-200 ${
                        isSelected ? "translate-x-1 text-amber-500" : "text-neutral-500 hover:text-neutral-300"
                      }`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Helper Guideline inline */}
          <div className={`mt-8 p-3.5 rounded-xl border flex items-center space-x-3 text-xs ${
            theme === "dark" 
              ? "bg-neutral-900/60 border-neutral-800/70 text-neutral-400" 
              : "bg-neutral-100 border-neutral-200 text-neutral-700"
          }`}>
            <Info className="w-4.5 h-4.5 shrink-0 text-amber-500" />
            <p className="leading-relaxed">
              <strong>영화 순위:</strong> 전일 집계 마감된 전국 영화관 통합전산망 공식 발명 순위입니다. 카드 선택 시 상세 출연 배역, 상영 시간, 심의 등급 정보를 실시간 제공합니다.
            </p>
          </div>
        </section>

      </main>

      {/* Footer matching High Density mockup exactly */}
      <footer className={`h-12 border-t px-6 flex items-center justify-between text-[10px] uppercase tracking-widest transition-colors duration-200 ${
        theme === "dark"
          ? "border-neutral-800 bg-neutral-950 text-neutral-500"
          : "border-neutral-200 bg-neutral-100 text-neutral-600 shadow-inner"
      }`}>
        <div className="flex space-x-4 md:space-x-6">
          <span>Data Source: Kobis Open API</span>
          <span className="hidden sm:inline">API Key: 3ae394be...4ed1570</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Live Data Stream Connected</span>
        </div>
      </footer>
    </div>
  );
}
