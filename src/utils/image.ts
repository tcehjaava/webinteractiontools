import sharp from 'sharp';
import { getProviderConfig } from '../config/providers.js';

export interface ImageProcessingResult {
    processedImage: Buffer;
    originalDimensions: { width?: number; height?: number };
    wasResized: boolean;
    providerConfig: ReturnType<typeof getProviderConfig>;
}

export async function processScreenshot(
    screenshot: Buffer,
    provider?: string
): Promise<ImageProcessingResult> {
    const providerConfig = getProviderConfig(provider);
    const MAX_DIMENSION = providerConfig.maxImageDimension;

    console.log(
        `Using ${providerConfig.name} provider with max dimension: ${MAX_DIMENSION}px`
    );

    const metadata = await sharp(screenshot).metadata();
    console.log(
        `Original image dimensions: ${metadata.width}x${metadata.height}`
    );

    let processedImage = screenshot;
    let wasResized = false;

    if (
        metadata.width &&
        metadata.height &&
        (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)
    ) {
        console.log(`Image exceeds ${MAX_DIMENSION}px limit, resizing...`);

        const aspectRatio = metadata.width / metadata.height;
        let newWidth = metadata.width;
        let newHeight = metadata.height;

        if (metadata.width > metadata.height) {
            newWidth = MAX_DIMENSION;
            newHeight = Math.round(MAX_DIMENSION / aspectRatio);
        } else {
            newHeight = MAX_DIMENSION;
            newWidth = Math.round(MAX_DIMENSION * aspectRatio);
        }

        console.log(`Resizing to: ${newWidth}x${newHeight}`);

        processedImage = await sharp(screenshot)
            .resize(newWidth, newHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .png()
            .toBuffer();

        const newMetadata = await sharp(processedImage).metadata();
        console.log(
            `Resized image dimensions: ${newMetadata.width}x${newMetadata.height}`
        );

        wasResized = true;
    }

    return {
        processedImage,
        originalDimensions: {
            width: metadata.width,
            height: metadata.height,
        },
        wasResized,
        providerConfig,
    };
}
