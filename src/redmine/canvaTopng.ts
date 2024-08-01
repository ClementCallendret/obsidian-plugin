import DOMPurify from 'dompurify';

// Fonction pour convertir une chaîne SVG en PNG
async function convertSvgToPng(svgString: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
        // Sécuriser le contenu SVG
        const sanitizedSvg = DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } });
        
        // Créer une image
        const img = new Image();
        img.width = width;
        img.height = height;
        
        // Convertir le contenu SVG en Data URL
        const svgBlob = new Blob([sanitizedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            // Créer un canvas et dessiner l'image dessus
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir le canvas en Data URL PNG
                const pngDataUrl = canvas.toDataURL('image/png');
                resolve(pngDataUrl);
            } else {
                reject(new Error('Impossible de créer le contexte 2D du canvas'));
            }
            
            // Libérer l'URL de l'objet
            URL.revokeObjectURL(url);
        };
        
        img.onerror = () => {
            reject(new Error('Impossible de charger l\'image SVG'));
        };
        
        // Charger l'image SVG
        img.src = url;
    });
}

// Fonction pour tester la conversion et sauvegarder l'image
export async function test(app: any, svgString: string): Promise<void> {
    //const svgString = '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg>';
    try {
        console.log('SVG String:', svgString);
        const pngDataUrl = await convertSvgToPng(svgString, 5000, 5000);
        console.log('PNG Data URL:', pngDataUrl);
        
        // Convertir le Data URL en buffer binaire
        const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Enregistrer le buffer en tant que fichier PNG dans Obsidian
        await app.vault.create('test.png', buffer);
    } catch (error) {
        console.error('Erreur de conversion:', error);
    }
}


