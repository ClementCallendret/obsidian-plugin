import fs from 'fs';
import path from 'path';

interface Node {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    label?: string;
    text?: string;
    file?: string;
    color?: string;
}

interface Edge {
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: string;
    toSide: string;
    color?: string;
    fromEnd?: string;
    toEnd?: string;
    label?: string;
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
}

export interface Content {
    nodes: Node[];
    edges: Edge[];
}

export function convertCanvasToSVG(content: Content): string {
    const nodes = content.nodes;
    const edges = content.edges;

    let svg = "";
    svg += '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
    svg += '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n';

    // Calculate view box position
    let minX = 0;
    let minY = 0;
    console.log("content"   ,content);
    console.log("nodes",nodes);
    console.log("edges",edges);

    for (const node of nodes) {
        const nodeX = node.x;
        const nodeY = node.y;
        const nodeWidth = node.width;
        const nodeHeight = node.height;

        if (nodeX < minX) {
            minX = nodeX;
        }
        if (nodeY < minY) {
            minY = nodeY;
        }
    }

    // Calculate view box size
    let width = 0;
    let height = 0;

    for (const node of nodes) {
        const nodeX = node.x;
        const nodeY = node.y;
        const nodeWidth = node.width;
        const nodeHeight = node.height;

        const nodeMaxX = Math.abs(nodeX - minX) + nodeWidth;
        if (width < nodeMaxX) {
            width = nodeMaxX;
        }
        const nodeMaxY = Math.abs(nodeY - minY) + nodeHeight;
        if (height < nodeMaxY) {
            height = nodeMaxY;
        }
    }

    // Add view box
    const spacing = 50;
    svg += `<svg viewBox="${minX - spacing} ${minY - spacing} ${width + spacing * 2} ${height + spacing * 2}" xmlns="http://www.w3.org/2000/svg">\n`;

    // Render group as rect
    for (const group of nodes.filter(node => node.type === 'group')) {
        svg += renderGroup(group);
    }

    // Render edges
    for (const edge of edges) {
        const fromSide = edge.fromSide;
        const toSide = edge.toSide;
        let fromX = 0;
        let fromY = 0;
        let toX = 0;
        let toY = 0;

        // Get start and target nodes
        const fromNode = nodes.find(node => node.id === edge.fromNode);
        const toNode = nodes.find(node => node.id === edge.toNode);

        if (fromNode && toNode) {
            // Calculate x and y position of arrow start
            if (fromSide === 'right') {
                fromX = fromNode.x + fromNode.width;
                fromY = fromNode.y + fromNode.height / 2;
            }
            if (fromSide === 'bottom') {
                fromX = fromNode.x + fromNode.width / 2;
                fromY = fromNode.y + fromNode.height;
            }
            if (fromSide === 'left') {
                fromX = fromNode.x;
                fromY = fromNode.y + fromNode.height / 2;
            }
            if (fromSide === 'top') {
                fromX = fromNode.x + fromNode.width / 2;
                fromY = fromNode.y;
            }
            edge.fromX = fromX;
            edge.fromY = fromY;

            // Calculate x and y position of arrow target        
            if (toSide === 'right') {
                toX = toNode.x + toNode.width;
                toY = toNode.y + toNode.height / 2;
            }
            if (toSide === 'bottom') {
                toX = toNode.x + toNode.width / 2;
                toY = toNode.y + toNode.height;
            }
            if (toSide === 'left') {
                toX = toNode.x;
                toY = toNode.y + toNode.height / 2;
            }
            if (toSide === 'top') {
                toX = toNode.x + toNode.width / 2;
                toY = toNode.y;
            }
            edge.toX = toX;
            edge.toY = toY;

            svg += renderEdge(edge);
        }
    }

    // Render nodes as rect
    for (const node of nodes.filter(node => ['text', 'file'].includes(node.type))) {
        svg += renderNode(node);
    }

    svg += '</svg>';

    return svg;
}

function renderEdge(edge: Edge): string {
    const id = edge.id;
    const strokeWidth = 5;
    const color = mapColor(edge.color);
    const fromSide = edge.fromSide;
    const toSide = edge.toSide;
    const fontFamily = 'Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
    let fontColor = '#2c2d2c';

    let marker = `marker-end="url(#arrow-end-${id})"`;
    let fromOffset = 1;
    let toOffset = 11;
    let fromX = edge.fromX!;
    let fromY = edge.fromY!;
    let toX = edge.toX!;
    let toY = edge.toY!;
    let label = '';

    // Set arrow marker
    if (edge.fromEnd === 'arrow') {
        marker = `marker-end="url(#arrow-end-${id})" marker-start="url(#arrow-start-${id})"`;
        fromOffset = 11;
    }
    if (edge.toEnd === 'none') {
        marker = '';
        toOffset = 1;
    }

    // Calculate position with offset
    if (fromSide === 'right') {
        fromX += fromOffset;
    }
    if (fromSide === 'bottom') {
        fromY += fromOffset;
    }
    if (fromSide === 'left') {
        fromX -= fromOffset;
    }
    if (fromSide === 'top') {
        fromY -= fromOffset;
    }
    if (toSide === 'right') {
        toX += toOffset;
    }
    if (toSide === 'bottom') {
        toY += toOffset;
    }
    if (toSide === 'left') {
        toX -= toOffset;
    }
    if (toSide === 'top') {
        toY -= toOffset;
    }

    // Add label if it is set
    if (edge.label) {
        // Calculate position with offset
        const labelLength = edge.label.length * 4;
        let labelX = fromX - labelLength;
        let labelY = fromY;

        if (toX > fromX) {
            labelX += Math.abs((fromX - toX) / 2);
        }
        if (toY > fromY) {
            labelY += Math.abs((fromY - toY) / 2);
        }
        if (toX < fromX) {
            labelX -= Math.abs((toX - fromX) / 2);
        }
        if (toY < fromY) {
            labelY -= Math.abs((toY - fromY) / 2);
        }

        label = `<text x="${labelX}" y="${labelY}" font-family="${fontFamily}" fill="${fontColor}">${edge.label}</text>`;
    }

    return `
    <marker xmlns="http://www.w3.org/2000/svg" id="arrow-end-${id}" viewBox="0 0 10 10" refX="1" refY="5" fill="${color}" markerUnits="strokeWidth" markerWidth="3" markerHeight="3" orient="auto">
        <path d="M 0 0 L 7 5 L 0 10 z"/>
    </marker>
    <marker xmlns="http://www.w3.org/2000/svg" id="arrow-start-${id}" viewBox="-10 -10 10 10" refX="-1" refY="-5" fill="${color}" markerUnits="strokeWidth" markerWidth="3" markerHeight="3" orient="auto">
        <path d="M 0 0 L -7 -5 L 0 -10 z"/>
    </marker>
    <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${color}" stroke-width="${strokeWidth}" ${marker} />
    ${label}
    `;
}

function renderGroup(group: Node): string {
    const strokeWidth = 4;
    const fontWeight = 'bold';
    const fontFamily = 'Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';

    const textOffsetX = 15;
    const textOffsetY = -15;
    let fontColor = '#2c2d2c';
    const fillColor = '#fbfbfb';
    const text = group.label ?? '';
    const fontSize = 24;

    return `
    <rect x="${group.x}" y="${group.y}" width="${group.width}" height="${group.height}" rx="30" stroke="${mapColor(group.color)}" stroke-width="${strokeWidth}" fill="${fillColor}"/>
    <text x="${group.x + textOffsetX}" y="${group.y + textOffsetY}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fontColor}">${text}</text>
    `;
}

function renderNode(node: Node): string {
    const strokeWidth = 4;
    const fontWeight = 'bold';
    const fontFamily = 'Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';

    let textOffsetX = 15;
    let textOffsetY = 0;
    let fontColor = '#2c2d2c';
    let fontSize = 15;
    let content = '';

    // Render default text
    if (node.text) {
        content = `
        <style>
            p {
                font-family: ${fontFamily};
                font-size: ${fontSize}px;
                color: ${fontColor};
            }
        </style>
        <foreignObject x="${node.x + textOffsetX}" y="${node.y + textOffsetY}" width="${node.width - textOffsetX * 2}" height="${node.height - textOffsetY * 2}">
        <p xmlns="http://www.w3.org/1999/xhtml" class="${node.id}">${node.text}</p>
        </foreignObject>
        `;
    }

    // Render multiline text
    if (node.text && node.text.split('\n').length > 1) {
        let spans = '';
        for (const line of node.text.split('\n')) {
            spans += `<tspan x="${node.x + textOffsetX}" dy="${fontSize + 3}">${line}</tspan>`;
        }
        textOffsetY = 10;
        content = `<text x="${node.x + textOffsetX}" y="${node.y + textOffsetY}" font-family="${fontFamily}" fill="${fontColor}">${spans}</text>`;
    }

    // Render linked markdown file
    if (node.file && node.file.endsWith('.md')) {
        const title = node.file.replace('.md', '');
        const text = `<a href="/${title.toLowerCase()}.html">${title}</a>`;
        fontColor = '#9a7fee';
        fontSize = 28;
        textOffsetX = 30;
        textOffsetY = 45;
        content = `<text x="${node.x + textOffsetX}" y="${node.y + textOffsetY}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fontColor}">${text}</text>`;
    }

    // Render image
    if (node.file && !node.file.endsWith('.md')) {
        const filePath = node.file;

        const base64_content = fs.readFileSync(filePath, "base64");
        const extension = path.extname(filePath).replace('.', '');

        content = `<image href="${`data:image/${extension};base64,${base64_content}`}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" clip-path="inset(0% round 15px)" />`;
        fontColor = '#9a7fee';
    }

    return `
    <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="15" stroke="${mapColor(node.color)}" stroke-width="${strokeWidth}" fill="none"/>
    ${content}
    `;
}

function mapColor(color: string | undefined): string {
    const colors: { [key: number]: string } = {
        0: '#7e7e7e',
        1: '#aa363d',
        2: '#a56c3a',
        3: '#aba960',
        4: '#199e5c',
        5: '#249391',
        6: '#795fac'
    }; 
    let appliedColor = colors[0];

    if (color && color.length === 1) {
        appliedColor = colors[parseInt(color, 10)];
    } else if (color && color.length > 1) {
        appliedColor = color;
    }
    return appliedColor;
}
