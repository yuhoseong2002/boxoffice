import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

// KOBIS API Key config with a fallback from user prompt
const getApiKey = () => {
  return process.env.KOBIS_API_KEY || "3ae394be6b9af2ed1570bda0ed7cb4e0";
};

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it via the Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing
  app.use(express.json());

  // API Route: Write AI Movie Review
  app.post("/api/review/write", async (req, res) => {
    try {
      const { movieNm, genres, keywords } = req.body;
      
      if (!movieNm) {
        return res.status(400).json({ error: "movieNm is required" });
      }
      if (!Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: "keywords array is required" });
      }

      console.log(`Generating AI Review for ${movieNm}`);
      const geminiClient = getGemini();

      const genresStr = Array.isArray(genres) ? genres.join(", ") : (genres || "영화");
      const keywordsStr = keywords.filter(Boolean).slice(0, 3).join(", ");

      const prompt = `영화 제목: "${movieNm}"
장르: ${genresStr}
입력된 감상 키워드: ${keywordsStr}

위 기본 조건과 키워드들을 완벽히 활용하여 작성된 매력적인 영화 감상평(리뷰)을 재미있고 자연스럽고 성의있는 톤으로 2~3문단 분량으로 한글로 작성해 주세요.
작성 시 영화 평론가 혹은 몰입도 높은 파워블로거의 친근하면서도 깊은 식견을 보여주는 문체로 써주세요.
감상 키워드를 리뷰 내용 중간중간에 굵은 글씨(**키워드**) 형태로 자연스럽게 삽입해서 강조해 주세요.`;

      const response = await geminiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "당신은 대한민국 최고의 영화 미디어 평론가이자 감성적인 영화 파워블로거입니다. 주어진 영화 제목과 사용자의 핵심 키워드를 완벽하게 이해하여 가치 있고 설득력 높은 고품격의 감상평을 작성해줍니다.",
        }
      });

      const reviewText = response.text || "감상평 생성에 실패했습니다. 키워드를 확인 후 다시 시도해 주세요.";
      res.json({ review: reviewText });
    } catch (error: any) {
      console.error("AI Review Generation Error:", error);
      res.status(500).json({ 
        error: "Failed to generate AI Movie Review",
        message: error.message 
      });
    }
  });

  // API Route: Get Daily Box Office list
  app.get("/api/boxoffice", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date || typeof date !== "string" || !/^\d{8}$/.test(date)) {
        return res.status(400).json({ 
          error: "Invalid date format. Expected YYYYMMDD." 
        });
      }

      const apiKey = getApiKey();
      const apiUrl = `http://kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${date}`;
      
      console.log(`Fetching Daily Box Office for date: ${date}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`KOBIS API responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      // If KOBIS returns an error inside JSON structure
      if (data.faultInfo) {
        return res.status(500).json({
          error: "KOBIS API Error",
          message: data.faultInfo.message
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Box Office Fetch Error:", error);
      res.status(500).json({ 
        error: "Failed to fetch Daily Box Office data",
        message: error.message 
      });
    }
  });

  // API Route: Get Movie Details
  app.get("/api/movie", async (req, res) => {
    try {
      const { movieCd } = req.query;

      if (!movieCd || typeof movieCd !== "string") {
        return res.status(400).json({ 
          error: "Missing or invalid movieCd query parameter." 
        });
      }

      const apiKey = getApiKey();
      const apiUrl = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${apiKey}&movieCd=${movieCd}`;

      console.log(`Fetching Movie Info for movieCd: ${movieCd}`);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`KOBIS API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.faultInfo) {
        return res.status(500).json({
          error: "KOBIS API Error",
          message: data.faultInfo.message
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Movie Info Fetch Error:", error);
      res.status(500).json({ 
        error: "Failed to fetch movie info data",
        message: error.message 
      });
    }
  });

  // Serve static UI assets or delegate to Vite Dev Server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
    console.log(`Vite setup running in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
