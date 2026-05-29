import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// KOBIS API Key config with a fallback from user prompt
const getApiKey = () => {
  return process.env.KOBIS_API_KEY || "3ae394be6b9af2ed1570bda0ed7cb4e0";
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing
  app.use(express.json());

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
