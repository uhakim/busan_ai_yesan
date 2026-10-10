# 정산서 양식 필드 매핑

원본 양식: `references/정산서_이름_학교_동아리명.pptx`

## 표지

| 양식 필드 | 앱 필드 | 메모 |
|---|---|---|
| 학교명 | `project.school` | 기본값 필요 |
| 학교장 성명 | `project.principalName` | 최종 출력 전 입력 |
| 학교 주소 | `project.schoolAddress` | 선택 |
| 학교 대표 전화 번호 | `project.schoolPhone` | 선택 |
| 담당자 성명 | `project.managerName` | 유하님 또는 총무 |
| 휴대전화 | `project.managerPhone` | 선택 |
| 이메일 주소 | `project.managerEmail` | 선택 |
| 운영비 | `project.totalBudget` | 2,000,000 |
| 집행액 | `sum(entries.amount)` | 승인/확인된 건만 |
| 집행잔액 | `totalBudget - spent` | 자동 계산 |
| 지급완료액 | `sum(entries.amount where paid == true)` | 실제 회원 통장 지급 완료 기준 |
| 미지급액 | `sum(entries.amount where paid != true)` | 접수되었지만 아직 지급하지 않은 금액 |
| 실지급 잔액 | `totalBudget - paid` | 통장에서 아직 나가지 않은 금액 기준 |
| 이자 | `project.interest` | 필요 시 입력 |

## 운영비 실적 총괄표

| 양식 항목 | 앱 계산 |
|---|---|
| 연구 활동비 | `sum(category == research)` |
| 연수 운영비 | `sum(category == training)` |
| 직접성 경비 | `sum(category == direct)` |
| 업무 협의회비 | `sum(category == meeting)` |
| 합계 | 전체 합계 |

## 연구활동비 지출 세부내역

대상: `category == research`

| 양식 컬럼 | 앱 필드 |
|---|---|
| 순번 | 자동 |
| 예산 구분 | 연구활동비 |
| 지출 일자 | `date` |
| 세부 내역 | `description` |
| 소요 예산 | `amount` |
| 지급 상태 | `paid`, `paidDate` |

필요 증빙:

- 확인서
- 결과물
- 계좌이체 확인증
- 수당 지급 기준

## 직접성 경비 지출 세부내역

대상: `category == direct`

| 양식 컬럼 | 앱 필드 |
|---|---|
| 순번 | 자동 |
| 예산 구분 | 직접성 경비 |
| 지출 일자 | `date` |
| 세부 내역 | `description` |
| 소요 예산 | `amount` |
| 지급 상태 | `paid`, `paidDate` |

추가 필드:

- `itemName`
- `vendor`
- `unit`
- `quantity`
- `unitPrice`
- `paymentMethod`
- `evidenceNo`

필요 증빙:

- 구매내역서
- 카드 영수증 또는 계좌이체 확인증
- 해외 결제 시 AI 서비스 영수증(외화영수증)
- 해외 결제 시 국내 카드사 원화 이용 전표

## 연수 운영비 지출 세부내역

대상: `category == training`

| 양식 컬럼 | 앱 필드 |
|---|---|
| 순번 | 자동 |
| 예산 구분 | 연수 운영비 |
| 지출 일자 | `date` |
| 세부 내역 | `description` |
| 소요 예산 | `amount` |
| 지급 상태 | `paid`, `paidDate` |

필요 증빙:

- 상세 품목·단가가 적힌 지출 내역서
- 신용카드 매출전표 또는 세금계산서

## 업무협의회비 지출 세부내역

대상: `category == meeting`

| 양식 컬럼 | 앱 필드 |
|---|---|
| 순번 | 자동 |
| 예산 구분 | 업무협의회비 |
| 지출 일자 | `date` |
| 세부 내역 | `description` |
| 소요 예산 | `amount` |
| 지급 상태 | `paid`, `paidDate` |

필요 증빙:

- 신용카드 영수증
- 협의록
- 일시
- 장소
- 주제
- 내용
- 참석자 명단
- 사진

## 증빙번호 규칙

초안:

- 연구활동비: `1-01`, `1-02`
- 연수 운영비: `2-01`, `2-02`
- 직접성 경비: `3-01`, `3-02`
- 업무협의회비: `4-01`, `4-02`

정산서 양식 번호와 실제 항목 순서가 확정되면 조정한다.

## 협의회 기록과 한글 출력

entry.meeting의 startTime, endTime, location, topic, content, attendees, absent를 기록한다. attendees는 쉼표 또는 줄바꿈으로 구분한다. DB 저장 시 notes에 __ai_club_notes_v1__: + {notes, meeting} JSON으로 직렬화하며, 읽을 때 분리한다. DB 열 추가 없이 기존 자료를 유지한다.

HWPX 출력은 기존 정산서의 표지/실적 총괄표/예산별 지출 표 필드를 한글 표로 구성한다. 기존 PPTX의 화면 배치를 그대로 변환한 파일은 아니다. 협의록 HWPX가 첨부되어 있으면 해당 원본 본문·표·사진을 합치고, 미첨부이면 입력한 협의회 기록으로 협의록을 생성한다. 증빙은 지출 건별로 연결한다.
