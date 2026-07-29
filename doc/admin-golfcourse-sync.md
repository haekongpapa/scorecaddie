# 관리자 골프장 공공 데이터 업로드 설계 (화면 11. 관리자 - 골프장 Par 관리 목록)

data.go.kr의 골프장 인허가 정보 API를 이용해 `GolfCourse` 기본 정보(이름/주소/영업상태 등)를
일괄 등록/갱신하기 위한 처리 로직 설계. 관련 화면: `doc/pages.md` 11번. 관련 모델: `GolfCourse`.

**2026-07-20 정정**: 이전 버전 문서는 이 데이터셋이 파일데이터(다운로드 후 CSV 업로드)로만
제공된다고 잘못 판단했었음. 사용자가 실제 API 요청/응답 예시를 제공해 **실시간 Open API**임이
확인되어, CSV 업로드 방식을 걷어내고 서버가 직접 API를 호출하는 방식으로 전면 교체함.

## API 스펙 (사용자 제공, 2026-07-20 확인)

```
GET https://apis.data.go.kr/1741000/golf_courses/info
    ?serviceKey={PUBLIC_DATA_API_KEY}
    &pageNo={페이지 번호}
    &numOfRows={페이지당 건수}
    &returnType=json
    &cond[DAT_UPDT_PNT::GTE]={YYYYMMDDHHMMSS, "전체" 옵션 미선택 시에만}
    &cond[DAT_UPDT_PNT::LT]={YYYYMMDDHHMMSS, "전체" 옵션 미선택 시에만}
```

**증분 동기화 조건(2026-07-29 추가)**: "전체" 옵션(화면 체크박스, 기본 미선택)을 선택하지 않으면
`cond[DAT_UPDT_PNT::GTE]`(마지막 동기화 시각)/`cond[DAT_UPDT_PNT::LT]`(이번 조회 시각)를 함께
보내 그 사이에 데이터가 바뀐 레코드만 받아온다. "전체"를 선택하면 두 파라미터를 아예 붙이지 않고
전체 목록을 다시 받는다. 자세한 기준 시각 관리 방식은 아래 "최종 업데이트 표시 값의 출처" 절 참고.

`cond[SALS_STTS_CD::EQ]=01`(영업상태: 영업/정상)은 API 호출 조건에는 넣지 않기로 확정함
(2026-07-29, 사용자 결정) — 동기화 자체는 영업상태와 무관하게 공공데이터를 있는 그대로 받아
DB에 보존하고, 대신 화면에 골프장을 노출하는 조회 쿼리 쪽(`app/src/app/rounds/new/page.tsx`)에서
`businessStatus` 기준으로 필터링한다.

응답 구조: `response.header.resultCode`("0"=정상), `response.body.totalCount`(전체 건수),
`response.body.items.item`(배열 또는 단일 객체 — 아래 함정 참고).

주요 응답 필드와 우리 스키마(`GolfCourse`) 매핑:

| API 필드 | 의미 | 매핑 대상 |
|---|---|---|
| `BPLC_NM` | 사업장명(골프장명) | `name` (필수) |
| `MNG_NO` | 관리번호 | `externalMngNo` (필수, 매칭 키) |
| `OPN_ATMY_GRP_CD` | 개방자치단체코드 | `externalOrgCd` (필수, 매칭 키) |
| `ROAD_NM_ADDR` (없으면 `LOTNO_ADDR`) | 도로명/지번 주소 | `address` |
| `SALS_STTS_NM` | 영업상태명(예: "영업/정상") | `businessStatus` |
| `DTIL_TPBIZ_NM` | 세부업종명(예: "정규대중") | `subCategory` |
| `PBP_SE_NM` | 공공/민간 구분명(예: "사립") | `publicPrivate` |
| `CRD_INFO_X` / `CRD_INFO_Y` | 좌표정보(TM 중부원점, EPSG:5174) | `rawCoordX` / `rawCoordY` |

## 페이지네이션 전략

**선택: `numOfRows=100` 고정 페이지네이션, 페이지마다 즉시 DB upsert.** (한 번에 전체
`totalCount`만큼 요청하는 방식은 채택하지 않음)

이유:
- data.go.kr류 API는 대부분 `numOfRows` 상한이 있고(이 API의 정확한 상한은 미확인), 전체 건수를
  한 번에 요청하면 서버가 조용히 잘라서 응답하거나 에러를 낼 위험이 있음 — 데이터 누락을 못
  알아챌 수 있어 위험.
- 페이지 단위 처리는 부분 실패에 안전함(예: 5페이지째 네트워크 오류가 나도 1~4페이지는 이미
  DB에 반영된 채로 남음 — 전체 재시도 불필요).
- `totalCount`는 스냅샷일 뿐 계속 늘어날 수 있는데, 페이지네이션은 코드 변경 없이 자연스럽게
  대응됨.

**최적화**: `totalCount` 확인용 별도 호출을 만들지 않는다. 1페이지(`pageNo=1&numOfRows=100`)
응답 자체에 `totalCount`가 포함되어 있으므로, 그 값으로 `totalPages = Math.ceil(totalCount/100)`을
계산해 2페이지부터 이어서 순회한다. 현재 규모(약 650여 건 기준) 총 7회 호출로 전체 수집 가능.

**안전장치**: `totalCount` 이상치나 API 오작동으로 인한 과도한 호출을 막기 위해
`MAX_PAGES = 200`(최대 20,000건)으로 상한을 걸어둠(`route.ts` 참고). 실제 전국 골프장 수(수백 건
규모)를 감안하면 충분한 여유.

## 구현 시 함정(실제 응답 예시로 확인)

- **item이 배열이 아닐 수 있음**: 결과가 1건일 때 `items.item`이 배열이 아니라 단일 객체로 오는
  것은 이런 XML→JSON 변환형 공공 API에서 흔한 현상. `Array.isArray(item) ? item : [item]`으로
  방어(`normalizeItems()` 함수).
- **결과 0건일 때 `items`가 빈 문자열(`""`)로 올 수 있음** — 객체가 아니라 문자열이므로
  `items.item` 접근 전에 타입 체크 필요.
- 좌표값(`CRD_INFO_X/Y`)이 빈 문자열인 레코드가 실제로 존재함(예시 응답의 "노블레스CC&리조트").

## API

`POST /api/admin/golf-courses/sync` (요청 바디 없음 — 버튼 클릭이 곧 트리거)

### 처리 순서

1. **권한 검사**: 세션 없으면 401, `role !== ADMIN`이면 403
2. **키 확인**: `process.env.PUBLIC_DATA_API_KEY` 없으면 500
3. **1페이지 호출** → `totalCount` 획득 + 1페이지 아이템 즉시 upsert 처리
4. **2~totalPages 순차 호출** → 페이지마다 즉시 upsert. 한 페이지 요청이 실패하면 그 지점에서
   중단하고 그때까지의 결과를 반환(부분 성공 허용, 페이지 실패 목록에 사유 기록)
5. **좌표 변환**: `CRD_INFO_X`/`CRD_INFO_Y`(TM 중부원점)를 `lib/geo.ts`의 `convertTmToWgs84()`로
   WGS84 위경도로 변환(2026-07-20 추가, 아래 "좌표 변환" 절 참고)
6. **매칭/갱신**: `externalOrgCd`+`externalMngNo` 조합으로 기존 `GolfCourse` 조회
   - 있으면 `update`(이름/주소/영업상태/업태구분/공공민간구분/원본좌표/변환된 위경도 갱신) → `updatedCount++`
   - 없으면 `create`(변환 성공 시 `latitude`/`longitude` 채움, 실패 시 `needsGeocoding: true`) → `addedCount++`
7. **응답**: `{ totalCount, addedCount, updatedCount, skippedCount, errors[], lastUpdatedAt }`
8. 화면(11번)에서는 `addedCount`/`updatedCount`를 토스트로, `lastUpdatedAt`을 카드의 "최종 업데이트" 텍스트로 표시

## "최종 업데이트" 표시 값의 출처 (2026-07-29 변경)

전용 이력 테이블 `GolfCourseSyncLog`(`prisma/schema.prisma`)를 도입해 사용한다. 이전에는
`GolfCourse.externalOrgCd IS NOT NULL`인 레코드 중 `updatedAt`이 가장 최신인 값으로 근사했으나,
지오코딩 배치(`golf-course-geocode.ts`)도 같은 조건의 행(`latitude`/`longitude`/`needsGeocoding`)을
갱신해서 "마지막 동기화 실행 시각"보다 미래로 밀릴 수 있는 문제가 있었다 — 지오코딩을 돌리면
동기화를 안 했는데도 "최종 업데이트"가 갱신된 것처럼 보이고, 그 값을 그대로 `cond[DAT_UPDT_PNT::GTE]`
기준으로 쓰면 실제로 공공데이터가 바뀐 구간을 건너뛰어 조용히 데이터가 누락되는 버그로 이어질 수
있었다.

`GolfCourseSyncLog.startedAt`은 동기화 배치를 시작한 시각(KST)이며, **페이지네이션이 끝까지
완주됐을 때만** 새 레코드를 기록한다(`runGolfCourseSync()`). 중간에 페이지 요청이 실패해 멈췄으면
이번 배치 시작 시각을 체크포인트로 남기지 않고 예전 값을 그대로 유지 — 다음 실행이 놓친 구간을
자연스럽게 다시 커버하게 하기 위함(약간의 중복 재조회는 감수, 데이터 누락 방지가 우선).
체크포인트가 아예 없는 최초 실행(또는 최초 실행이 매번 실패해 하나도 못 쌓인 경우)에는 GTE 조건
없이(=사실상 전체) 한 번 받아오고, 정상 완주되면 그 시각이 다음 실행부터의 기준이 된다.
"전체" 옵션으로 실행한 경우에도 완주 시 체크포인트는 갱신된다(다음 증분 실행이 그 시점부터 이어짐).

## 좌표 변환 (TM 중부원점 EPSG:5174 → WGS84, 2026-07-20 추가)

행정안전부 골프장 API의 `CRD_INFO_X`/`CRD_INFO_Y`는 TM 중부원점(EPSG:5174, Bessel 타원체) 평면
좌표라 우리가 쓰는 WGS84 위경도와 원점·타원체·측지계가 전부 다르다. `app/src/lib/geo.ts`의
`convertTmToWgs84(rawX, rawY)`가 `proj4` 라이브러리로 투영 변환 + 측지계 이동(Bessel→WGS84,
`towgs84` 7-parameter)까지 한 번에 처리해 `{ lat, lng }`를 반환한다.

- 입력이 없거나 숫자로 파싱 안 되거나, 변환 결과가 대한민국 대략 범위(위도 32~39.5, 경도
  124~132)를 벗어나면 원본 좌표 이상치로 간주해 `null` 반환 → 이 경우 `latitude`/`longitude`는
  `null`로 남고 `needsGeocoding: true`로 표시됨(원본 API에 `CRD_INFO_X/Y` 자체가 비어있는
  소수 골프장이 여기 해당 — 예시 응답의 "노블레스CC&리조트" 등).
- **기존에 이미 동기화된 레코드도 자동으로 채워짐**: sync가 매번 전체 골프장을 다시 조회해서
  `update`하므로, 관리자가 "업로드" 버튼을 한 번 더 누르면 이 변환 로직이 기존 652건에도
  소급 적용된다 — 별도 백필 스크립트 불필요.
- 신규 의존성 `proj4`(+ 최신 버전은 자체 타입 내장이라 `@types/proj4` 불필요, WebSearch로 확인)를
  `package.json`에 추가함 — 샌드박스는 npm 레지스트리 접근이 안 돼 설치 검증 불가(기존
  `@auth/prisma-adapter` 때와 동일한 제약). `npx tsc --noEmit` 결과 `Cannot find module 'proj4'`
  에러 1건만 발생(예상된 것, 다른 신규 에러 없음) — **사용자가 로컬에서 `npm install` 후 재검증 필요**.

## 향후 보완 후보 (미확정)

- 주소 기반 지오코딩 폴백 — `CRD_INFO_X/Y`가 비어있어 좌표 변환이 안 되는 소수 골프장을 위해
  카카오 로컬 API 등 주소→좌표 API 추가 검토(신규 API 키 필요)
- 동시 페이지 요청(현재는 순차 호출) — 이 API의 rate limit 정책 미확인이라 우선 순차로 안전하게 구현, 속도가 문제되면 재검토
- 업로드 처리 이력을 남기는 별도 테이블(운영 부담 대비 감사 로그 필요해지면)
- `serviceKey`는 `.env`의 `PUBLIC_DATA_API_KEY`로 관리 — 원본 API 스펙이 담긴 텍스트 파일 등은 저장소에 포함하지 않도록 주의
