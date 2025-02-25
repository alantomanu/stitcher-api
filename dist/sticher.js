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
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPdfToSingleImage = convertPdfToSingleImage;
const sharp = require('sharp');
const pdf = require('pdf-poppler');
const fs = require('fs').promises;
const path = require('path');
function convertPdfToSingleImage(pdfPath_1, outputPath_1) {
    return __awaiter(this, arguments, void 0, function* (pdfPath, outputPath, options = {
        format: "png",
        outDir: "temp",
        density: 300,
        quality: 100,
    }) {
        try {
            // Create temp directory
            yield fs.mkdir(options.outDir, { recursive: true });
            // Convert PDF to images
            yield pdf.convert(pdfPath, {
                format: options.format,
                out_dir: options.outDir,
                out_prefix: "page",
                density: options.density,
            });
            // Read generated images
            const files = yield fs.readdir(options.outDir);
            const imageFiles = files
                .filter((file) => file.startsWith("page"))
                .sort((a, b) => { var _a, _b; return parseInt(((_a = a.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || "0") - parseInt(((_b = b.match(/\d+/)) === null || _b === void 0 ? void 0 : _b[0]) || "0"); })
                .map((file) => path.join(options.outDir, file));
            // Get dimensions
            const dimensions = yield Promise.all(imageFiles.map((file) => sharp(file).metadata()));
            const maxWidth = Math.max(...dimensions.map((d) => d.width || 0));
            const totalHeight = dimensions.reduce((sum, dim) => sum + (dim.height || 0), 0);
            // Resize images
            const resizedImages = yield Promise.all(imageFiles.map((file, index) => __awaiter(this, void 0, void 0, function* () {
                return ({
                    buffer: yield sharp(file).resize({ width: maxWidth }).toBuffer(),
                    height: dimensions[index].height || 0,
                });
            })));
            // Create final stitched image
            let currentY = 0;
            const composite = sharp({
                create: {
                    width: maxWidth,
                    height: totalHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 },
                },
            });
            yield composite
                .composite(resizedImages.map(({ buffer, height }) => ({ input: buffer, top: (currentY += height) - height, left: 0 })))
                .toFile(outputPath);
            console.log("Successfully stitched:", outputPath);
            // Cleanup
            yield Promise.all(imageFiles.map((file) => fs.unlink(file)));
            yield fs.rmdir(options.outDir);
        }
        catch (error) {
            console.error("Error:", error);
            throw error;
        }
    });
}
