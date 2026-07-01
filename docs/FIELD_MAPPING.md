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
| 이자 | `project.interest` | 필요 시 입력 |

## 운영비 실적 총괄표

| 양식 항목 | 앱 계산 |
|---|---|
| 연구 활동비 | `sum(category == research)` |
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
- 해외 결제 시 외화 영수증
- 해외 결제 시 국내 카드사 원화 이용 전표

## 업무협의회비 지출 세부내역

대상: `category == meeting`

| 양식 컬럼 | 앱 필드 |
|---|---|
| 순번 | 자동 |
| 예산 구분 | 업무협의회비 |
| 지출 일자 | `date` |
| 세부 내역 | `description` |
| 소요 예산 | `amount` |

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
- 직접성 경비: `3-01`, `3-02`
- 업무협의회비: `4-01`, `4-02`

정산서 양식 번호와 실제 항목 순서가 확정되면 조정한다.
