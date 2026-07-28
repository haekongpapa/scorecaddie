const pptxgen = require("pptxgenjs");

// ── ScoreCaddie 테스트 계획서 ──────────────────────────────────────────────
// 색 팔레트: Teal Trust (테스트/신뢰 이미지에 맞춤)
const PRIMARY = "028090"; // teal
const SECONDARY = "00A896"; // seafoam
const ACCENT = "02C39A"; // mint
const DARK_BG = "07393C"; // 다크 슬라이드 배경
const TEXT_DARK = "17282A";
const TEXT_MUTED = "5C7274";
const CARD_BG = "F2F7F7";
const WHITE = "FFFFFF";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

// ── 재사용 헬퍼 ──────────────────────────────────────────────────────────
function badge(slide, x, y, d, num, opts = {}) {
  slide.addShape("ellipse", {
    x, y, w: d, h: d,
    fill: { color: opts.fill || SECONDARY },
    line: { type: "none" },
  });
  slide.addText(String(num), {
    x, y, w: d, h: d,
    align: "center", valign: "middle",
    fontFace: FONT_HEAD, fontSize: opts.fontSize || 20, bold: true,
    color: opts.color || WHITE,
    margin: 0,
  });
}

function pageFooter(slide, label, dark = false) {
  slide.addText(label, {
    x: 0.5, y: 7.12, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10,
    color: dark ? "9FC8C9" : TEXT_MUTED,
    margin: 0,
  });
}

function sectionTitle(slide, title, sub) {
  slide.addText(title, {
    x: 0.6, y: 0.45, w: 12.1, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: TEXT_DARK,
    margin: 0,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.6, y: 1.1, w: 12.1, h: 0.4,
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_MUTED,
      margin: 0,
    });
  }
}

// ── 1. 표지 ─────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: DARK_BG };

  // 배경 원 모티프
  s.addShape("ellipse", { x: 10.6, y: -1.4, w: 5.5, h: 5.5, fill: { color: PRIMARY, transparency: 55 }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.6, y: 4.6, w: 3.2, h: 3.2, fill: { color: ACCENT, transparency: 60 }, line: { type: "none" } });

  s.addText("SCORECADDIE  ·  QUALITY ASSURANCE", {
    x: 0.9, y: 2.15, w: 8, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: ACCENT, charSpacing: 2, bold: true,
    margin: 0,
  });
  s.addText("테스트 계획서", {
    x: 0.85, y: 2.55, w: 10.5, h: 1.3,
    fontFace: FONT_HEAD, fontSize: 48, bold: true, color: WHITE,
    margin: 0,
  });
  s.addText("Vitest 단위 테스트 + Playwright E2E 테스트 — 진행 방식 및 결과 관리", {
    x: 0.9, y: 3.75, w: 10, h: 0.5,
    fontFace: FONT_BODY, fontSize: 16, color: "CFE8E9",
    margin: 0,
  });

  s.addText("coding-guidelines.md §5 기반  ·  2026-07-28  ·  ScoreCaddie PM", {
    x: 0.9, y: 6.55, w: 8, h: 0.35,
    fontFace: FONT_BODY, fontSize: 12, color: "9FC8C9",
    margin: 0,
  });
}

// ── 2. 목차 ─────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "목차");

  const items = [
    ["01", "테스트 전략 개요", "Vitest와 Playwright의 역할 분담"],
    ["02", "Vitest 진행 방식", "단위 테스트 대상 · 위치 · 실행"],
    ["03", "Playwright 진행 방식", "E2E 대상 · 환경 요구사항 · 로그인 우회"],
    ["04", "진행 로드맵", "지금 가능한 것과 Supabase 이후 가능한 것"],
    ["05", "테스트 결과 관리", "이 문서로 결과를 계속 추적하는 방법"],
  ];

  let y = 1.85;
  const rowH = 0.98;
  items.forEach(([num, title, desc]) => {
    badge(s, 0.7, y + 0.08, 0.55, num, { fill: PRIMARY, fontSize: 15 });
    s.addText(title, {
      x: 1.55, y: y - 0.02, w: 5.6, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 18, bold: true, color: TEXT_DARK, margin: 0,
    });
    s.addText(desc, {
      x: 1.55, y: y + 0.42, w: 8.5, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_MUTED, margin: 0,
    });
    y += rowH;
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서");
}

// ── 3. 테스트 전략 개요 ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "테스트 전략 개요", "성격이 다른 두 계층을 각각 다른 도구로 검증합니다");

  const cols = [
    {
      x: 0.6, title: "Vitest", tag: "단위 테스트",
      rows: [
        ["대상", "lib/ 안의 순수 함수 · 계산 로직"],
        ["목적", "입력→출력 규칙이 코드 변경에도 깨지지 않는지 확인"],
        ["실행 환경", "DB · 브라우저 불필요, 지금 바로 착수 가능"],
        ["속도", "수백 개 테스트도 수 초 내 완료"],
      ],
    },
    {
      x: 6.9, title: "Playwright", tag: "E2E 테스트",
      rows: [
        ["대상", "실제 화면 흐름(로그인 → 등록 → 저장)"],
        ["목적", "사용자가 겪는 전체 경로가 실제로 동작하는지 확인"],
        ["실행 환경", "실제 브라우저 + DB(Supabase) 필요"],
        ["속도", "느리지만 화면 간 연동까지 검증"],
      ],
    },
  ];

  cols.forEach((col) => {
    s.addShape("roundRect", {
      x: col.x, y: 1.85, w: 5.85, h: 4.7, rectRadius: 0.12,
      fill: { color: CARD_BG }, line: { type: "none" },
      shadow: { type: "outer", color: "1B2B2D", opacity: 0.12, blur: 8, offset: 3, angle: 90 },
    });
    s.addShape("ellipse", { x: col.x + 0.35, y: 2.15, w: 0.6, h: 0.6, fill: { color: col.title === "Vitest" ? PRIMARY : ACCENT }, line: { type: "none" } });
    s.addText(col.title === "Vitest" ? "V" : "P", {
      x: col.x + 0.35, y: 2.15, w: 0.6, h: 0.6, align: "center", valign: "middle",
      fontFace: FONT_HEAD, fontSize: 22, bold: true, color: WHITE, margin: 0,
    });
    s.addText(col.title, {
      x: col.x + 1.1, y: 2.13, w: 3.5, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 20, bold: true, color: TEXT_DARK, margin: 0,
    });
    s.addText(col.tag, {
      x: col.x + 1.1, y: 2.55, w: 3.5, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11.5, color: TEXT_MUTED, margin: 0,
    });

    let ry = 3.15;
    col.rows.forEach(([label, val]) => {
      s.addText(label, {
        x: col.x + 0.35, y: ry, w: 1.3, h: 0.6,
        fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: col.title === "Vitest" ? PRIMARY : "0B7A5E", margin: 0, valign: "top",
      });
      s.addText(val, {
        x: col.x + 1.65, y: ry, w: 4.0, h: 0.6,
        fontFace: FONT_BODY, fontSize: 12, color: TEXT_DARK, margin: 0, valign: "top",
      });
      ry += 0.83;
    });
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  01 테스트 전략 개요");
}

// ── 4. Vitest 진행 방식 ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "Vitest — 진행 방식", "coding-guidelines.md §5 규칙 그대로 적용");

  const rows = [
    ["위치", "테스트 대상 파일 옆에 co-locate (예: lib/utils/geo.ts → lib/utils/geo.test.ts)"],
    ["대상 우선순위", "prisma·외부 API에 의존하지 않는 순수 함수부터 착수"],
    ["실행", "package.json에 \"test\": \"vitest run\" 스크립트 추가, npm run test로 실행"],
    ["현재 착수 가능 여부", "DB 연결 불필요 — 이 항목은 Supabase를 기다릴 필요 없이 바로 시작 가능"],
  ];

  let y = 2.0;
  rows.forEach(([label, val], i) => {
    s.addShape("roundRect", {
      x: 0.6, y, w: 12.1, h: 0.95, rectRadius: 0.08,
      fill: { color: i % 2 === 0 ? CARD_BG : WHITE }, line: { type: "none" },
    });
    s.addShape("roundRect", {
      x: 0.85, y: y + 0.18, w: 1.9, h: 0.58, rectRadius: 0.29,
      fill: { color: PRIMARY }, line: { type: "none" },
    });
    s.addText(label, {
      x: 0.85, y: y + 0.18, w: 1.9, h: 0.58, align: "center", valign: "middle",
      fontFace: FONT_BODY, fontSize: 12, bold: true, color: WHITE, margin: 0,
    });
    s.addText(val, {
      x: 3.0, y, w: 9.5, h: 0.95, valign: "middle",
      fontFace: FONT_BODY, fontSize: 13, color: TEXT_DARK, margin: 0,
    });
    y += 1.12;
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  02 Vitest 진행 방식");
}

// ── 5. Vitest 우선 대상 함수 ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "Vitest — 우선 대상 함수", "실제 lib/ 함수 기준 — 위쪽일수록 먼저 착수");

  const header = ["대상 파일", "함수", "의존성"];
  const data = [
    ["lib/services/csv.ts", "parseCsv", "없음 (최우선)"],
    ["lib/utils/geo.ts", "convertTmToWgs84", "없음"],
    ["lib/weather/kma.ts", "isWithinForecastRange", "없음"],
    ["lib/utils/round-format.ts / course-format.ts", "포맷 함수 전체", "없음"],
    ["lib/services/round-duplicate.ts", "findDuplicateRound", "prisma mock 필요"],
    ["lib/services/golf-course-upload.ts", "processGolfCourseCsvRows", "prisma mock 필요"],
    ["lib/geocoding/kakao.ts", "geocodeAddress", "fetch mock 필요"],
    ["lib/services/golf-course-sync.ts / golf-course-geocode.ts", "runGolfCourseSync / runGeocodingBatch", "prisma+fetch mock 필요"],
  ];

  const rowsForTable = [header, ...data].map((r, idx) => r.map((c) => ({
    text: c,
    options: idx === 0
      ? { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 12 }
      : { color: TEXT_DARK, fill: { color: idx % 2 === 0 ? CARD_BG : WHITE }, fontSize: 11.5 },
  })));

  s.addTable(rowsForTable, {
    x: 0.6, y: 1.95, w: 12.1, h: 4.6,
    colW: [5.6, 3.6, 2.9],
    border: { type: "none" },
    autoPage: false,
    valign: "middle",
    margin: [4, 8, 4, 8],
  });

  s.addText("※ \"의존성 없음\" 항목은 순수 함수라 곧바로 테스트 작성이 가능합니다. mock이 필요한 항목은 Vitest의 vi.mock으로 prisma/fetch를 대체합니다.", {
    x: 0.6, y: 6.68, w: 12.1, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, italic: true, color: TEXT_MUTED, margin: 0,
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  02 Vitest 진행 방식");
}

// ── 6. Playwright 진행 방식 ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "Playwright — 진행 방식", "실제 브라우저로 화면 흐름을 끝까지 검증");

  const rows = [
    ["위치", "e2e/ 폴더에 시나리오별 *.spec.ts 로 모음"],
    ["실행 환경 요구사항", "Supabase DB 연결 필요 — Vitest와 달리 지금은 착수 불가"],
    ["로그인 우회", "Google/Kakao 실제 OAuth 화면은 자동화 어려움 → 테스트 전용 로그인 경로 또는 세션 쿠키 주입 방식 검토"],
    ["데이터 격리", "운영 DB 오염 방지를 위해 테스트 전용 Supabase 프로젝트/스키마 분리 권장"],
  ];

  let y = 2.0;
  rows.forEach(([label, val], i) => {
    s.addShape("roundRect", {
      x: 0.6, y, w: 12.1, h: 0.95, rectRadius: 0.08,
      fill: { color: i % 2 === 0 ? CARD_BG : WHITE }, line: { type: "none" },
    });
    s.addShape("roundRect", {
      x: 0.85, y: y + 0.1, w: 2.3, h: 0.75, rectRadius: 0.12,
      fill: { color: ACCENT }, line: { type: "none" },
    });
    s.addText(label, {
      x: 0.95, y: y + 0.1, w: 2.1, h: 0.75, align: "center", valign: "middle",
      fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: DARK_BG, margin: 0,
    });
    s.addText(val, {
      x: 3.4, y, w: 9.1, h: 0.95, valign: "middle",
      fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_DARK, margin: 0,
    });
    y += 1.12;
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  03 Playwright 진행 방식");
}

// ── 7. Playwright 우선 시나리오 ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "Playwright — 우선 시나리오", "핵심 사용자 플로우 기준 — 화면 번호는 기획 문서 기준");

  const scenarios = [
    ["로그인", "테스트 전용 로그인 경로 필요"],
    ["골프장 목록 조회", "검색/필터 동작 확인"],
    ["라운드 등록 2-Step (7-1→7-2)", "가장 핵심 사용자 플로우"],
    ["라운드 상세 · 삭제 (9번)", "본인 소유 검증 포함"],
    ["관리자: 루프·Par 관리 (12번)", "CRUD 전반"],
    ["관리자: CSV 업로드 (13번)", "부분 성공 처리 확인"],
    ["관리자: 공공데이터 동기화 (11번)", "외부 API 응답은 별도 목 서버 권장"],
    ["관리자: 지오코딩 실행 (11번)", "카카오 API도 목 처리 권장"],
  ];

  const colW = 5.85;
  scenarios.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.6 + col * (colW + 0.4);
    const y = 1.95 + row * 1.13;
    s.addShape("roundRect", {
      x, y, w: colW, h: 0.98, rectRadius: 0.1,
      fill: { color: CARD_BG }, line: { type: "none" },
    });
    badge(s, x + 0.2, y + 0.19, 0.58, i + 1, { fill: SECONDARY, fontSize: 14 });
    s.addText(item[0], {
      x: x + 0.95, y: y + 0.08, w: colW - 1.1, h: 0.42,
      fontFace: FONT_BODY, fontSize: 13, bold: true, color: TEXT_DARK, margin: 0,
    });
    s.addText(item[1], {
      x: x + 0.95, y: y + 0.5, w: colW - 1.1, h: 0.42,
      fontFace: FONT_BODY, fontSize: 10.5, color: TEXT_MUTED, margin: 0,
    });
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  03 Playwright 진행 방식");
}

// ── 8. 진행 로드맵 ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: DARK_BG };
  s.addShape("ellipse", { x: -1.6, y: 4.6, w: 4.5, h: 4.5, fill: { color: PRIMARY, transparency: 55 }, line: { type: "none" } });

  s.addText("진행 로드맵", {
    x: 0.6, y: 0.5, w: 10, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: WHITE, margin: 0,
  });
  s.addText("Vitest는 지금, Playwright는 Supabase 연결 이후", {
    x: 0.6, y: 1.15, w: 10, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: "9FC8C9", margin: 0,
  });

  const steps = [
    ["1", "Vitest 셋업 + 우선 함수 테스트 작성", "지금 바로 착수 가능 (DB 불필요)", ACCENT],
    ["2", "Supabase DB 연결", "배포 검토 문서에서 결정한 인프라 준비 단계", SECONDARY],
    ["3", "Playwright 셋업 + 테스트 전용 로그인 경로 마련", "OAuth 우회 방식 확정 필요", PRIMARY],
    ["4", "핵심 사용자 플로우 e2e 작성 · 실행", "라운드 등록 2-Step부터 우선 작성", "0B5C63"],
  ];

  let y = 2.05;
  steps.forEach(([num, title, desc, color]) => {
    badge(s, 0.7, y, 0.65, num, { fill: color, fontSize: 22 });
    s.addText(title, {
      x: 1.65, y: y - 0.05, w: 10.8, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 17, bold: true, color: WHITE, margin: 0,
    });
    s.addText(desc, {
      x: 1.65, y: y + 0.4, w: 10.8, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, color: "BFE3E4", margin: 0,
    });
    y += 1.2;
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  04 진행 로드맵", true);
}

// ── 9. 테스트 결과 관리 — 사용 방법 ────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, "테스트 결과 관리", "이 문서를 계속 갱신하며 진행 상황을 추적합니다");

  s.addShape("roundRect", {
    x: 0.6, y: 1.9, w: 12.1, h: 1.55, rectRadius: 0.12,
    fill: { color: CARD_BG }, line: { type: "none" },
  });
  s.addText("사용 방법", {
    x: 0.95, y: 2.08, w: 4, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 15, bold: true, color: PRIMARY, margin: 0,
  });
  s.addText(
    "다음 두 슬라이드의 표는 테스트가 실제로 작성·실행될 때마다 상태(예정 → 통과/실패)와 최근 실행일을 갱신합니다. " +
    "이 PPT를 만든 생성 스크립트(doc/scripts/generate_test_plan.js)를 보관해두었으니, 다음 세션에서 결과만 바꿔 다시 생성하면 됩니다.",
    {
      x: 0.95, y: 2.5, w: 11.4, h: 0.85,
      fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_DARK, margin: 0, valign: "top",
    }
  );

  const legend = [
    ["예정", TEXT_MUTED], ["작성완료", "0B5C63"], ["통과", "0B8457"], ["실패", "B23A48"],
  ];
  let lx = 0.6;
  legend.forEach(([label, color]) => {
    s.addShape("roundRect", { x: lx, y: 3.75, w: 1.55, h: 0.5, rectRadius: 0.25, fill: { color }, line: { type: "none" } });
    s.addText(label, {
      x: lx, y: 3.75, w: 1.55, h: 0.5, align: "center", valign: "middle",
      fontFace: FONT_BODY, fontSize: 12, bold: true, color: WHITE, margin: 0,
    });
    lx += 1.85;
  });

  s.addText("상태 표기 기준", {
    x: 0.6, y: 4.55, w: 4, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: TEXT_MUTED, margin: 0,
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  05 테스트 결과 관리");
}

const STATUS_COLOR = { "예정": "8A9A9C", "작성완료": "0B5C63", "통과": "0B8457", "실패": "B23A48" };

function resultTableSlide(title, subtitle, header, rows) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  sectionTitle(s, title, subtitle);

  const statusColIdx = header.indexOf("상태");

  const tableRows = [header, ...rows].map((r, idx) => r.map((c, colIdx) => ({
    text: c,
    options: idx === 0
      ? { bold: true, color: WHITE, fill: { color: PRIMARY }, fontSize: 12 }
      : {
          color: colIdx === statusColIdx ? (STATUS_COLOR[c] || TEXT_DARK) : TEXT_DARK,
          bold: colIdx === statusColIdx,
          fill: { color: idx % 2 === 0 ? CARD_BG : WHITE },
          fontSize: 11,
        },
  })));

  s.addTable(tableRows, {
    x: 0.6, y: 1.95, w: 12.1, h: 4.9,
    colW: [3.6, 3.3, 1.7, 1.7, 1.8],
    border: { type: "none" },
    autoPage: false,
    valign: "middle",
    margin: [4, 8, 4, 8],
  });
  pageFooter(s, "ScoreCaddie 테스트 계획서  ·  05 테스트 결과 관리");
  return s;
}

// ── 10. 결과 관리 — Vitest ─────────────────────────────────────────────
resultTableSlide(
  "테스트 결과 — Vitest",
  "단위 테스트 실행 결과를 여기에 누적 기록합니다",
  ["테스트 파일", "테스트 대상", "상태", "최근 실행일", "비고"],
  [
    ["lib/services/csv.test.ts", "parseCsv / findColumnIndex", "통과", "2026-07-28", "8개 케이스(따옴표·콤마·BOM 등)"],
    ["lib/utils/geo.test.ts", "convertTmToWgs84", "통과", "2026-07-28", "4개 케이스(범위 이상치 포함)"],
    ["lib/weather/kma.test.ts", "isWithinForecastRange", "통과", "2026-07-28", "4개 케이스(경계값 포함)"],
    ["lib/utils/round-format.test.ts", "라운드 날짜·시간 포맷 함수", "통과", "2026-07-28", "8개 케이스"],
    ["lib/utils/course-format.test.ts", "골프장 주소·구분 포맷 함수", "통과", "2026-07-28", "6개 케이스"],
    ["lib/services/round-duplicate.test.ts", "findDuplicateRound", "예정", "-", "prisma mock 필요"],
    ["lib/services/golf-course-upload.test.ts", "processGolfCourseCsvRows", "예정", "-", "prisma mock 필요"],
  ]
);

// ── 11. 결과 관리 — Playwright ─────────────────────────────────────────
resultTableSlide(
  "테스트 결과 — Playwright",
  "E2E 시나리오 실행 결과를 여기에 누적 기록합니다",
  ["시나리오", "파일", "상태", "최근 실행일", "비고"],
  [
    ["로그인", "e2e/login.spec.ts", "예정", "-", "테스트 전용 로그인 경로 필요"],
    ["라운드 등록 2-Step", "e2e/round-create.spec.ts", "예정", "-", "Supabase 연결 후 착수"],
    ["라운드 상세·삭제", "e2e/round-delete.spec.ts", "예정", "-", "-"],
    ["관리자 CSV 업로드", "e2e/admin-upload.spec.ts", "예정", "-", "-"],
    ["관리자 공공데이터 동기화", "e2e/admin-sync.spec.ts", "예정", "-", "외부 API 목 서버 권장"],
  ]
);

pres.writeFile({ fileName: "ScoreCaddie_테스트계획서.pptx" }).then(() => {
  console.log("done");
});
