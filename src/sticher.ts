const sharp = require('sharp');
const pdf = require('pdf-poppler');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

    // Convert PDF to images using pdf-poppler
    const opts = {
      format: 'png',
      out_dir: options.outDir,
      out_prefix: 'page',
      page: null,
      density: options.density
    };

    try {
      await pdf.convert(pdfPath, opts);
    } catch (pdfError) {
      console.error('PDF conversion error, trying fallback method:', pdfError);
      // Fallback to pdftoppm if pdf-poppler fails
      const tempOutputPrefix = path.join(options.outDir, 'page');
      await execPromise(`pdftoppm -png -r ${options.density} "${pdfPath}" "${tempOutputPrefix}"`);
    }

    // Read generated images
    const files = await fs.readdir(options.outDir);
    const imageFiles = files
      .filter((file: string) => file.startsWith("page"))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      })
      .map((file: string) => path.join(options.outDir, file));

    if (imageFiles.length === 0) {
      throw new Error('No images were generated from PDF');
    }

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
      .composite(resizedImages.map(({ buffer, height }) => ({
        input: buffer,
        top: (currentY += height) - height,
        left: 0
      })))
      .toFile(outputPath);

    // Cleanup
    await Promise.all(imageFiles.map((file: string) => fs.unlink(file)));
    await fs.rmdir(options.outDir);

    console.log("Successfully stitched:", outputPath);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

