/**
 * figma-parse.js
 * Figma 노드 JSON을 분석하여 CSS 클래스와 여백을 추출하는 파싱 스크립트
 *
 * 사용법:
 *   node scripts/figma-parse.js [command] [options]
 *
 * 명령어:
 *   tree              - 전체 노드 트리 출력 (이름/타입/크기)
 *   text              - 모든 TEXT 노드 + CSS 클래스 추천 출력
 *   spacing           - 형제 노드 간 실제 여백(px) 계산
 *   node <id>         - 특정 노드 ID 상세 정보 출력
 *
 * 예시:
 *   node scripts/figma-parse.js tree
 *   node scripts/figma-parse.js text
 *   node scripts/figma-parse.js spacing
 *   node scripts/figma-parse.js node 14625:6961
 */

const fs = require('fs');
const path = require('path');

// ── 설정 ──────────────────────────────────────────────────────────────────────
const JSON_PATH = path.join(__dirname, '..', 'figma-node.json');
const ROOT_NODE_ID = '14625:6950';

// ── CSS 매핑 테이블 ────────────────────────────────────────────────────────────

/** fontSize(px) + fontWeight → CSS 클래스 추천 */
function getCssTextClass(fontSize, fontWeight) {
  const suggestions = [];

  // 크기 기반 클래스
  const sizeMap = {
    20: 'sub-title1',
    18: 'title-headline3',
    16: fontWeight >= 600 ? 'body-title1' : 'txt-body1',
    15: fontWeight >= 600 ? 'body-title2' : 'txt-body2',
    14: fontWeight >= 600 ? 'body-title3' : 'txt-body3',
    13: 'txt-caption1',
    12: 'txt-caption2',
    11: 'txt-caption3',
  };

  const baseClass = sizeMap[Math.round(fontSize)];
  if (baseClass) suggestions.push(baseClass);

  // fontWeight 보조 클래스 (base 클래스가 이미 bold가 아닌 경우)
  if (fontWeight === 500 && !baseClass?.includes('title')) suggestions.push('fw-m');
  if (fontWeight === 700 && !baseClass?.includes('title') && !baseClass?.startsWith('sub-title')) suggestions.push('fw-b');

  return suggestions.join(' ') || `/* unknown ${fontSize}px w${fontWeight} */`;
}

/** RGB(0~1 float) → CSS 색상 클래스 */
function getCssColorClass(r, g, b) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();

  const colorMap = {
    '#111111': '(기본 타이틀색, 클래스 불필요)',
    '#333333': 'body-clr1',
    '#666666': 'body-clr2',
    '#999999': 'caption-clr (body-clr3)',
    '#2d4a9b': 'sys-clr3',
    '#ed3437': 'sys-clr1',
    '#10a27a': 'sys-clr2 (green)',
    '#0070e9': 'acct-clr5',
    '#0d2b58': 'acct-clr1 (navy)',
    '#ff7761': 'acct-clr3',
    '#8052e2': 'acct-clr4',
    '#ffbe19': 'acct-clr7',
    '#ffffff': '(흰색)',
  };

  return colorMap[hex] || `/* unknown ${hex} */`;
}

/** px 값 → margin/gap CSS 클래스 */
function getSpacingClass(px) {
  const spacingMap = {
    0: 'mt-0',
    4: 'mt-xs2 (4px)',
    8: 'mt-xs (8px)',
    12: 'mt-sm2 (12px)',
    16: 'mt-s / mt-sm (16px)',
    24: 'mt-m / mt-md (24px)',
    32: 'mt-m2 / mt-md2 (32px)',
    40: 'mt-l / mt-lg (40px)',
  };
  const rounded = Math.round(px);
  return spacingMap[rounded] || `/* ${rounded}px → 가장 가까운 클래스 사용 */`;
}

// ── 노드 파싱 유틸 ────────────────────────────────────────────────────────────

function getColor(fills) {
  if (!fills || fills.length === 0) return null;
  const fill = fills[0];
  if (fill.color) return fill.color;
  return null;
}

function getBBox(node) {
  return node.absoluteBoundingBox || null;
}

// ── 명령어: tree ──────────────────────────────────────────────────────────────
function cmdTree(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const box = getBBox(node);
  const sizeStr = box ? `[${Math.round(box.width)}×${Math.round(box.height)}] y=${Math.round(box.y)}` : '';
  const visStr = node.visible === false ? ' 🙈hidden' : '';

  if (depth < 8) {
    console.log(`${indent}[${node.type}] ${node.name}  ${sizeStr}${visStr}`);
  }

  if (node.children && depth < 7) {
    node.children.forEach((child) => cmdTree(child, depth + 1));
  }
}

// ── 명령어: text ──────────────────────────────────────────────────────────────
function cmdText(node, results = []) {
  if (node.type === 'TEXT' && node.visible !== false) {
    const style = node.style || {};
    const fills = node.fills || [];
    const color = getColor(fills);

    const fontSize = style.fontSize || '?';
    const fontWeight = style.fontWeight || '?';
    const colorClass = color ? getCssColorClass(color.r, color.g, color.b) : '(변수 alias)';
    const textClass = typeof fontSize === 'number' && typeof fontWeight === 'number'
      ? getCssTextClass(fontSize, fontWeight)
      : '?';

    results.push({
      name: node.name,
      text: node.characters,
      fontSize,
      fontWeight,
      colorHex: color
        ? `#${[color.r, color.g, color.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
        : '(alias)',
      colorClass,
      cssClass: textClass,
    });
  }

  if (node.children) {
    node.children.forEach((child) => cmdText(child, results));
  }

  return results;
}

// ── 명령어: spacing ───────────────────────────────────────────────────────────
function cmdSpacing(node, depth = 0) {
  if (!node.children || node.children.length < 2) {
    if (node.children) node.children.forEach((c) => cmdSpacing(c, depth + 1));
    return;
  }

  const visibleChildren = node.children.filter(
    (c) => c.visible !== false && getBBox(c)
  );

  if (visibleChildren.length >= 2) {
    let hasSpacingInfo = false;
    const gaps = [];

    for (let i = 1; i < visibleChildren.length; i++) {
      const prev = getBBox(visibleChildren[i - 1]);
      const curr = getBBox(visibleChildren[i]);
      if (prev && curr) {
        const gap = curr.y - (prev.y + prev.height);
        if (gap >= 0 && gap <= 100) {
          gaps.push({ from: visibleChildren[i - 1].name, to: visibleChildren[i].name, px: Math.round(gap) });
          hasSpacingInfo = true;
        }
      }
    }

    if (hasSpacingInfo) {
      const indent = '  '.repeat(depth);
      console.log(`\n${indent}📦 [${node.type}] "${node.name}"`);
      gaps.forEach((g) => {
        const cls = getSpacingClass(g.px);
        console.log(`${indent}  ↕ "${g.from}" → "${g.to}": ${g.px}px  →  ${cls}`);
      });
    }
  }

  node.children.forEach((child) => cmdSpacing(child, depth + 1));
}

// ── 명령어: node <id> ─────────────────────────────────────────────────────────
function findNode(node, id) {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function printNodeDetail(node) {
  const box = getBBox(node);
  console.log('\n=== 노드 상세 정보 ===');
  console.log(`ID    : ${node.id}`);
  console.log(`Name  : ${node.name}`);
  console.log(`Type  : ${node.type}`);
  console.log(`Visible: ${node.visible !== false}`);

  if (box) {
    console.log(`\n📐 크기/위치:`);
    console.log(`  x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);
  }

  if (node.type === 'TEXT') {
    const style = node.style || {};
    const fills = node.fills || [];
    const color = getColor(fills);
    console.log(`\n✏️ 텍스트:`);
    console.log(`  characters : "${node.characters}"`);
    console.log(`  fontSize   : ${style.fontSize}px`);
    console.log(`  fontWeight : ${style.fontWeight}`);
    console.log(`  lineHeight : ${JSON.stringify(style.lineHeightPx || style.lineHeightPercent)}`);
    console.log(`  letterSpacing: ${style.letterSpacing}`);
    if (color) {
      const hex = `#${[color.r, color.g, color.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
      console.log(`  color      : ${hex}  →  ${getCssColorClass(color.r, color.g, color.b)}`);
    }
    console.log(`\n💡 CSS 추천  : <p class="${getCssTextClass(style.fontSize, style.fontWeight)}">`);
  }

  if (node.type === 'FRAME' || node.type === 'INSTANCE') {
    console.log(`\n📏 레이아웃:`);
    console.log(`  layoutMode : ${node.layoutMode || 'NONE'}`);
    console.log(`  itemSpacing: ${node.itemSpacing ?? '(variable)'}`);
    console.log(`  padding    : T=${node.paddingTop ?? '?'} R=${node.paddingRight ?? '?'} B=${node.paddingBottom ?? '?'} L=${node.paddingLeft ?? '?'}`);

    if (node.boundVariables) {
      const bv = node.boundVariables;
      console.log(`  bound vars : ${Object.keys(bv).join(', ')}`);
    }
  }

  if (node.children) {
    console.log(`\n👶 자식 노드 (${node.children.length}개):`);
    node.children.forEach((c, i) => {
      const b = getBBox(c);
      const sizeStr = b ? ` y=${Math.round(b.y)} h=${Math.round(b.height)}` : '';
      console.log(`  [${i}] [${c.type}] "${c.name}"${sizeStr}${c.visible === false ? ' 🙈hidden' : ''}`);
    });
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
function main() {
  const [, , command, ...args] = process.argv;

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ figma-node.json을 찾을 수 없습니다: ${JSON_PATH}`);
    process.exit(1);
  }

  console.log('📂 figma-node.json 읽는 중...');
  // BOM(Byte Order Mark) 제거 후 파싱
  const rawBuffer = fs.readFileSync(JSON_PATH);
  const raw = rawBuffer.toString('utf-8').replace(/^\uFEFF/, '');
  const json = JSON.parse(raw);

  const rootEntry = json.nodes[ROOT_NODE_ID];
  if (!rootEntry) {
    console.error(`❌ 루트 노드 ${ROOT_NODE_ID}를 찾을 수 없습니다.`);
    process.exit(1);
  }
  const root = rootEntry.document;

  switch (command) {
    case 'tree':
      console.log(`\n🌲 노드 트리 (루트: ${root.name})\n`);
      cmdTree(root);
      break;

    case 'text': {
      console.log(`\n✏️ 텍스트 노드 분석\n`);
      const texts = cmdText(root);
      texts.forEach((t, i) => {
        console.log(`[${i + 1}] "${t.text}"`);
        console.log(`     fontSize=${t.fontSize}px  fontWeight=${t.fontWeight}  color=${t.colorHex}`);
        console.log(`     💡 CSS: <p class="${t.cssClass} ${t.colorClass !== '(기본 타이틀색, 클래스 불필요)' ? t.colorClass : ''}">`.trim());
        console.log('');
      });
      console.log(`총 ${texts.length}개 텍스트 노드`);
      break;
    }

    case 'spacing':
      console.log(`\n📏 요소 간 여백 분석 (실제 px → CSS 클래스)\n`);
      cmdSpacing(root);
      break;

    case 'node': {
      const nodeId = args[0];
      if (!nodeId) {
        console.error('❌ 노드 ID를 입력해주세요. 예: node scripts/figma-parse.js node 14625:6961');
        process.exit(1);
      }
      const found = findNode(root, nodeId);
      if (!found) {
        console.error(`❌ 노드 ID "${nodeId}"를 찾을 수 없습니다.`);
        process.exit(1);
      }
      printNodeDetail(found);
      break;
    }

    default:
      console.log(`
사용법: node scripts/figma-parse.js [command]

명령어:
  tree              전체 노드 트리 출력
  text              모든 텍스트 노드 + CSS 클래스 추천
  spacing           요소 간 실제 여백(px) → CSS 클래스 변환
  node <id>         특정 노드 상세 정보 (예: node 14625:6961)
`);
  }
}

main();
