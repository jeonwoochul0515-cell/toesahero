// 카카오톡·인스타 같은 앱 안에서 열린 브라우저를 빠져나와 진짜 브라우저로 다시 연다.
//
// 왜 필요한가. 앱 안에 딸린 브라우저는 반쪽짜리다.
//   · 영상 자동재생이 막힌다 — 우리 첫 화면이 영상이라 그냥 검은 칸만 보인다.
//   · tel: 전화 걸기가 안 먹는 기종이 있다. 손님이 번호를 눌러도 아무 일이 없다.
//   · 저장소가 따로 놀아서 방문·전화 집계가 어긋나고, 상담창 대화도 이어지지 않는다.
//   · 주소창이 없어 손님이 "여기가 어디인지" 확인할 수 없다.
//
// 지킬 것.
//   · 한 번만 시도한다. 밖에서 열렸는데 또 시도하면 창이 계속 튄다.
//   · 실패해도 아무 일 없어야 한다. 못 빠져나가면 그냥 그 자리에서 보면 된다.
//   · 화면을 다 읽은 뒤에 넘긴다. <head>에서 바로 넘기면 넘기기 실패 때 빈 흰 화면만 남는다
//     (2026-11-07 퇴사히어로 사고 — 안드로이드 네이버 앱·카카오톡에서 화면이 통째로 비었다).
//   · 네이버 앱은 넘기지 않는다(2026-11-07 대표 결정). 네이버 광고 손님 대부분이 거기서 오고,
//     앱 브라우저로도 폼·전화가 된다.
//   · 아이폰에서 카카오톡 말고 다른 앱은 방법이 없다(애플이 막아 둔다). 그건 포기한다.
(function () {
  var ua = navigator.userAgent || '';
  var here = window.location.href;

  // 같은 방문에서 한 번만
  try {
    if (sessionStorage.getItem('jbj.out')) return;
  } catch (e) {}

  var isKakao = /KAKAOTALK/i.test(ua);
  // 네이버 앱(NAVER(inapp)은 일부러 뺐다 — 위 "지킬 것" 참고.
  var isOtherApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|kakaostory/i.test(ua);
  if (!isKakao && !isOtherApp) return;

  // 기록을 못 남기면 넘기지 않는다. 크롬이 없는 폰에서 같은 주소로 되돌아와 끝없이 다시 넘기게 된다.
  try {
    sessionStorage.setItem('jbj.out', '1');
  } catch (e) {
    return;
  }

  function go() {
    // 카카오톡은 밖으로 여는 길을 열어 두었다. 아이폰·안드로이드 모두 된다.
    if (isKakao) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(here);
      return;
    }
    // 안드로이드는 크롬으로 넘긴다. 크롬이 없으면 같은 주소에 그대로 머문다.
    if (/Android/i.test(ua)) {
      var bare = here.replace(/^https?:\/\//, '');
      window.location.href =
        'intent://' + bare + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(here) + ';end';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
