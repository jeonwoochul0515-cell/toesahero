# 업무보고 양식의 서식 정의를 재사용해 사직서 hwpx 3종을 생성한다
# 제목 문단의 secPr(용지설정)·pageNum run은 보존하고, 제목 표(tbl)만 제거해 가운데 정렬 제목으로 쓴다

from lxml import etree
import copy, zipfile, os, shutil, sys

sys.stdout.reconfigure(encoding="utf-8")
ln = lambda e: etree.QName(e.tag).localname

SRC = "original"
OUT_DIR = "out"

# 서식 상수 (header.xml 실측)
P_CENTER, P_LEFT = "17", "21"
C_TITLE, C_BODY = "14", "21"          # 20pt 문체부돋음체 / 15pt 휴먼명조

# (파일명, 제목, [(정렬, 텍스트), ...])  정렬: L=좌측, C=가운데, ''=빈줄
FORMS = [
    ("resignation-basic.hwpx", "사 직 서", [
        ("L", "소속 : (부서명)"),
        ("L", "직위 : (직급)"),
        ("L", "성명 : (이름)"),
        ("", ""),
        ("L", "위 본인은 개인 사정으로 인하여 [    년   월   일]부로 퇴직하고자"),
        ("L", "하오니 사직을 허가하여 주시기 바랍니다."),
        ("", ""),
        ("L", "퇴직 예정일 : [    년   월   일]"),
        ("", ""),
        ("", ""),
        ("C", "[    년   월   일]"),
        ("", ""),
        ("C", "성명 :                    (인)"),
        ("", ""),
        ("", ""),
        ("L", "○ ○ ○  귀중"),
    ]),
    ("resignation-immediate.hwpx", "사 직 서", [
        ("C", "(즉시 퇴직 요청)"),
        ("", ""),
        ("L", "소속 : (부서명)"),
        ("L", "직위 : (직급)"),
        ("L", "성명 : (이름)"),
        ("", ""),
        ("L", "위 본인은 부득이한 사정으로 인하여 본 사직서 제출일로부터 즉시"),
        ("L", "퇴직하고자 합니다. 「민법」 제660조에 따라 사용자의 승낙이 없더라도"),
        ("L", "통고 후 1개월이 경과하면 사직의 효력이 발생함을 알려드리며, 원만한"),
        ("L", "인수인계를 위해 최대한 협조하겠습니다."),
        ("", ""),
        ("L", "제출일 : [    년   월   일]"),
        ("", ""),
        ("", ""),
        ("C", "[    년   월   일]"),
        ("", ""),
        ("C", "성명 :                    (인)"),
        ("", ""),
        ("", ""),
        ("L", "○ ○ ○  귀중"),
    ]),
    ("resignation-recommended.hwpx", "권고사직 확인서", [
        ("C", "(겸 사직서)"),
        ("", ""),
        ("L", "소속 : (부서명)"),
        ("L", "직위 : (직급)"),
        ("L", "성명 : (이름)"),
        ("", ""),
        ("L", "본인은 [    년   월   일] 회사(○○○)로부터 권고사직을 제안받았으며,"),
        ("L", "이를 수용하여 [    년   월   일]부로 퇴직합니다."),
        ("", ""),
        ("L", "본 퇴직은 본인의 자발적 의사가 아니라 회사 측의 권고에 따른 것임을"),
        ("L", "명확히 하며, 이직확인서 작성 시 이직사유를 \"회사의 권고에 의한 이직\""),
        ("L", "으로 기재하여 줄 것을 요청합니다."),
        ("", ""),
        ("", ""),
        ("C", "[    년   월   일]"),
        ("", ""),
        ("C", "성명 :                    (인)"),
        ("", ""),
        ("C", "회사 확인(서명) :                    "),
        ("", ""),
        ("", ""),
        ("L", "○ ○ ○  귀중"),
    ]),
]


def remove_own_lineseg(p):
    for c in list(p):
        if ln(c) == "linesegarray":
            p.remove(c)


def build(out_name, title, lines):
    tree = etree.parse(os.path.join(SRC, "Contents/section0.xml"))
    sec = next(e for e in tree.getroot().iter() if ln(e) == "sec")
    kids = list(sec)

    # --- 본문 참조 문단: [14] (paraPr=21 LEFT, charPr=21 휴먼명조 15pt) ---
    ref_body = copy.deepcopy(kids[14])

    # --- 제목 문단 [0]: tbl만 제거하고 같은 run의 t에 제목을 넣는다 ---
    title_p = kids[0]
    runs_before = sum(1 for c in title_p if ln(c) == "run")
    tbl_removed = 0
    for r in [c for c in title_p if ln(c) == "run"]:
        for c in list(r):
            if ln(c) == "tbl":
                r.remove(c)
                tbl_removed += 1
                r.set("charPrIDRef", C_TITLE)
                t = next((x for x in r if ln(x) == "t"), None)
                assert t is not None, "제목 run에 t 노드 없음"
                t.text = title
    assert tbl_removed == 1, f"제목 표 제거 실패({tbl_removed})"
    runs_after = sum(1 for c in title_p if ln(c) == "run")
    assert runs_before == runs_after, f"run 수 변동 {runs_before}→{runs_after} (secPr 훼손 위험)"
    title_p.set("paraPrIDRef", P_CENTER)
    remove_own_lineseg(title_p)

    # --- 제목 이후 모든 문단 제거 후 사직서 본문 삽입 ---
    for ch in kids[1:]:
        sec.remove(ch)

    def make_p(align, text):
        p = copy.deepcopy(ref_body)
        remove_own_lineseg(p)
        runs = [c for c in p if ln(c) == "run"]
        for r in runs[1:]:
            p.remove(r)
        r0 = runs[0]
        r0.set("charPrIDRef", C_BODY)
        t = next((x for x in r0 if ln(x) == "t"), None)
        assert t is not None
        t.text = text
        p.set("paraPrIDRef", P_CENTER if align == "C" else P_LEFT)
        return p

    # 제목 아래 여백 2줄
    body = [("", ""), ("", "")] + lines
    for align, text in body:
        sec.append(make_p(align, text))

    # --- 저장 ---
    work = f"_work_{out_name}"
    if os.path.exists(work):
        shutil.rmtree(work)
    shutil.copytree(SRC, work)
    tree.write(os.path.join(work, "Contents/section0.xml"),
               xml_declaration=True,
               encoding=tree.docinfo.encoding or "UTF-8",
               standalone=tree.docinfo.standalone)

    # 미리보기 텍스트도 갱신 (안 하면 옛 양식 문구가 미리보기에 남는다)
    prv = os.path.join(work, "Preview/PrvText.txt")
    if os.path.exists(prv):
        with open(prv, "w", encoding="utf-8") as f:
            f.write(title + "\n\n" + "\n".join(t for _, t in lines if t))

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, out_name)
    with zipfile.ZipFile(out_path, "w") as zf:
        zf.write(os.path.join(work, "mimetype"), "mimetype", compress_type=zipfile.ZIP_STORED)
        for dp, _, fns in os.walk(work):
            for fn in fns:
                fp = os.path.join(dp, fn)
                arc = os.path.relpath(fp, work).replace("\\", "/")
                if arc == "mimetype":
                    continue
                zf.write(fp, arc, compress_type=zipfile.ZIP_DEFLATED)
    shutil.rmtree(work)
    return out_path


print("=== 생성 ===")
made = []
for name, title, lines in FORMS:
    p = build(name, title, lines)
    made.append(p)
    print(f"  ✓ {p}  ({os.path.getsize(p):,} bytes)")

print("\n=== 검증 ===")
for p in made:
    with zipfile.ZipFile(p) as zf:
        assert zf.testzip() is None, f"{p} ZIP 손상"
        names = zf.namelist()
        assert names[0] == "mimetype", f"{p} mimetype이 첫 항목이 아님"
        assert zf.getinfo("mimetype").compress_type == zipfile.ZIP_STORED, "mimetype 압축됨"
        t = etree.parse(zf.open("Contents/section0.xml"))
        sec = next(e for e in t.getroot().iter() if ln(e) == "sec")
        # 용지설정 보존 확인
        assert any(ln(x) == "secPr" for x in sec.iter()), f"{p} secPr 소실"
        texts = [x.text for x in sec.iter() if ln(x) == "t" and x.text and x.text.strip()]
        # 양식 자리표시 잔존 검사
        BAD = ["휴먼명조", "헤드라인", "중고딕", "홍길동", "홍길순", "업무보고", "작은 제목", "문체부"]
        left = [t2 for t2 in texts for b in BAD if b in t2]
        assert not left, f"{p} 자리표시 잔존: {left}"
        print(f"  ✓ {os.path.basename(p)}  문단 {len(texts)}개  secPr 보존  자리표시 없음")
        print(f"      첫 줄: {texts[0]}")
