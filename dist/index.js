"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sticher_1 = require("./sticher"); // Import the function
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cloudinary_1 = require("cloudinary");
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS
app.use((0, cors_1.default)());
// Enable file upload
app.use((0, express_fileupload_1.default)());
app.use(express_1.default.json());
// Ensure upload directories exist
const uploadDir = path_1.default.join(__dirname, "../uploads");
const outputDir = path_1.default.join(__dirname, "../output");
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
if (!fs_1.default.existsSync(outputDir))
    fs_1.default.mkdirSync(outputDir, { recursive: true });
// Health Check
app.get("/", (req, res) => {
    res.send("Stitcher API is running!");
});
// Endpoint to process PDF and return stitched image
app.post("/stitch", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pdfUrl, forceReprocess } = req.body;
        if (!pdfUrl) {
            return res.status(400).json({ error: "No PDF URL provided" });
        }
        // Download PDF from URL
        const response = yield (0, axios_1.default)({
            url: pdfUrl,
            responseType: 'arraybuffer'
        });
        // Save PDF temporarily
        const pdfFileName = `temp-${Date.now()}.pdf`;
        const pdfPath = path_1.default.join(uploadDir, pdfFileName);
        yield fs_1.default.promises.writeFile(pdfPath, response.data);
        // Process PDF to image
        const outputFileName = `output-${Date.now()}.png`;
        const outputPath = path_1.default.join(outputDir, outputFileName);
        yield (0, sticher_1.convertPdfToSingleImage)(pdfPath, outputPath);
        // Upload to Cloudinary
        const uploadResult = yield cloudinary_1.v2.uploader.upload(outputPath, {
            folder: 'stiched_image',
            upload_preset: 'stiched_image',
            resource_type: 'image'
        });
        // Cleanup temporary files
        yield fs_1.default.promises.unlink(pdfPath);
        yield fs_1.default.promises.unlink(outputPath);
        res.json({
            success: true,
            message: "PDF processed and uploaded successfully",
            imageUrl: uploadResult.secure_url
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: "Processing failed",
            details: error.message
        });
    }
}));
// Serve the output images
app.use("/output", express_1.default.static(outputDir));
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
