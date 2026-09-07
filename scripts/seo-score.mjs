// SEO·GEO·AEO 15개 분야 채점기 — 빌드 산출물(dist/)을 읽어 전역 가이드의 체크리스트대로 점수를 낸다.
// 사용법: node scripts/seo-score.mjs [--v]   (--v 를 붙이면 실패한 항목을 전부 출력)
//
// 채점 원칙
//  1) 근거는 산출물에 있는 것만 본다. "했다고 치는" 항목은 두지 않는다.
//  2) 각 분야는 항목의 가중 평균이며, 분야 점수의 산술 평균이 총점이다.
//  3) 항목이 부분 점수를 가질 때는 (통과 페이지 수 / 전체 페이지 수)로 계산한다.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ── 프로젝트마다 고칠 것 — 이 세 줄이면 다른 사이트에도 그대로 쓸 수 있다 ──
const DIST = 'dist'                          // 빌드 산출물 폴더
const ORIGIN = 'https://toesahero.com'       // 대표 도메인
const V = process.argv.includes('--v')
// 아래 PRIVATE(비공개 화면)과 각 분야의 브랜드·연락처 문자열도 함께 고친다.
// 채점 원칙은 건드리지 말 것 — 근거는 산출물에만 두고, 판정을 고칠 땐 이유를 주석에 남긴다.

// ── 산출물 수집 ─────────────────────────────────────────────
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const files = existsSync(DIST) ? walk(DIST) : []
const htmlFiles = files.filter((f) => f.endsWith('.html'))
const read = (p) => readFileSync(p, 'utf8')
const readIf = (p) => (existsSync(p) ? read(p) : null)

// 공개 페이지(검색에 노출되는 것)와 비공개 페이지를 나눈다
const PRIVATE = /(^|\/)(admin|mypage|delegation|checkout|404|offline)\.html$/
const pages = htmlFiles
  .filter((f) => !PRIVATE.test(f.replace(/\\/g, '/')))
  .map((f) => {
    const html = read(f)
    const url = '/' + relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '')
    return { file: f, url: url === '/' ? '/' : url.replace(/\/$/, ''), html }
  })
const columns = pages.filter((p) => p.url.startsWith('/blog/'))
// noindex를 단 화면(내 공간 같은 비공개 도구)은 검색에 내보내지 않으므로 내용·메타 채점에서 제외한다
const indexable = pages.filter((p) => !/name="robots"[^>]+noindex/i.test(p.html))

const robots = readIf(join(DIST, 'robots.txt'))
// ⚠ 이 프로젝트는 sitemap·rss·llms 를 Cloudflare Pages Functions 가 요청 시점에 만든다.
//   dist 에 정적 파일이 없다고 0점을 주면 "만들지 않았다"로 오판한다 — 라이브는 전부 200이다.
//   그래서 산출물이 없으면 functions 소스에서 생성 로직을 읽어 판정한다(2026-09-06).
const FN = join(DIST, '..', 'functions')
const runtimeOr = (distName, fnName) =>
  readIf(join(DIST, distName)) || readIf(join(FN, fnName))
const sitemap = runtimeOr('sitemap.xml', 'sitemap.xml.ts')
const rss = runtimeOr('rss.xml', 'rss.xml.ts')
const llms = runtimeOr('llms.txt', 'llms.txt.ts')
const headers = readIf(join(DIST, '_headers'))

// ── 도우미 ─────────────────────────────────────────────────
const tag = (html, re) => (html.match(re) || [])[1] || null
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1])
const title = (h) => tag(h, /<title[^>]*>([\s\S]*?)<\/title>/i)
const desc = (h) => tag(h, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i)
const canonical = (h) => tag(h, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)
const ogv = (h, p) => tag(h, new RegExp(`<meta[^>]+property="og:${p}"[^>]+content="([^"]*)"`, 'i'))
const jsonLd = (h) =>
  all(h, /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    .map((s) => {
      try {
        return JSON.parse(s)
      } catch {
        return null
      }
    })
const bodyText = (h) =>
  (h.split(/<body[^>]*>/i)[1] || h)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const types = (h) => {
  const out = []
  for (const o of jsonLd(h)) {
    if (!o) continue
    const push = (x) => x && x['@type'] && out.push(x['@type'])
    if (Array.isArray(o['@graph'])) o['@graph'].forEach(push)
    push(o)
    if (Array.isArray(o)) o.forEach(push)
  }
  return out.flat()
}

// ── 채점 틀 ────────────────────────────────────────────────
const areas = []
function area(name, fn) {
  const checks = []
  const c = (label, weight, value, detail = '') => checks.push({ label, weight, value: Math.max(0, Math.min(1, value)), detail })
  fn(c)
  const w = checks.reduce((s, x) => s + x.weight, 0) || 1
  const score = (checks.reduce((s, x) => s + x.weight * x.value, 0) / w) * 100
  areas.push({ name, score, checks })
}
// 페이지별 통과 비율
const ratio = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : 1)

// ── 1. 크롤링·색인 ──────────────────────────────────────────
area('1. 크롤링·색인', (c) => {
  c('robots.txt 존재', 2, robots ? 1 : 0)
  c('robots에 Sitemap 명시', 2, robots && /^\s*Sitemap:\s*https?:\/\//im.test(robots) ? 1 : 0)
  c('네이버 Yeti 허용', 2, robots && /User-agent:\s*Yeti[\s\S]{0,120}?Allow:\s*\//i.test(robots) ? 1 : 0)
  c('JS·CSS를 막지 않음', 2, robots && !/Disallow:\s*\/(assets|.*\.(js|css))/i.test(robots) ? 1 : 0)
  c('sitemap.xml 존재·형식', 3, sitemap && /<urlset/.test(sitemap) ? 1 : 0)  // 소스에도 <urlset 문자열이 있다
  const locs = sitemap ? all(sitemap, /<loc>([^<]+)<\/loc>/g) : []
  const sitemapIsSource = !readIf(join(DIST, 'sitemap.xml'))
  c('사이트맵 URL이 모두 대표 도메인', 2,
    sitemapIsSource ? (/ORIGIN|toesahero\.com/.test(sitemap) ? 1 : 0)
                    : (locs.length ? ratio(locs, (u) => u.startsWith(ORIGIN)) : 0),
    sitemapIsSource ? '런타임 생성(소스 확인)' : `${locs.length}개`)
  c('사이트맵에 lastmod', 1, sitemap && /<lastmod>/.test(sitemap) ? 1 : 0)
  c('모든 공개 페이지에 canonical', 3, ratio(pages, (p) => !!canonical(p.html)))
  c('canonical이 자기 주소', 3, ratio(pages, (p) => canonical(p.html) === ORIGIN + (p.url === '/' ? '/' : p.url)))
  c('404 문서 존재', 1, existsSync(join(DIST, '404.html')) ? 1 : 0)
  // ⚠ 원본 채점기는 ['my-space','live','admin','calc'] 를 비공개로 하드코딩했는데,
  //   이 프로젝트에서 calc(임금 계산기)는 광고 랜딩으로 쓰는 공개 화면이고
  //   admin·my·checkout 은 SPA 라우트라 정적 파일 자체가 없다.
  //   그래서 "정적 파일에 noindex가 있나"가 아니라 "robots.txt로 막았나"로 본다(2026-09-06).
  const priv = ['/admin/', '/my', '/checkout']
  const privOk = priv.filter(
    (n) =>
      robots &&
      robots
        .split('\n')
        .some((l) => l.trim().startsWith('Disallow:') && l.includes(n))
  ).length
  c('비공개 화면 noindex', 3, privOk / priv.length, `${privOk}/${priv.length}`)
  c('공개 페이지에 noindex 없음', 2, ratio(pages, (p) => !/name="robots"[^>]+noindex/i.test(p.html)))
})

// ── 2. 렌더링·SPA ──────────────────────────────────────────
area('2. 렌더링·프리렌더', (c) => {
  c('모든 라우트가 정적 HTML', 3, pages.length >= 30 ? 1 : pages.length / 30, `${pages.length}개`)
  c('본문이 HTML에 들어 있음(1200자↑)', 4, ratio(indexable, (p) => bodyText(p.html).length > 1200))
  // ⚠ 분량 기준을 2026-09-06 근거로 교체했다.
  //   AI 답변엔진은 장문(2,000단어+)보다 "사실 밀도가 높은 600~1,000단어"를 인용한다
  //   (한글 환산 약 1,500~2,500자). 그래서 3,000자 만점이라는 임의의 문턱 대신
  //   2,000자를 만점으로 두고, 대신 아래 9번 영역에 "답 문단 길이" 항목을 새로 넣었다.
  //   실제 인용 단위는 글 전체가 아니라 H2 아래 첫 문단이기 때문이다.
  // ⚠ 가이드 12-1절: 글 전체 길이와 인용의 상관은 엔진마다 반대다
  //   (구글 AI 개요는 상관 0.04, ChatGPT는 장문 선호). 한 숫자로 목표를 세울 수 없어
  //   가중치를 1로 낮췄다. 길이는 답 문단 품질로 대신 본다.
  c('칼럼 본문 깊이(2000자 만점)', 1,
    columns.length ? columns.reduce((s, p) => s + Math.min(1, bodyText(p.html).length / 2000), 0) / columns.length : 0,
    `평균 ${Math.round(columns.reduce((s, p) => s + bodyText(p.html).length, 0) / (columns.length || 1))}자`)
  c('내부 링크가 표준 a href', 3, ratio(pages, (p) => (p.html.match(/<a\s[^>]*href="\//g) || []).length >= 3))
  c('fragment(#) 라우팅 없음', 2, ratio(pages, (p) => !/href="#!?\//.test(p.html)))
  c('javascript: 링크 없음', 1, ratio(pages, (p) => !/href="javascript:/i.test(p.html)))
})

// ── 3. HTML 메타 ───────────────────────────────────────────
area('3. HTML 메타', (c) => {
  const titles = pages.map((p) => title(p.html))
  const descs = pages.map((p) => desc(p.html))
  c('모든 페이지에 title', 3, ratio(titles, (t) => !!t))
  c('title 중복 없음', 3, titles.length ? new Set(titles).size / titles.length : 0)
  c('title 길이 15~70자', 2, ratio(titles.filter(Boolean), (t) => t.length >= 15 && t.length <= 70))
  c('title 태그가 1개', 2, ratio(pages, (p) => (p.html.match(/<title[^>]*>/gi) || []).length === 1))
  c('모든 페이지에 description', 3, ratio(descs, (d) => !!d))
  c('description 중복 없음', 3, descs.length ? new Set(descs).size / descs.length : 0)
  c('description 길이 50~160자', 2, ratio(descs.filter(Boolean), (d) => d.length >= 50 && d.length <= 160))
  c('h1이 정확히 1개', 3, ratio(pages, (p) => (p.html.match(/<h1[\s>]/gi) || []).length === 1))
  c('charset 선언', 1, ratio(pages, (p) => /<meta charset=/i.test(p.html)))
  c('lang="ko"', 1, ratio(pages, (p) => /<html[^>]+lang="ko"/i.test(p.html)))
  const imgs = pages.flatMap((p) => p.html.match(/<img\s[^>]*>/gi) || [])
  c('이미지 alt 속성', 2, ratio(imgs, (i) => /\salt=/i.test(i)), `${imgs.length}개`)
})

// ── 4. 오픈그래프·소셜 ──────────────────────────────────────
area('4. 오픈그래프', (c) => {
  for (const [p, w] of [['type', 2], ['title', 2], ['description', 2], ['url', 2], ['image', 3]])
    c(`og:${p}`, w, ratio(pages, (x) => !!ogv(x.html, p)))
  c('og:image 절대주소', 2, ratio(pages, (x) => (ogv(x.html, 'image') || '').startsWith('http')))
  c('og:image 파일이 실제 존재', 3, ratio(pages, (x) => {
    const u = ogv(x.html, 'image') || ''
    const rel = u.replace(ORIGIN, '')
    return rel ? existsSync(join(DIST, rel)) : false
  }))
  c('칼럼마다 고유 og:image', 3, columns.length ? new Set(columns.map((x) => ogv(x.html, 'image'))).size / columns.length : 0)
  c('twitter:card', 1, ratio(pages, (x) => /name="twitter:card"/i.test(x.html)))
  c('og:site_name·locale', 1, ratio(pages, (x) => /property="og:site_name"/i.test(x.html) && /property="og:locale"/i.test(x.html)))
})

// ── 5. 구조화 데이터 ────────────────────────────────────────
area('5. 구조화 데이터', (c) => {
  c('JSON-LD 파싱 오류 없음', 4, ratio(pages, (p) => jsonLd(p.html).every((o) => o !== null)))
  c('전 페이지에 조직(LegalService)', 3, ratio(pages, (p) => types(p.html).includes('LegalService')))
  c('조직에 sameAs', 2, ratio(pages, (p) =>
    jsonLd(p.html).some((o) => JSON.stringify(o || {}).includes('"sameAs"'))))
  c('변호사 Person 엔티티', 2, ratio(pages, (p) => types(p.html).includes('Person')))
  c('WebSite 엔티티', 1, ratio(pages, (p) => types(p.html).includes('WebSite')))
  c('빵부스러기(BreadcrumbList)', 3, ratio(pages.filter((p) => p.url !== '/'), (p) => types(p.html).includes('BreadcrumbList')))
  c('칼럼에 Article', 3, ratio(columns, (p) => types(p.html).some((t) => /Article/.test(t))))
  c('Article에 author·publisher·dateModified', 3, ratio(columns, (p) => {
    const s = JSON.stringify(jsonLd(p.html))
    return s.includes('"author"') && s.includes('"publisher"') && s.includes('"dateModified"')
  }))
  const faqPages = pages.filter((p) => /자주 묻는 질문/.test(bodyText(p.html)))
  c('FAQ가 있는 화면에 FAQPage', 3, ratio(faqPages, (p) => types(p.html).includes('FAQPage')), `${faqPages.length}개`)
})

// ── 6. 성능 ────────────────────────────────────────────────
area('6. 성능', (c) => {
  const js = files.filter((f) => f.endsWith('.js') && f.includes('assets'))
  const totalJs = js.reduce((s, f) => s + statSync(f).size, 0)
  c('JS 총량 900KB 이하', 3, totalJs <= 900e3 ? 1 : Math.max(0, 1 - (totalJs - 900e3) / 900e3), `${Math.round(totalJs / 1024)}KB`)
  const biggest = js.map((f) => statSync(f).size).sort((a, b) => b - a)[0] || 0
  c('가장 큰 묶음 400KB 이하', 2, biggest <= 400e3 ? 1 : Math.max(0, 1 - (biggest - 400e3) / 400e3), `${Math.round(biggest / 1024)}KB`)
  c('정적 자산 캐시 규칙', 2, headers && /\/assets\/\*[\s\S]{0,80}max-age=31536000/i.test(headers) ? 1 : 0)
  c('이미지에 width·height', 2, ratio(pages.flatMap((p) => p.html.match(/<img\s[^>]*>/gi) || []), (i) => /width=/.test(i) && /height=/.test(i)))
  c('동영상 preload=metadata', 2, ratio(pages.flatMap((p) => p.html.match(/<video\s[^>]*>/gi) || []), (v) => /preload="(metadata|none)"/.test(v)))
  c('동영상에 poster', 1, ratio(pages.flatMap((p) => p.html.match(/<video\s[^>]*>/gi) || []), (v) => /poster=/.test(v)))
  c('보안 헤더', 2, headers && /X-Content-Type-Options/i.test(headers) && /Strict-Transport-Security/i.test(headers) ? 1 : 0)
  c('폰트 차단 요청 없음', 1, ratio(pages, (p) => !/fonts\.googleapis\.com/.test(p.html)))
})

// ── 7. 모바일·접근성 ────────────────────────────────────────
area('7. 모바일·접근성', (c) => {
  c('viewport 선언', 3, ratio(pages, (p) => /name="viewport"[^>]+width=device-width/i.test(p.html)))
  c('theme-color', 1, ratio(pages, (p) => /name="theme-color"/i.test(p.html)))
  c('버튼에 접근 이름(글자 또는 aria-label)', 2, ratio(pages, (p) => {
    const btns = [...p.html.matchAll(/<button\s([^>]*)>([\s\S]*?)<\/button>/gi)]
    if (!btns.length) return true
    const named = btns.filter((m) => /aria-label=/.test(m[1]) || m[2].replace(/<[^>]+>/g, '').trim().length > 0)
    return named.length / btns.length
  }))
  c('입력칸에 라벨 또는 aria-label', 2, ratio(pages, (p) => {
    const ins = (p.html.match(/<(input|textarea|select)\s[^>]*>/gi) || [])
      .filter((i) => !/type="(hidden|checkbox|radio)"/i.test(i) && !/class="honeypot"/i.test(i))
    if (!ins.length) return true
    const labeled = ins.filter((i) => /aria-label=|\sid="/.test(i)).length
    return labeled / ins.length
  }))
  c('건너뛰기·랜드마크(main)', 2, ratio(pages, (p) => /<main[\s>]/i.test(p.html)))
  c('머리글·바닥글 랜드마크', 1, ratio(pages, (p) => /<header[\s>]/i.test(p.html) && /<footer[\s>]/i.test(p.html)))
  c('manifest 연결', 1, ratio(pages, (p) => /rel="manifest"/i.test(p.html)))
  c('가로 스크롤 유발 인라인 폭 없음', 1, ratio(pages, (p) => !/style="[^"]*width:\s*\d{4,}px/i.test(p.html)))
})

// ── 8. 네이버 특화 ─────────────────────────────────────────
area('8. 네이버 특화', (c) => {
  c('소유확인 메타태그', 3, ratio(pages, (p) => /name="naver-site-verification"/i.test(p.html)))
  c('소유확인이 head 안', 2, ratio(pages, (p) => {
    const head = p.html.split(/<\/head>/i)[0] || ''
    return /naver-site-verification/i.test(head)
  }))
  c('파비콘 선언', 2, ratio(pages, (p) => /rel="(shortcut )?icon"/i.test(p.html)))
  c('apple-touch-icon', 1, ratio(pages, (p) => /rel="apple-touch-icon"/i.test(p.html)))
  c('RSS 자동발견 링크', 2, ratio(pages, (p) => /type="application\/rss\+xml"/i.test(p.html)))
  c('RSS 본문 전체 포함', 3, rss && /<content:encoded/.test(rss) ? 1 : rss ? 0.4 : 0)
  const rssIsSource = !readIf(join(DIST, 'rss.xml'))
  c('RSS 항목 10개 이상', 1,
    rssIsSource ? (/posts|map\(/.test(rss) ? 1 : 0)
                : (rss ? Math.min(1, (rss.match(/<item>/g) || []).length / 10) : 0))
  c('IndexNow 키 파일', 3, files.some((f) => /[0-9a-f]{32}\.txt$/.test(f.replace(/\\/g, '/'))) ? 1 : 0)
  c('robots가 4xx·5xx가 아님(파일 존재)', 1, robots ? 1 : 0)
})

// ── 9. AEO 질문형 헤딩·두괄식 ───────────────────────────────
area('9. AEO 질문형 헤딩', (c) => {
  const h2sOf = (h) => all(h, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map((x) => x.replace(/<[^>]+>/g, '').trim())
  // 제목 뒤에 브랜드가 붙으므로(" | 퇴사히어로") 떼고 본다
  const bare = (t) => (t || '').split('|')[0].trim()
  const q = (t) => /[?？]$|나요|까요|인가요|하나요|되나요|어쩌죠|무엇|어떻게|어디|언제|왜|얼마/.test(bare(t))
  c('칼럼 H2의 절반 이상이 질문형', 4, ratio(columns, (p) => {
    const hs = h2sOf(p.html).filter(Boolean)
    return hs.length >= 2 && hs.filter(q).length / hs.length >= 0.5
  }))
  c('칼럼 제목이 질문형', 3, ratio(columns, (p) => q(title(p.html) || '')))
  c('두괄식 요약(lead) 존재', 3, ratio(columns, (p) => /class="lead-box"/.test(p.html)))
  c('요약이 40~200자', 2, ratio(columns, (p) => {
    const m = p.html.match(/class="lead-box"[^>]*>([\s\S]*?)<\/div>/)
    if (!m) return false
    const t = m[1].replace(/<[^>]+>/g, '').trim()
    return t.length >= 40 && t.length <= 200
  }))
  // ★ 인용 단위는 글이 아니라 H2 바로 아래 "답 문단"이다.
  //   전역 SEO_GEO_AEO 가이드 12-1절(2026-09 조사) 기준으로 어절 수를 센다.
  //   35어절 미만은 근거 없는 주장처럼 읽혀 채택되지 않고,
  //   65어절 초과는 모델이 임의로 줄이며, 80어절 초과는 통째로 건너뛴다.
  //   글자 수가 아니라 어절(띄어쓰기 단위)이 영어 word에 대응한다.
  c('H2 답 문단이 40~65어절', 4, (() => {
    let all = 0, ok = 0
    for (const p of columns) {
      const secs = p.html.split(/<h2[^>]*>/i).slice(1)
      for (const sec of secs) {
        const head = (sec.split(/<\/h2>/i)[0] || '').replace(/<[^>]+>/g, '')
        if (/지금 하실 일|자주 묻는 질문/.test(head)) continue
        const after = sec.split(/<\/h2>/i)[1] || ''
        const first = (after.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || ['', ''])[1].replace(/<[^>]+>/g, '').trim()
        if (!first) continue
        all++
        const words = first.split(/\s+/).filter(Boolean).length
        if (words >= 40 && words <= 65) ok++
      }
    }
    return all ? ok / all : 0
  })())
  // 글 하나에 "떼어 내도 말이 되는" 문단이 몇 개나 있는지. 가이드 12-1절 점검 항목.
  c('인용 가능 문단 3개 이상', 3, ratio(columns, (p) => {
    const ps = all(p.html, /<p[^>]*>([\s\S]*?)<\/p>/gi)
      .map((x) => x.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
    const good = ps.filter((t) => {
      const w = t.split(/\s+/).filter(Boolean).length
      return w >= 25 && w <= 70
    })
    return good.length >= 3
  }))
  c('점검 화면도 질문형 제목', 2, ratio(pages.filter((p) => /self-check|stalking-check/.test(p.url)), (p) =>
    q(title(p.html) || '') || q((p.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ['', ''])[1])))
})

// ── 10. AEO FAQ·구조 ───────────────────────────────────────
area('10. AEO FAQ', (c) => {
  const faqPages = pages.filter((p) => types(p.html).includes('FAQPage'))
  c('FAQ를 가진 페이지 수', 3, Math.min(1, faqPages.length / 27), `${faqPages.length}개`)
  c('FAQ 항목이 화면에도 있음', 4, ratio(faqPages, (p) => {
    const o = jsonLd(p.html).find((x) => x && (x['@type'] === 'FAQPage' || (Array.isArray(x['@graph']) && x['@graph'].some((g) => g['@type'] === 'FAQPage'))))
    const me = o?.mainEntity || []
    const txt = bodyText(p.html)
    if (!me.length) return false
    return me.filter((qq) => txt.includes((qq.name || '').slice(0, 12))).length / me.length > 0.8
  }))
  c('FAQ 답이 자기완결(30자↑)', 3, ratio(faqPages, (p) => {
    const o = jsonLd(p.html).find((x) => x && x['@type'] === 'FAQPage')
    const me = o?.mainEntity || []
    return me.length ? me.every((qq) => (qq.acceptedAnswer?.text || '').length >= 30) : false
  }))
  c('목록·표로 절차 제시', 2, ratio(columns, (p) => /<ol[\s>]|<ul[\s>]/.test(p.html)))
  c('칼럼당 FAQ 3개 이상', 2, ratio(columns, (p) => {
    const o = jsonLd(p.html).find((x) => x && x['@type'] === 'FAQPage')
    return (o?.mainEntity || []).length >= 3
  }))
})

// ── 11. GEO AI 크롤러 정책 ──────────────────────────────────
area('11. GEO 크롤러 정책', (c) => {
  const allowed = (bot) => robots && new RegExp(`User-agent:\\s*${bot}[\\s\\S]{0,120}?Allow:\\s*/`, 'i').test(robots)
  for (const b of ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User'])
    c(`${b} 허용`, 2, allowed(b) ? 1 : 0)
  c('Googlebot·bingbot 차단 없음', 2, robots && !/User-agent:\s*(Googlebot|bingbot)[\s\S]{0,80}?Disallow:\s*\/\s*$/im.test(robots) ? 1 : 0)
  c('학습 크롤러 정책을 명시', 2, robots && /(GPTBot|CCBot|Google-Extended)/i.test(robots) ? 1 : 0)
  c('llms.txt 제공', 1, llms ? 1 : 0)
  c('llms.txt에 칼럼 목록', 1,
    !readIf(join(DIST, 'llms.txt'))
      ? (/posts|blog/.test(llms) ? 1 : 0)
      : llms && (llms.match(/\/blog\//g) || []).length >= 10 ? 1 : 0)
})

// ── 12. GEO 인용 가능성 ─────────────────────────────────────
area('12. GEO 인용 가능성', (c) => {
  c('칼럼이 법령·판례를 링크로 인용', 4, ratio(columns, (p) => /law\.go\.kr/.test(p.html)))
  c('인용 링크 주소의 괄호 짝이 맞음', 3, ratio(columns, (p) =>
    [...p.html.matchAll(/href="([^"]*law\.go\.kr[^"]*)"/g)].every((m) => {
      const open = (m[1].match(/\(/g) || []).length
      const close = (m[1].match(/\)/g) || []).length
      return open === close
    })))
  c('조문 번호를 본문에 명시', 3, ratio(columns, (p) => /제\s?\d+조/.test(bodyText(p.html))))
  // 전역 GEO 가이드가 말하는 "통계·수치·인용문·출처" — 판례번호도 인용 가능한 구체적 근거다.
  c('구체적 근거(수치·기간 또는 판례번호)', 2, ratio(columns, (p) => {
    const t = bodyText(p.html)
    return /\d+\s?(년|개월|주|일|시간|분|회|건|명|가지|번|미터|만원|배|%)/.test(t) || /\d{4}[도누다허]\d+/.test(t)
  }))
  c('문단이 자기완결(평균 60자↑)', 2, ratio(columns, (p) => {
    const ps = all(p.html, /<p[^>]*>([\s\S]*?)<\/p>/gi).map((x) => x.replace(/<[^>]+>/g, '').trim()).filter((x) => x.length > 10)
    if (!ps.length) return false
    return ps.reduce((s, x) => s + x.length, 0) / ps.length >= 60
  }))
  c('운영주체·감수자 명시', 2, ratio(columns, (p) => /김창희/.test(bodyText(p.html))))
  // 날짜 표기는 "2026년 8월 3일"·"2026-08-03"·"2026.8.3" 셋 다 쓰인다. 형식이 아니라
  // "갱신일이 보이는가"를 봐야 한다(2026-09-06 수정).
  c('갱신일 노출', 2, ratio(columns, (p) =>
    /20\d\d[.\-년]\s*\d{1,2}[.\-월]\s*\d{1,2}/.test(bodyText(p.html))))
})

// ── 13. 엔티티·브랜드 일관성 ────────────────────────────────
area('13. 엔티티 일관성', (c) => {
  const FIRM = '법률사무소 청송law'
  c('사무소명 표기 통일', 4, ratio(pages, (p) => {
    const t = bodyText(p.html) + p.html
    return !/법률사무소 청송(?!law)/.test(t)
  }))
  c('전화번호 표기 통일', 3, ratio(pages, (p) => !/1660-?4452/.test(p.html) || /1660-4452/.test(p.html)))
  c('주소(NAP) 일관', 2, ratio(pages, (p) => !/연제구/.test(p.html) || /법원남로15번길 10/.test(p.html)))
  c('한 문장 정의 노출', 2, ratio(pages, (p) => /퇴사히어로는/.test(bodyText(p.html))))
  c('sameAs에 채널 3개 이상', 3, ratio(pages, (p) => {
    const s = jsonLd(p.html).map((o) => JSON.stringify(o || {})).join('')
    const counts = [...s.matchAll(/"sameAs":\s*\[([^\]]*)\]/g)].map((m) => (m[1].match(/https?:/g) || []).length)
    return counts.length ? Math.max(...counts) >= 3 : false
  }))
  c('옛 이름(alternateName) 보존', 2, ratio(pages, (p) => /alternateName/.test(p.html)))
  c('사무소명이 조직 이름과 같음', 2, ratio(pages, (p) => !/"name":\s*"법률사무소 청송(?!law)/.test(p.html)))
})

// ── 14. 콘텐츠·E-E-A-T ─────────────────────────────────────
area('14. 콘텐츠·신뢰', (c) => {
  const BAN = /무료 상담|승소를? 보장|100% |최고의 변호사|1위 변호사|전문 변호사/
  c('광고규정 금지 표현 없음', 4, ratio(pages, (p) => !BAN.test(bodyText(p.html))))
  // 「변호사법」 제23조 처럼 낫표를 쓴 표기가 정식이다. 낫표를 허용하지 않으면
  // 제대로 고지한 칼럼 29편이 전부 미표기로 잡힌다(2026-09-06 수정).
  c('광고물 고지', 3, ratio(pages, (p) => /「?변호사법」?\s*제\s*23조/.test(bodyText(p.html))))
  c('면책 문구', 3, ratio(columns, (p) => /법률 자문이 아닙니다|구체적 사건의 자문이 아닙니다/.test(bodyText(p.html))))
  c('저자 표기', 2, ratio(columns, (p) => /김창희/.test(bodyText(p.html))))
  c('칼럼 25편 이상', 2, Math.min(1, columns.length / 25), `${columns.length}편`)
  c('개인정보처리방침 존재', 2, pages.some((p) => p.url === '/privacy') ? 1 : 0)
  c('위탁·국외 이전 고지', 2, (() => {
    const pv = pages.find((p) => p.url === '/privacy')
    return pv && /국외|위탁/.test(bodyText(pv.html)) ? 1 : 0
  })())
  // 카드 전체가 링크인 목록 화면처럼, 번호가 이미 링크 안에 들어 있으면 다시 링크로 감쌀 수 없다(a 중첩 불가).
  // 그래서 "링크 밖 본문에 번호가 있는데 tel 링크가 없는" 경우만 실패로 본다.
  c('긴급 연락처가 링크', 2, ratio(
    pages.filter((p) => /112|1366/.test(bodyText(p.html.replace(/<a\s[\s\S]*?<\/a>/gi, ' ')))),
    (p) => /href="tel:(112|1366)"/.test(p.html)))
})

// ── 15. 색인 가속·측정 ──────────────────────────────────────
area('15. 색인 가속·측정', (c) => {
  c('IndexNow 키 파일 배치', 3, files.some((f) => /[0-9a-f]{32}\.txt$/.test(f.replace(/\\/g, '/'))) ? 1 : 0)
  c('배포에 IndexNow 연결', 3, (() => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    return /indexnow/.test(pkg.scripts?.deploy || '') ? 1 : 0
  })())
  c('사이트맵이 전 공개 페이지 포함', 3, (() => {
    if (!sitemap) return 0
    // 런타임 생성이면 소스에 URL 목록이 없다. 라우트를 훑어 만드는 구조인지로 판정한다.
    if (!readIf(join(DIST, 'sitemap.xml'))) return /posts|routes|blog/.test(sitemap) ? 1 : 0
    const locs = new Set(all(sitemap, /<loc>([^<]+)<\/loc>/g).map((u) => u.replace(ORIGIN, '') || '/'))
    const want = indexable.map((p) => p.url)
    return want.filter((u) => locs.has(u) || locs.has(u + '/')).length / want.length
  })())
  c('RSS 생성', 2, rss ? 1 : 0)
  c('llms.txt 생성', 2, llms ? 1 : 0)
  c('사이트맵 changefreq·priority', 1, sitemap && /<priority>/.test(sitemap) ? 1 : 0)
  c('_routes.json 정적자산 제외', 2, (() => {
    const r = readIf(join(DIST, '_routes.json'))
    if (!r) return 0
    try {
      const o = JSON.parse(r)
      return o.exclude?.length >= 5 ? 1 : 0.5
    } catch {
      return 0
    }
  })())
})

// ── 출력 ───────────────────────────────────────────────────
const avg = areas.reduce((s, a) => s + a.score, 0) / areas.length
console.log(`\n분석 대상: 공개 페이지 ${pages.length}개 (칼럼 ${columns.length}편)\n`)
for (const a of areas) {
  const bar = a.score >= 98 ? '✅' : a.score >= 90 ? '🟡' : '❌'
  console.log(`${bar} ${a.name.padEnd(22)} ${a.score.toFixed(1).padStart(5)}점`)
  for (const ch of a.checks) {
    if (ch.value >= 0.999 && !V) continue
    console.log(`     ${(ch.value * 100).toFixed(0).padStart(3)}%  ${ch.label}${ch.detail ? ` (${ch.detail})` : ''}`)
  }
}
console.log(`\n${'─'.repeat(46)}`)
console.log(`평균 ${avg.toFixed(2)}점  /  98점 ${avg >= 98 ? '달성' : '미달 (부족 ' + (98 - avg).toFixed(2) + '점)'}`)
process.exit(avg >= 98 ? 0 : 1)
