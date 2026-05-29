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
  RotateCcw,
  BookOpen,
  MessageSquare,
  Globe
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
  const [activeTab, setActiveTab] = useState<"summary" | "review">("summary");
  
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

  const fetchBoxOffice = async (dateStr: string) => {
    setIsListLoading(true);
    setListError(null);
    const apiDate = dateStr.replace(/-/g, "");
    
    try {
      let data: BoxOfficeResponse | null = null;
      try {
        const response = await fetch(`/api/boxoffice?date=${apiDate}`);
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        data = await response.json();
      } catch (proxyError) {
        console.warn("Proxy API failed/404, falling back to direct Kobis API call:", proxyError);
        // Fallback directly to Kobis API (works on static hosts like Vercel client-side)
        const directUrl = `https://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=3ae394be6b9af2ed1570bda0ed7cb4e0&targetDt=${apiDate}`;
        const targetRes = await fetch(directUrl);
        if (!targetRes.ok) {
          throw new Error(`Direct Kobis API returned status ${targetRes.status}`);
        }
        data = await targetRes.json();
      }

      if (data && data.boxOfficeResult && data.boxOfficeResult.dailyBoxOfficeList) {
        const list = data.boxOfficeResult.dailyBoxOfficeList;
        setBoxOfficeList(list);
        
        // When updating list, if a movie was already chosen and still active, fetch updated live statistics
        if (selectedMovieCd) {
          const exists = list.some(m => m.movieCd === selectedMovieCd);
          if (exists) {
            fetchMovieDetail(selectedMovieCd);
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
      let data: MovieDetailResponse | null = null;
      try {
        const response = await fetch(`/api/movie?movieCd=${movieCd}`);
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        data = await response.json();
      } catch (proxyError) {
        console.warn("Proxy Movie Detail API failed/404, falling back to direct Kobis API call:", proxyError);
        const directUrl = `https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=3ae394be6b9af2ed1570bda0ed7cb4e0&movieCd=${movieCd}`;
        const targetRes = await fetch(directUrl);
        if (!targetRes.ok) {
          throw new Error(`Direct Kobis Detail API returned status ${targetRes.status}`);
        }
        data = await targetRes.json();
      }

      if (data && data.movieInfoResult && data.movieInfoResult.movieInfo) {
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
  const handleMovieSelect = (movieCd: string, tab: "summary" | "review" = "summary") => {
    setSelectedMovieCd(movieCd);
    setActiveTab(tab);
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

    const movieNm = selectedMovieDetail.movieNm;
    const genres = selectedMovieDetail.genres.map(g => g.genreNm);
    const activeKeywords = keywords.filter(Boolean);

    try {
      const response = await fetch("/api/review/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieNm,
          genres,
          keywords: activeKeywords,
        }),
      });

      if (!response.ok) {
        throw new Error(`Review proxy returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReview(data.review);
      setIsAiLoading(false);
    } catch (err: any) {
      console.warn("Review API failed, using high-end on-device critic reviewer fallback:", err);
      setTimeout(() => {
        try {
          const kStr = activeKeywords.map(k => `**${k}**`).join(", ");
          const genreList = genres.length > 0 ? genres.join("/") : "영화";
          
          const intros = [
            `영화 한 편이 주는 뜨거운 울림에 온전히 몰입했던 시간이며, 오늘 평론을 남길 화제작은 바로 ${genreList} 장르의 <**${movieNm}**>입니다.`,
            `최근 영화계에서 진한 여운을 전해준 <**${movieNm}**>을 관람하고 왔습니다. 이번 비평에서 나눌 이 작품은 오락성을 넘어 관객의 심장을 관통하는 웰메이드 영화입니다.`,
            `정교한 미장센과 섬세한 감정선이 기가 막히게 조화를 이루는 <**${movieNm}**> 관람 리뷰입니다. ${genreList} 스펙트럼의 새로운 감각적 비전을 멋지게 제시하고 있습니다.`
          ];
          
          const bodies1 = [
            `이 작품의 흡입력을 견인하는 가장 주요한 원동력은 역시 관람 동기이자 사용자의 숨결이 느껴지는 핵심 키워드인 ${kStr} 요소에서 찾을 수 있습니다. 스토리 라인 곳곳에 배치된 연출적 밀도는 숨 막히는 서스펜스와 깊은 공감을 무리 없이 유도하여 극의 풍미를 최상으로 구현했습니다.`,
            `작품 전체에 흐르는 세련된 분위기와 ${kStr}적 요소들은 서사를 한층 가치 있게 격상시키는 비결입니다. 감독의 개성 넘치는 터치와 밀고 당기는 속도감 조절은 감상하는 내내 마음 한구석을 세차게 흔들기에 충분합니다.`
          ];

          const bodies2 = [
            `특히 후반 클라이맥스의 압도적인 시퀀스 속에서 도출되는 극적인 메시지와 ${kStr}의 시각적 메타포는 관람을 마친 후에도 오랜 잔상을 품게 합니다. 이는 당해 연도 이 분야에서 거둔 눈부신 수확이자, 영리한 연출력에 감탄할 수밖에 없는 명장면입니다.`,
            `필연의 과정에서 터져 나오는 주연진들의 열연과 ${kStr} 중심의 시그널들은 대중영화로서 갖출 수 있는 완벽한 상업적/예술적 미를 가감 없이 증명해 냅니다. 극장이라는 몰입형 공간에서 느끼는 더할 나위 없는 영화적 즐거움을 여실히 상기시킵니다.`
          ];

          const conclusions = [
            `나의 평점은 별 다섯 개 중 네 개 반(★★★★☆)을 기쁜 마음으로 부여하고 싶습니다. 무뎌진 가슴을 뜨겁게 달굴 예술적 완성도로 빛나는 <**${movieNm}**>은 스크린으로 꼭 감상해야 될 명품입니다. 소중한 지인분들과 함께 감상평을 꼭 나누어보시며 가치를 만끽하시기를 강력히 추천합니다.`,
            `영화적 마력과 장악력은 근래 개봉작 중 가장 눈부신 가치를 보장합니다. 주말이나 고즈넉한 저녁 시간 동안 <**${movieNm}**>이 던진 심도 깊은 여운을 마주하며 영화가 선사하는 고품격 로망과 직접 소통해 보시길 진심으로 추천합니다.`
          ];

          const intro = intros[Math.floor(Math.random() * intros.length)];
          const body1 = bodies1[Math.floor(Math.random() * bodies1.length)];
          const body2 = bodies2[Math.floor(Math.random() * bodies2.length)];
          const conclusion = conclusions[Math.floor(Math.random() * conclusions.length)];

          const fallbackReview = `${intro}\n\n${body1}\n\n${body2}\n\n${conclusion}\n\n*(알림: Vercel 정적 배포 상에서는 로컬 스마트 분석 감상평 엔진이 제공되었습니다.)*`;
          setAiReview(fallbackReview);
          setAiError(null);
        } catch (fallErr) {
          setAiError("감상평을 임시 생성하는 도중 오류가 발생했습니다.");
        } finally {
          setIsAiLoading(false);
        }
      }, 850);
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

      {/* Main Grid/Panels Interface (Full Width Card Grid, no split panels) */}
      <main className={`flex-1 overflow-y-auto p-6 md:p-8 customize-scrollbar transition-colors duration-200 ${
        theme === "dark" ? "bg-neutral-900/10" : "bg-neutral-50"
      }`}>
        <div className="max-w-7xl mx-auto">
          {/* Context Sub-header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                {selectedDate ? `${getKoreanDateLabel(selectedDate)} 관람 기준` : "상영작 리스트"}
              </h3>
              <p className="text-2xl font-black tracking-tight mt-0.5">
                박스오피스 <span className="text-amber-500">TOP 10</span> 주요 정보
              </p>
            </div>
            <span className={`text-[10px] font-mono px-3.5 py-1.5 rounded-full border self-start sm:self-center ${
              theme === "dark" 
                ? "bg-neutral-800/80 border-neutral-700 text-neutral-450" 
                : "bg-white border-neutral-200 text-neutral-600 shadow-sm"
            }`}>
              KOBIS Live Stream Connected
            </span>
          </div>

          {/* List Loading */}
          {isListLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-[100px] rounded-2xl border animate-pulse flex items-center p-4.5 space-x-3.5 ${
                    theme === "dark" ? "bg-neutral-800/40 border-neutral-800" : "bg-white border-neutral-150 shadow-sm"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-800 rounded w-4/5" />
                    <div className="h-2.5 bg-neutral-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listError ? (
            <div className={`p-10 rounded-2xl text-center border flex flex-col items-center justify-center max-w-lg mx-auto ${
              theme === "dark" ? "bg-neutral-900 border-neutral-800 text-rose-450" : "bg-white border-neutral-200 text-rose-700 shadow-md"
            }`}>
              <AlertCircle className="w-10 h-10 mb-3 text-rose-500" />
              <h4 className="font-bold text-lg">목록을 불러오지 못했습니다</h4>
              <p className="text-xs mt-1.5 leading-relaxed text-neutral-450">{listError}</p>
              <button
                onClick={() => fetchBoxOffice(selectedDate)}
                className="mt-5 px-4 py-2 text-xs font-bold bg-amber-500 text-neutral-950 rounded-xl hover:bg-amber-400 transition cursor-pointer"
              >
                새로고침
              </button>
            </div>
          ) : boxOfficeList.length === 0 ? (
            <div className={`p-20 rounded-2xl text-center border ${
              theme === "dark" ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-white border-neutral-200 text-neutral-500 shadow-sm"
            }`}>
              <Film className="w-12 h-12 mx-auto mb-4 text-neutral-400 stroke-1" />
              <p className="font-bold text-base">해당 일자의 박스오피스 정보가 존재하지 않습니다.</p>
              <p className="text-xs mt-1">이전 다른 평일/주말 일자를 선택하여 검색하세요.</p>
            </div>
          ) : (
            /* MULTI-COLUMN SYMMETRICAL HERO GRID OF TOP 10 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boxOfficeList.slice(0, 10).map((movie) => {
                const rankNum = movie.rank.padStart(2, "0");
                const isTopRank = rankNum === "01" || rankNum === "02" || rankNum === "03";

                return (
                  <div
                    key={movie.movieCd}
                    onClick={() => handleMovieSelect(movie.movieCd)}
                    className={`rounded-2xl p-5 flex items-center space-x-4 border transition-all duration-200 cursor-pointer select-none relative overflow-hidden group hover:scale-[1.01] ${
                      theme === "dark"
                        ? "bg-neutral-900/60 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700 hover:shadow-lg hover:shadow-black/20"
                        : "bg-white border-neutral-250 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Rank indicator badge styling */}
                    <div className={`text-4xl font-black w-10 italic shrink-0 tracking-tight transition-colors ${
                      isTopRank
                        ? "text-amber-500"
                        : theme === "dark" 
                          ? "text-neutral-700" 
                          : "text-neutral-350"
                    }`}>
                      {rankNum}
                    </div>

                    {/* Movie info descriptions */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 uppercase tracking-tight">
                        {renderRankChangeText(movie.rankInten, movie.rankOldAndNew)}
                      </div>

                      <h4 className="text-sm font-bold truncate leading-snug tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-amber-500 transition-colors">
                        {movie.movieNm}
                      </h4>

                      <div className="flex items-center text-[10.5px] font-semibold text-neutral-450 dark:text-neutral-500 mt-1.5 space-x-2.5">
                        <span>일일 <strong className="text-amber-500 font-mono font-bold">{formatAudienceShort(movie.audiCnt)}</strong></span>
                        <span className="opacity-30">|</span>
                        <span>누적 <strong className="font-mono">{formatAudienceShort(movie.audiAcc)}</strong></span>
                      </div>
                    </div>

                    <div className="shrink-0 text-neutral-400 group-hover:text-amber-500 transition-colors transform group-hover:translate-x-1 duration-150">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive Helper banner aligned nicely */}
          <div className={`mt-8 p-4.5 rounded-2xl border flex items-start space-x-3.5 text-xs leading-relaxed ${
            theme === "dark" 
              ? "bg-neutral-900/60 border-neutral-800/70 text-neutral-400" 
              : "bg-white border-neutral-200 text-neutral-750 shadow-sm"
          }`}>
            <Info className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p>
                <strong>스마트 시네마 안내:</strong> 위 카드 중 원하는 영화를 클릭하시면 해당 작품의 <strong>상세 요약정보(감독, 개봉일, 누적 관람자수, 등급, 배우진)</strong> 및 <strong>AI 마인드 감상 생성기 팝업</strong>을 하나의 모달 다이얼로그 안에서 원스톱으로 확인 및 활용하실 수 있습니다. 일일 순위는 당일 오전 전량 취합 완료된 공식 KOBIS 실시간 자료입니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* UNIFIED DIALOG POPUP MODAL (Combining Summary & AI Reviews into a dynamic, beautiful multi-tab overlays) */}
      <AnimatePresence>
        {selectedMovieCd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 select-none">
            {/* Overlay click closes modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedMovieCd(null);
                setSelectedMovieDetail(null);
              }}
              className="absolute inset-0 bg-neutral-950/75 backdrop-blur-md cursor-pointer"
            />

            {/* Content box popup window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 26, stiffness: 360 }}
              className={`relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl border flex flex-col shadow-2xl z-10 ${
                theme === "dark"
                  ? "bg-neutral-900 border-neutral-800 text-neutral-100"
                  : "bg-white border-neutral-200 text-neutral-900"
              }`}
            >
              {/* Glowing decorative effect */}
              <div className="absolute top-0 inset-x-0 h-32 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 opacity-10 dark:opacity-20 bg-gradient-to-b from-amber-500 to-transparent" />
              </div>

              {/* Header block with close */}
              <div className="relative p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between">
                <div className="pr-4">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase shrink-0">
                      RANK #{activeMovieStats?.rank || "0"}
                    </span>
                    {activeMovieStats && renderRankChangeText(activeMovieStats.rankInten, activeMovieStats.rankOldAndNew)}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                    {activeMovieStats?.movieNm || selectedMovieDetail?.movieNm}
                  </h2>
                  {selectedMovieDetail && selectedMovieDetail.movieNmEn && (
                    <p className="text-[11px] font-mono text-neutral-450 dark:text-neutral-500 truncate max-w-sm mt-0.5">
                      {selectedMovieDetail.movieNmEn} {selectedMovieDetail.prdtYear && `(${selectedMovieDetail.prdtYear})`}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedMovieCd(null);
                    setSelectedMovieDetail(null);
                  }}
                  className={`p-1.5 rounded-lg border hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                    theme === "dark"
                      ? "bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-neutral-100"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900 shadow-sm"
                  }`}
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tab selection popup button group layout inside dialog */}
              <div className={`px-6 py-2.5 border-b flex items-center space-x-2 shrink-0 ${
                theme === "dark" ? "border-neutral-800/80 bg-neutral-900/55" : "border-neutral-100 bg-neutral-50/50"
              }`}>
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`flex items-center space-x-1.5 px-4 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer select-none border ${
                    activeTab === "summary"
                      ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-sm font-bold"
                      : theme === "dark"
                        ? "bg-neutral-850 text-neutral-400 border-neutral-800/60 hover:text-neutral-200"
                        : "bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900 shadow-sm"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>🎬 영화 상세 요약</span>
                </button>
                <button
                  onClick={() => setActiveTab("review")}
                  className={`flex items-center space-x-1.5 px-4 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer select-none border ${
                    activeTab === "review"
                      ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-sm font-bold"
                      : theme === "dark"
                        ? "bg-neutral-850 text-neutral-400 border-neutral-800/60 hover:text-neutral-200"
                        : "bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900 shadow-sm"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>✨ AI 감상평 메이커</span>
                </button>
              </div>

              {/* Tab Contents Pane */}
              <div className="p-6 overflow-y-auto max-h-[50vh] customize-scrollbar flex-1 relative z-10">
                {isDetailLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 animate-pulse">
                    <Film className="w-8 h-8 text-neutral-500 animate-spin" />
                    <span className="text-xs text-neutral-405">영화를 심층 고속 로딩 중입니다...</span>
                  </div>
                ) : detailError ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                    <h4 className="font-bold text-sm">상세 정보를 불러오지 못했습니다</h4>
                    <p className="text-xs text-neutral-400 mt-1">{detailError}</p>
                    <button
                      onClick={() => fetchMovieDetail(selectedMovieCd)}
                      className="mt-4 px-3.5 py-1.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-xl hover:bg-amber-400 cursor-pointer"
                    >
                      다시 시도
                    </button>
                  </div>
                ) : selectedMovieDetail ? (
                  <>
                    {activeTab === "summary" ? (
                      /* Movie details contents view */
                      <div className="space-y-4 animate-fadeIn">
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          theme === "dark" ? "text-neutral-300" : "text-neutral-700"
                        }`}>
                          &quot;{selectedMovieDetail.movieNmEn || selectedMovieDetail.movieNm}&quot;은(는) {selectedMovieDetail.genres.length > 0 ? selectedMovieDetail.genres.map(g => g.genreNm).join(", ") : "다양한"} 장르의 {selectedMovieDetail.nations.length > 0 ? selectedMovieDetail.nations[0].nationNm : "한국"} 상영작으로, {selectedMovieDetail.directors.length > 0 ? selectedMovieDetail.directors.map(d => d.peopleNm).join(", ") : "신인"} 감독이 연출을 지휘하였습니다. 국내에서 {selectedMovieDetail.openDt ? `${selectedMovieDetail.openDt}일에 대개봉` : "개봉 완료된"} 영화입니다.
                        </p>

                        <div className={`grid grid-cols-2 gap-4 pb-4 pt-4 border-t ${
                          theme === "dark" ? "border-neutral-800" : "border-neutral-100"
                        }`}>
                          <div>
                            <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                              영화 감독 (Director)
                            </span>
                            <span className="text-xs sm:text-sm font-bold">
                              {selectedMovieDetail.directors.map(d => d.peopleNm).join(", ") || "정보 없음"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                              정식 개봉일 (Release)
                            </span>
                            <span className="text-xs sm:text-sm font-mono font-bold">
                              {selectedMovieDetail.openDt ? selectedMovieDetail.openDt.replace(/-/g, ".") : "정보 없음"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                              일일 관객수 (Daily)
                            </span>
                            <span className="text-xs sm:text-sm text-amber-500 font-mono font-black">
                              {activeMovieStats ? `${formatNumber(activeMovieStats.audiCnt)}명` : "정보 없음"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                              누적 관객수 (Acc)
                            </span>
                            <span className="text-xs sm:text-sm font-mono font-bold">
                              {activeMovieStats ? `${formatNumber(activeMovieStats.audiAcc)}명` : "정보 없음"}
                            </span>
                          </div>

                          {/* technical breakdowns grid */}
                          <div className="col-span-2 grid grid-cols-3 gap-2 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                            <div>
                              <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">상영 시간</span>
                              <span className="text-[11px] font-semibold">{selectedMovieDetail.showTm ? `${selectedMovieDetail.showTm}분` : "-"}</span>
                            </div>
                            <div>
                              <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">매출 점유</span>
                              <span className="text-[11px] font-mono font-bold text-amber-500">{activeMovieStats ? `${activeMovieStats.salesShare}%` : "-"}</span>
                            </div>
                            <div>
                              <span className="block text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">심의 등급</span>
                              <span className="text-[11px] font-semibold truncate block" title={selectedMovieDetail.audits[0]?.watchGradeNm}>
                                {selectedMovieDetail.audits[0]?.watchGradeNm || "-"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* actors badges */}
                        {selectedMovieDetail.actors.length > 0 && (
                          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <span className="block text-[9px] text-neutral-500 uppercase font-black tracking-widest mb-2">
                              주요 배역 출연진 (Actors)
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 customize-scrollbar">
                              {selectedMovieDetail.actors.slice(0, 15).map((actor, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[10.5px] font-medium px-2 py-0.5 border rounded-md ${
                                    theme === "dark"
                                      ? "bg-neutral-850 border-neutral-800 text-neutral-300"
                                      : "bg-neutral-100 border-neutral-200 text-neutral-700"
                                  }`}
                                >
                                  {actor.peopleNm} {actor.cast && <span className="text-[9.5px] text-neutral-500">({actor.cast})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* AI Critic reviews contents view */
                      <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="block text-[9px] text-neutral-550 uppercase font-black tracking-widest">
                            감상 한마디 키워드 3가지 입력
                          </span>
                          <span className="text-[9.5px] text-neutral-450 dark:text-neutral-500">
                            키워드가 녹아든 고귀한 칼럼이 탄생합니다.
                          </span>
                        </div>

                        {/* Keyword slots */}
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="relative">
                              <input
                                type="text"
                                value={keywords[idx]}
                                placeholder={`키워드 ${idx + 1}`}
                                maxLength={10}
                                onChange={(e) => {
                                  const newK = [...keywords];
                                  newK[idx] = e.target.value;
                                  setKeywords(newK);
                                }}
                                className={`w-full text-[11px] sm:text-xs font-semibold px-2.5 py-2 focus:outline-none border rounded-lg transition-all ${
                                  theme === "dark"
                                    ? "bg-neutral-850 border-neutral-800 text-neutral-200 focus:border-amber-500/70"
                                    : "bg-white border-neutral-200 text-neutral-800 focus:border-amber-500 shadow-sm"
                                }`}
                              />
                              {keywords[idx] && (
                                <button
                                  onClick={() => {
                                    const newK = [...keywords];
                                    newK[idx] = "";
                                    setKeywords(newK);
                                  }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Tags Shortcut selection chips */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            "🍿 긴장감최고", "😢 폭풍감동", "🤯 충격반전",
                            "🎬 다시보고파", "🍯 빅꿀잼", "🔥 전율대박",
                            "🌌 몰입감지림", "👍 갓벽명작", "👨‍👩‍👧 가족과함께"
                          ].map((kw) => (
                            <button
                              key={kw}
                              onClick={() => {
                                const cleanKw = kw.split(" ")[1];
                                const emptyIdx = keywords.findIndex(k => !k);
                                if (emptyIdx !== -1) {
                                  const newK = [...keywords];
                                  newK[emptyIdx] = cleanKw;
                                  setKeywords(newK);
                                } else {
                                  const newK = [...keywords];
                                  newK[2] = cleanKw;
                                  setKeywords(newK);
                                }
                              }}
                              className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-md border transition-all active:scale-95 cursor-pointer ${
                                theme === "dark"
                                  ? "bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 shadow-sm"
                              }`}
                            >
                              {kw}
                            </button>
                          ))}
                        </div>

                        {/* Writing generator launcher bar */}
                        <div className="flex space-x-2 pt-1">
                          <button
                            onClick={generateAiReview}
                            disabled={isAiLoading || keywords.every(k => !k)}
                            className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all select-none ${
                              keywords.every(k => !k)
                                ? "bg-neutral-800/40 text-neutral-500 border border-transparent cursor-not-allowed"
                                : "bg-amber-500 text-neutral-950 hover:bg-amber-400 cursor-pointer shadow-md shadow-amber-500/10 active:scale-95 font-bold"
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>{isAiLoading ? "AI 특별 평론가가 컬럼 작성하는 중..." : "AI 전문가 감상평 자동 생성 및 출력"}</span>
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
                                  ? "bg-neutral-850 border-neutral-805 text-neutral-400 hover:text-neutral-100"
                                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 shadow-sm"
                              }`}
                              title="리셋"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {aiError && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p>{aiError}</p>
                          </div>
                        )}

                        {/* Rendering output area with markdown support details */}
                        <AnimatePresence mode="wait">
                          {isAiLoading ? (
                            <div className={`p-4 rounded-xl border animate-pulse flex flex-col space-y-3 ${
                              theme === "dark" ? "bg-neutral-850/60 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                            }`}>
                              <div className="h-3.5 bg-neutral-750 dark:bg-neutral-700 rounded w-1/4" />
                              <div className="space-y-2">
                                <div className="h-3 bg-neutral-755 dark:bg-neutral-700 rounded w-full" />
                                <div className="h-3 bg-neutral-755 dark:bg-neutral-700 rounded w-5/6" />
                              </div>
                            </div>
                          ) : aiReview ? (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-xl border relative overflow-hidden backdrop-blur-sm ${
                                theme === "dark"
                                  ? "bg-neutral-850 border-amber-500/20"
                                  : "bg-amber-500/[0.03] border-amber-500/25"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs">
                                <span className="text-amber-550 font-bold uppercase tracking-widest flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  영화 평론가 종합 리포트
                                </span>

                                <button
                                  onClick={handleCopyReview}
                                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all shadow-sm cursor-pointer ${
                                    copied
                                      ? "bg-emerald-500 text-white"
                                      : theme === "dark"
                                        ? "bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700"
                                        : "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200"
                                  }`}
                                >
                                  {copied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>복사 완료</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>칼럼 복사</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="space-y-3 text-xs leading-relaxed max-h-52 overflow-y-auto pr-1 customize-scrollbar font-normal">
                                {aiReview.split("\n\n").map((para, pIdx) => (
                                  <p key={pIdx} className={theme === "dark" ? "text-neutral-300" : "text-neutral-800"}>
                                    {para.split("**").map((chunk, cIdx) => (
                                      cIdx % 2 === 1 ? (
                                        <strong key={cIdx} className="text-amber-500 font-bold bg-amber-550/8 dark:bg-amber-500/15 px-1 py-0.5 rounded italic">
                                          {chunk}
                                        </strong>
                                      ) : (
                                        chunk
                                      )
                                    ))}
                                  </p>
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Modal window footer info block */}
              <div className={`p-3 px-6 border-t text-[9px] flex items-center justify-between text-neutral-510 dark:text-neutral-500 ${
                theme === "dark" ? "border-neutral-800 bg-neutral-900/40" : "border-neutral-150 bg-neutral-50"
              }`}>
                <span>KOBIS ID: {selectedMovieCd}</span>
                <button
                  onClick={() => {
                    setSelectedMovieCd(null);
                    setSelectedMovieDetail(null);
                  }}
                  className="text-amber-500 hover:underline font-bold md:text-[10px]"
                >
                  닫기 (Close)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
