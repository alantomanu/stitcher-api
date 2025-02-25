const sharp = require('sharp');
const pdf = require('pdf-poppler');
const fs = require('fs').promises;
const path = require('path');

interface PdfToImageOptions {
  format: "png" | "jpg";
  outDir: string;
  density?: number;
  quality?: number;
}

export async function convertPdfToSingleImage(
  pdfPath: string,
  outputPath: string,
  options: PdfToImageOptions = {
    format: "png",
    outDir: "temp",
    density: 300,
    quality: 100,
  }
): Promise<void> {
  try {
    // Create temp directory
    await fs.mkdir(options.outDir, { recursive: true });

    // Convert PDF to images
    await pdf.convert(pdfPath, {
      format: options.format,
      out_dir: options.outDir,
      out_prefix: "page",
      density: options.density,
    });

    // Read generated images
    const files = await fs.readdir(options.outDir);
    const imageFiles = files
      .filter((file: string) => file.startsWith("page"))
      .sort((a: string, b: string) => parseInt(a.match(/\d+/)?.[0] || "0") - parseInt(b.match(/\d+/)?.[0] || "0"))
      .map((file: string) => path.join(options.outDir, file));

    // Get dimensions
    const dimensions = await Promise.all(imageFiles.map((file: string) => sharp(file).metadata()));
    const maxWidth = Math.max(...dimensions.map((d) => d.width || 0));
    const totalHeight = dimensions.reduce((sum, dim) => sum + (dim.height || 0), 0);

    // Resize images
    const resizedImages = await Promise.all(
      imageFiles.map(async (file: string, index: number) => ({
        buffer: await sharp(file).resize({ width: maxWidth }).toBuffer(),
        height: dimensions[index].height || 0,
      }))
    );

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

    await composite
      .composite(resizedImages.map(({ buffer, height }) => ({ input: buffer, top: (currentY += height) - height, left: 0 })))
      .toFile(outputPath);

    console.log("Successfully stitched:", outputPath);

    // Cleanup
    await Promise.all(imageFiles.map((file: string) => fs.unlink(file)));
    await fs.rmdir(options.outDir);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
