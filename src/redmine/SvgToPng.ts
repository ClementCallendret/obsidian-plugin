import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { Notice, TFile } from 'obsidian';
import { Content, convertCanvasToSVG } from './CanvaToSvg';
import { buffer } from 'stream/consumers';

// Fonction pour convertir Markdown en HTML
async function convertMarkdownToHtml(markdown: string): Promise<string> {
    return marked(markdown);
}

// Fonction pour convertir une chaîne SVG en PNG
async function convertSvgToPng(svgString: string, width: number, height: number): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Configurer la taille de la page pour correspondre à la taille du SVG
    await page.setViewport({ width, height });

    // Extraire et convertir le contenu Markdown en HTML
    const updatedSvgString = await (async () => {
        // Trouver tous les contenus Markdown dans les balises <foreignObject>
        const matches = [...svgString.matchAll(/(<foreignObject[^>]*>)(.*?)(<\/foreignObject>)/gs)];

        for (const match of matches) {
            const [fullMatch, openingTag, content, closingTag] = match;

            // Extraire et nettoyer le contenu brut (Markdown)
            const rawContent = content.trim();
            const markdownContent = rawContent.replace(/<\/?p[^>]*>/g, '').trim();

            // Convertir en HTML seulement si le contenu est du Markdown brut
            const htmlContent = markdownContent && !markdownContent.startsWith('<') 
                ? await convertMarkdownToHtml(markdownContent) 
                : rawContent;

            // Remplacer le contenu Markdown par le HTML converti
            svgString = svgString.replace(fullMatch, `${openingTag}${htmlContent}${closingTag}`);
        }

        return svgString;
    })();


    // Charger le SVG mis à jour dans la page
    await page.setContent(`
        <html>
            <body>
                <div id="svg-container">${updatedSvgString}</div>
            </body>
        </html>
    `);

    // Attendre que le SVG soit complètement rendu
    await page.waitForFunction(() => document.querySelector('#svg-container svg') !== null, { timeout: 60000 });

    // Capturer une capture d'écran de l'élément SVG
    const svgElement = await page.$('#svg-container svg');
    if (!svgElement) {
        await browser.close();
        throw new Error('Impossible de trouver l\'élément SVG dans la page.');
    }

    const screenshotBuffer = await svgElement.screenshot({ type: 'png' });

    await browser.close();

    // Convertir le buffer de la capture d'écran en base64
    const pngDataUrl = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
    return pngDataUrl;
}

// Fonction pour convertir le canva en png 
export async function convert(file: TFile): Promise<string> {
    const data = await this.app.vault.read(file as TFile);
    const content: Content = JSON.parse(data);
    if (content.nodes.length === 0) {
        new Notice('Un canva ne contient pas de contenu.');
        throw new Error('Un canva ne contient pas de contenu.');
    }
    const svgData = convertCanvasToSVG(content);

    const pngDataUrl = await convertSvgToPng(svgData, 2000, 2000);

    // Convertir le Data URL en buffer binaire
    const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await this.app.vault.create('test'+file.basename+'.png', buffer);
    const pngFile = this.app.vault.getAbstractFileByPath('test'+file.basename+'.png');
    console.log("BEFORE readBinary");
    const binary = await this.app.vault.readBinary(pngFile);
    console.log("AFTER");

    return binary;

}
