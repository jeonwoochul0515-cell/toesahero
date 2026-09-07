// 칼럼마다 고유 공유 이미지(og:image)를 만든다 — 웹툰 컷을 배경으로 깔고 제목을 얹는다.
// puppeteer는 전역 도구(tools/headless-tools)의 것을 빌려 쓴다(프로젝트에 추가 금지, 전역 CLAUDE.md §11).
import { createRequire } from 'module'
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
const require = createRequire('C:/Users/jeonw/tools/headless-tools/package.json')
const puppeteer = require('puppeteer')

const PROJ = 'C:/Users/jeonw/.antigravity/퇴사히어로/design_handoff_toesahero'
const OUT = join(PROJ, 'public/og')
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

// 제목·slug는 프리렌더 데이터에서 가져온다(Firestore 원본과 같은 값)
const s = readFileSync(join(PROJ, 'src/generated/posts.ts'), 'utf8')
const start = s.indexOf('= [', s.indexOf('PRERENDERED_POSTS')) + 2
const posts = JSON.parse(s.slice(start, s.lastIndexOf(']') + 1))

const b64 = (p) => 'data:image/jpeg;base64,' + readFileSync(p).toString('base64')

function firstWebtoon(body) {
  const m = body.match(/^:::웹툰\s*\n([^\n]*)/m)
  if (!m) return null
  const g = m[1].match(/@([a-z0-9-]+)\s*$/i)
  return g ? g[1] : null
}

const html = (title, imgData) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Malgun Gothic','맑은 고딕',sans-serif;background:#fbf7ef;overflow:hidden;position:relative}
.art{position:absolute;right:0;top:0;width:520px;height:630px;object-fit:cover;object-position:center top}
.fade{position:absolute;right:500px;top:0;width:160px;height:630px;background:linear-gradient(90deg,#fbf7ef 20%,rgba(251,247,239,0))}
.wrap{position:absolute;left:0;top:0;width:760px;height:630px;padding:64px 40px 56px 64px;display:flex;flex-direction:column;justify-content:space-between;z-index:2}
.tag{display:inline-block;background:#f2c14e;color:#241c15;font-size:26px;font-weight:700;padding:10px 22px;border:3px solid #241c15;border-radius:999px;align-self:flex-start}
h1{font-size:${title.length > 34 ? 50 : title.length > 24 ? 58 : 66}px;line-height:1.28;color:#241c15;font-weight:800;letter-spacing:-1px;word-break:keep-all}
.foot{font-size:27px;color:#6f665a;font-weight:600}
.foot b{color:#e07856}
.bar{position:absolute;left:0;bottom:0;width:100%;height:14px;background:#e07856;z-index:3}
</style></head><body>
${imgData ? `<img class="art" src="${imgData}"><div class="fade"></div>` : ''}
<div class="wrap">
  <span class="tag">퇴사히어로</span>
  <h1>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
  <div class="foot"><b>법률사무소 청송law</b> · 담당변호사 김창희</div>
</div>
<div class="bar"></div>
</body></html>`

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
let n = 0
for (const p of posts) {
  const cut = firstWebtoon(p.body || '')
  const imgPath = cut ? join(PROJ, 'public/webtoon', cut + '.jpg') : null
  const imgData = imgPath && existsSync(imgPath) ? b64(imgPath) : null
  await page.setContent(html(p.title, imgData), { waitUntil: 'load' })
  await page.screenshot({ path: join(OUT, p.slug + '.jpg'), type: 'jpeg', quality: 84 })
  n++
  process.stdout.write(`\r${n}/${posts.length}`)
}
await browser.close()
console.log(`\n공유 이미지 ${n}장 → public/og/`)
