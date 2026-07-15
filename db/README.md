# ScoreCaddie 로컬 DB (PostgreSQL, Docker Compose)

## 사전 준비
- Docker Desktop 설치 (https://www.docker.com/products/docker-desktop) 후 실행

## 실행
```
cd db
docker compose up -d
```
정상 기동 확인: `docker compose ps` → postgres 컨테이너 상태가 `healthy` 인지 확인

## 접속 정보
| 항목 | 값 |
|---|---|
| Host | localhost |
| Port | 5432 |
| User | scorecaddie |
| Password | scorecaddie_local_pw |
| Database | scorecaddie |

`app/.env` 의 DATABASE_URL이 이 값과 자동으로 맞춰져 있습니다:
```
DATABASE_URL="postgresql://scorecaddie:scorecaddie_local_pw@localhost:5432/scorecaddie"
```

## GUI로 DB 보기 (선택)
```
docker compose --profile tools up -d
```
브라우저에서 http://localhost:5050 접속 (admin@scorecaddie.local / admin), 서버 등록 시 Host를 `postgres` (컨테이너명)로 입력.

## 종료 / 초기화
```
docker compose down        # 컨테이너만 종료, 데이터는 유지
docker compose down -v     # 데이터까지 완전 삭제
```
