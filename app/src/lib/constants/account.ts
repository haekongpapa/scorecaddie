// 회원 탈퇴 시 소셜 전용 계정(비밀번호 없음)의 본인 확인용 문구.
// app/src/app/api/me/route.ts(서버)와 app/src/components/DeleteAccountForm.tsx(클라이언트)
// 양쪽에서 이 값을 그대로 가져다 써서 한쪽만 바뀌는 실수를 방지한다. (2026-08-07 신규)
export const DELETE_ACCOUNT_CONFIRM_PHRASE = "탈퇴합니다";
