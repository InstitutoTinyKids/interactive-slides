export async function optimizeImage(file, { maxWidth = 1920, maxHeight = 1080, quality = 0.7 } = {}) {
    return new Promise((resolve, reject) => {
        // Only optimize images
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }

        // Don't optimize if it's already a small SVG or GIF (might lose animation)
        if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate aspect ratio resizing
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to WebP with specified quality
                canvas.toBlob((blob) => {
                    if (!blob) {
                        console.warn('Optimization failed, using original file');
                        resolve(file);
                        return;
                    }

                    // Create new file from blob
                    const optimizedFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const optimizedFile = new File([blob], optimizedFileName, {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });

                    console.log(`Optimized image: ${file.size / 1024}KB -> ${optimizedFile.size / 1024}KB`);
                    resolve(optimizedFile);
                }, 'image/webp', quality);
            };
            img.onerror = () => resolve(file); // Fallback to original
        };
        reader.onerror = () => resolve(file); // Fallback to original
    });
}
