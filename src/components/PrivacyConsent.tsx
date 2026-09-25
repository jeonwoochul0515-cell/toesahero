// 성함·연락처를 받는 폼 공용 개인정보 수집·이용 동의(필수) 체크박스 — 항목·목적·보유기간·처리방침 링크
type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // 결제 화면처럼 이용약관도 함께 보여야 하는 곳
  withTerms?: boolean;
  // 어두운 카드 위에 놓일 때
  dark?: boolean;
};

export function PrivacyConsent({ checked, onChange, withTerms, dark }: Props) {
  return (
    <div className={dark ? "privacy-consent dark" : "privacy-consent"}>
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <strong>(필수)</strong> 개인정보 수집·이용에 동의합니다.
        </span>
      </label>
      <ul>
        <li>수집 항목: 성함, 휴대전화 번호, 이 화면에 입력하신 내용</li>
        <li>목적: 변호사의 상담 회신과 사건 검토</li>
        <li>보유 기간: 상담 종료 후 1년(위임하시면 위임 종료 후 5년)</li>
      </ul>
      <p>
        동의하지 않으실 수 있으나, 그러면 접수가 되지 않습니다.{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          개인정보처리방침
        </a>
        {withTerms && (
          <>
            {" · "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              이용약관
            </a>
          </>
        )}
      </p>
    </div>
  );
}
