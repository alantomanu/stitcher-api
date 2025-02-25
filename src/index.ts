import express, { Request, Response } from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { convertPdfToSingleImage } from "./sticher";  // Import the function
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Enable file upload
app.use(fileUpload());
app.use(express.json());

// Ensure upload directories exist
const uploadDir = path.join(__dirname, "../uploads");
const outputDir = path.join(__dirname, "../output");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.send("Stitcher API is running!");
});

// Endpoint to process PDF and return stitched image
app.post("/stitch", async (req: Request, res: Response) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const pdfFile = req.files.pdf as fileUpload.UploadedFile;
  const pdfPath = path.join(uploadDir, pdfFile.name);
  const outputPath = path.join(outputDir, "output.png");

  try {
    // Save uploaded file
    await pdfFile.mv(pdfPath);

    // Convert to stitched image
    await convertPdfToSingleImage(pdfPath, outputPath);

    res.json({ message: "PDF converted successfully!", image: "/output/output.png" });
  } catch (error) {
    res.status(500).json({ error: "Conversion failed", details: error });
  }
});

// Serve the output images
app.use("/output", express.static(outputDir));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
