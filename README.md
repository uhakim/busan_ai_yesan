# AI Club Settlement Helper

2026 AI 디지털 교사 동아리 정산을 쉽게 처리하기 위한 로컬 웹앱 기획 폴더.

목표는 선생님들이 영수증과 지출 정보를 쉽게 제출하고, 유하님이 마지막에 정산서 양식에 맞는 출력물을 자동 생성하는 것이다.

## Files

- `docs/DESIGN.md` - 전체 제품 설계와 화면 흐름
- `docs/FIELD_MAPPING.md` - 정산서 양식에 들어갈 필드 매핑
- `docs/CORELAB_REFERENCE_NOTES.md` - CORE LAB 사이트에서 참고할 만한 기능 분석
- `references/정산서_이름_학교_동아리명.pptx` - Padlet에서 내려받은 정산서 원본 양식
- `references/corelab-settlement-report.xlsx` - CORE LAB 사이트 정산보고서 다운로드 샘플

## First Build Target

1차 버전은 외부 서버 없이 로컬 브라우저에서 실행하는 단일 웹앱으로 만든다.

- 선생님 제출 화면
- 관리자 확인 화면
- 예산 현황 대시보드
- 최종 정산서 인쇄/PDF 출력 화면
- JSON 내보내기/가져오기

개인정보와 금융정보가 포함되므로 초기 버전은 공개 웹 배포를 피하고 로컬 실행을 기본값으로 둔다.
