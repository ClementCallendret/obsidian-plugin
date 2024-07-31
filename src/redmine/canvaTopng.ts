import sharp from 'sharp';


export async function convertSvgToPng(svgString: string): Promise<string> {
    try {
        
        // Convertir le SVG en PNG avec sharp
        const pngBuffer = await sharp(Buffer.from(svgString))
          .toFormat('png');
    
        // Convertir le buffer PNG en base64
        //const pngBase64 = pngBuffer.toString('base64');
    
        return svgString;
      } catch (error) {
        console.error(`Erreur lors de la conversion : ${error.message}`);
        throw error; // Propager l'erreur pour une gestion ultérieure
      }
} 
    