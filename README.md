# StoneAge Duel

스톤에이지 듀얼 인원용 홈페이지입니다.

현재 포함된 기능:

- 비밀번호 입력 후 입장
- 펫 검색
- 페트 이미지 표시
- 이름 / 속성 / 성장률 / 탑승 여부 필터
- Enter 키 검색

## 기본 비밀번호

기본 비밀번호는 `stoneage` 입니다.

`js/app.js` 상단의 `SITE_PASSWORD_HASH` 값을 바꾸면 비밀번호를 변경할 수 있습니다.

브라우저 콘솔에서 아래 코드를 실행하면 새 비밀번호의 SHA-256 해시를 만들 수 있습니다.

```js
async function makeHash(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
makeHash("새비밀번호").then(console.log);
```
