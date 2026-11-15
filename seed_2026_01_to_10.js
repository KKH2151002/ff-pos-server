const mysql = require('mysql2/promise');

async function seedJanToOct2026() {
    const db = await mysql.createConnection({
        host: 'infodb.ansan.ac.kr',
        user: 'i2151002',
        password: 'khwjstk2@',
        database: 'db2151002_capstone'
    });

    console.log('Connected to db2151002_capstone (2026-01 ~ 2026-10 데이터 적재 시작)');

    // 기존 2026년 1월 ~ 10월 더미 데이터 초기화 (단, 2026-10-08 발표용 10시 20분 테스트 데이터가 있다면 덮어쓰고 깔끔한 월간 통계 구성)
    await db.execute("DELETE FROM disposal_logs WHERE disposed_at >= '2026-01-01 00:00:00' AND disposed_at <= '2026-10-31 23:59:59'");
    await db.execute("DELETE FROM inventory WHERE created_at >= '2026-01-01 00:00:00' AND created_at <= '2026-10-31 23:59:59'");

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pickWeighted(arr) {
        const totalWeight = arr.reduce((sum, item) => sum + item.orderWeight, 0);
        let r = Math.random() * totalWeight;
        for (const item of arr) {
            if (r < item.orderWeight) return item;
            r -= item.orderWeight;
        }
        return arr[arr.length - 1];
    }

    // 2026년 1월 ~ 10월 (10개월치) 계절별 인기/비인기 및 월간 목표 매출(80만원~120만원 사이) 설정
    const monthsConfig = [
        {
            // 2026-01 (한겨울 혹한기 & 동계방학): 온장/매콤 렌지업 초강세, 차가운 샌드위치/날치알 비수기
            year: 2026, month: 1, days: 31,
            minRev: 910000, maxRev: 980000,
            dailyCounts: { triangle: [8, 10], sandwich: [1, 3], gimbap: [2, 3], burger: [3, 4] },
            categories: {
                triangle: [
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 3.2, sellProb: 0.91 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.87 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.5, sellProb: 0.86 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.0, sellProb: 0.76 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.0, sellProb: 0.68 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.7, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.4, sellProb: 0.58 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.6, sellProb: 0.42 }
                ],
                gimbap: [
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 3.0, sellProb: 0.90 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 1.8, sellProb: 0.74 }
                ],
                burger: [
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 3.0, sellProb: 0.89 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.8, sellProb: 0.86 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.0, sellProb: 0.76 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.4, sellProb: 0.35 }
                ]
            }
        },
        {
            // 2026-02 (늦겨울~초봄 해빙기, 28일): 겨울 헤비 메뉴 피로도 발생, 산뜻한 참치마요/명란/샌드위치 반등 시작
            year: 2026, month: 2, days: 28,
            minRev: 830000, maxRev: 900000,
            dailyCounts: { triangle: [8, 10], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 4] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.6, sellProb: 0.86 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.2, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.6, sellProb: 0.78 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.6, sellProb: 0.72 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 3.0, sellProb: 0.60 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.8, sellProb: 0.88 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.0, sellProb: 0.82 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.2, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.70 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.2, sellProb: 0.82 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 1.0, sellProb: 0.85 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.6, sellProb: 0.65 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.4, sellProb: 0.60 }
                ]
            }
        },
        {
            // 2026-03 (봄 신학기 개강 & 봄나들이): 샌드위치 2종, 날치알명란, 묵은지김밥, 비프토마토버거 대폭발!
            year: 2026, month: 3, days: 31,
            minRev: 1050000, maxRev: 1130000,
            dailyCounts: { triangle: [8, 10], sandwich: [3, 4], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.8, sellProb: 0.94 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 3.0, sellProb: 0.92 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.6, sellProb: 0.89 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 1.8, sellProb: 0.75 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.4, sellProb: 0.58 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.9, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.2, sellProb: 0.94 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.4, sellProb: 0.90 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.4, sellProb: 0.62 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.2, sellProb: 0.80 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.0, sellProb: 0.52 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.8, sellProb: 0.44 }
                ]
            }
        },
        {
            // 2026-04 (완연한 봄 & 중간고사 기간, 30일): 봄 피크닉 강세 지속 + 시험기간 불닭콘치즈 반등
            year: 2026, month: 4, days: 30,
            minRev: 1000000, maxRev: 1070000,
            dailyCounts: { triangle: [8, 10], sandwich: [3, 4], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 3.0, sellProb: 0.90 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.89 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.2, sellProb: 0.88 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.4, sellProb: 0.83 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.4, sellProb: 0.76 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.7, sellProb: 0.46 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.2, sellProb: 0.91 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.6, sellProb: 0.86 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 3.0, sellProb: 0.89 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.2, sellProb: 0.64 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 3.0, sellProb: 0.88 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.2, sellProb: 0.78 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.8, sellProb: 0.54 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.44 }
                ]
            }
        },
        {
            // 2026-05 (대학 축제 & 야외 나들이 최성수기, 31일): 샌드위치/김밥/토마토버거 최고 호황
            year: 2026, month: 5, days: 31,
            minRev: 1100000, maxRev: 1170000,
            dailyCounts: { triangle: [8, 10], sandwich: [3, 4], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.8, sellProb: 0.87 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.6, sellProb: 0.87 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.2, sellProb: 0.80 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.5, sellProb: 0.68 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.6, sellProb: 0.42 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.2, sellProb: 0.93 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.8, sellProb: 0.89 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 3.0, sellProb: 0.92 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.4, sellProb: 0.74 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 3.0, sellProb: 0.90 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.0, sellProb: 0.72 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.9, sellProb: 0.68 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.40 }
                ]
            }
        },
        {
            // 2026-06 (초여름 폭염 시작 & 기말/방학 진입, 30일): 마요/명란/샌드위치 급락, 매콤 메뉴 급부상!
            year: 2026, month: 6, days: 30,
            minRev: 930000, maxRev: 990000,
            dailyCounts: { triangle: [8, 10], sandwich: [2, 4], gimbap: [2, 3], burger: [2, 4] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.93 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.8, sellProb: 0.86 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.74 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.2, sellProb: 0.55 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.6, sellProb: 0.46 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.7, sellProb: 0.52 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.62 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.4, sellProb: 0.50 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.85 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.6, sellProb: 0.88 }
                ],
                burger: [
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.4, sellProb: 0.90 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.8, sellProb: 0.82 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.8, sellProb: 0.62 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.7, sellProb: 0.45 }
                ]
            }
        },
        {
            // 2026-07 (한여름 장마 & 하계방학 비수기, 31일): 6월 통계 반영해 명란/마요B/유닛샌드위치 감축, 이열치열 매콤 집중
            year: 2026, month: 7, days: 31,
            minRev: 830000, maxRev: 890000,
            dailyCounts: { triangle: [8, 9], sandwich: [2, 2], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 3.4, sellProb: 0.92 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.8, sellProb: 0.88 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.0, sellProb: 0.76 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 0.8, sellProb: 0.54 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.8, sellProb: 0.58 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.5, sellProb: 0.35 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.0, sellProb: 0.68 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.8, sellProb: 0.46 }
                ],
                gimbap: [
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.90 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.89 }
                ],
                burger: [
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.6, sellProb: 0.84 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.2, sellProb: 0.65 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.50 }
                ]
            }
        },
        {
            // 2026-08 (늦여름 폭염 완화 & 개강 준비, 31일): 처서 이후 불고기버거/참치마요/서울엄마콩불 회복세
            year: 2026, month: 8, days: 31,
            minRev: 900000, maxRev: 960000,
            dailyCounts: { triangle: [8, 10], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 3.0, sellProb: 0.86 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.4, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.6, sellProb: 0.82 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.2, sellProb: 0.85 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.2, sellProb: 0.78 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.6, sellProb: 0.52 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.2, sellProb: 0.82 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.0, sellProb: 0.62 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.81 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.8, sellProb: 0.88 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.8, sellProb: 0.78 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.4, sellProb: 0.72 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.0, sellProb: 0.83 }
                ]
            }
        },
        {
            // 2026-09 (가을 2학기 개강 성수기, 30일): 참치마요 A/B, 불고기버거, 아이돌인기샌드위치, 묵은지김밥 고른 강세
            year: 2026, month: 9, days: 30,
            minRev: 1030000, maxRev: 1100000,
            dailyCounts: { triangle: [9, 10], sandwich: [2, 4], gimbap: [2, 3], burger: [2, 4] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 3.0, sellProb: 0.93 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.6, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.4, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.2, sellProb: 0.85 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 2.0, sellProb: 0.82 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.0, sellProb: 0.65 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.90 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.2, sellProb: 0.68 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.90 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.8, sellProb: 0.78 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.2, sellProb: 0.86 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.6, sellProb: 0.75 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 1.0, sellProb: 0.58 }
                ]
            }
        },
        {
            // 2026-10 (가을 성수기 & 1년 데이터 기반 최적 발주 완성형, 31일):
            // 작년 동월(2025-10, 90.6만원, 판매율 73.5%) 대비 1년 학습 효과로 판매율 ~86%, 매출 ~112만원 달성!
            year: 2026, month: 10, days: 31,
            minRev: 1090000, maxRev: 1160000,
            dailyCounts: { triangle: [9, 10], sandwich: [2, 4], gimbap: [2, 3], burger: [3, 4] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 3.0, sellProb: 0.94 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 3.0, sellProb: 0.93 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.6, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.4, sellProb: 0.89 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.8, sellProb: 0.84 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.8, sellProb: 0.68 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.2, sellProb: 0.72 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.90 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.0, sellProb: 0.82 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 3.0, sellProb: 0.92 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.4, sellProb: 0.87 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.8, sellProb: 0.80 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.6, sellProb: 0.55 }
                ]
            }
        }
    ];

    function generateMonthRows(mCfg) {
        const monthStr = String(mCfg.month).padStart(2, '0');
        const rows = [];
        let rev = 0;

        for (let day = 1; day <= mCfg.days; day++) {
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${mCfg.year}-${monthStr}-${dayStr}`;

            const dailyGroups = [
                { list: mCfg.categories.triangle, count: randInt(mCfg.dailyCounts.triangle[0], mCfg.dailyCounts.triangle[1]) },
                { list: mCfg.categories.sandwich, count: randInt(mCfg.dailyCounts.sandwich[0], mCfg.dailyCounts.sandwich[1]) },
                { list: mCfg.categories.gimbap, count: randInt(mCfg.dailyCounts.gimbap[0], mCfg.dailyCounts.gimbap[1]) },
                { list: mCfg.categories.burger, count: randInt(mCfg.dailyCounts.burger[0], mCfg.dailyCounts.burger[1]) }
            ];

            for (const group of dailyGroups) {
                for (let i = 0; i < group.count; i++) {
                    const item = pickWeighted(group.list);
                    const expHour = Math.random() < 0.5 ? 14 : 22;
                    const expHourStr = String(expHour).padStart(2, '0');
                    const barcode = `${item.id}${expHourStr}${dayStr}`;

                    const createdAt = `${dateStr} 07:${String(randInt(0, 59)).padStart(2, '0')}:00`;
                    const expDate = `${dateStr} ${expHourStr}:00:00`;

                    const isSold = Math.random() < item.sellProb;
                    let status = 'sold';
                    let salePrice = item.price;
                    let updatedAt = '';

                    if (isSold) {
                        const soldHour = randInt(8, expHour - 1);
                        const soldMin = String(randInt(0, 59)).padStart(2, '0');
                        updatedAt = `${dateStr} ${String(soldHour).padStart(2, '0')}:${soldMin}:00`;

                        if (expHour - soldHour === 1 && Math.random() < 0.45) {
                            salePrice = Math.floor(item.price * 0.5);
                        } else if (expHour - soldHour === 2 && Math.random() < 0.35) {
                            salePrice = Math.floor(item.price * 0.7);
                        }
                        rev += salePrice;
                    } else {
                        status = 'expired';
                        salePrice = null;
                        const dispMin = String(randInt(1, 25)).padStart(2, '0');
                        updatedAt = `${dateStr} ${expHourStr}:${dispMin}:00`;
                    }

                    rows.push([
                        barcode,
                        item.name,
                        expDate,
                        1,
                        status,
                        createdAt,
                        updatedAt,
                        salePrice
                    ]);
                }
            }
        }
        return { rows, rev };
    }

    const insertSql = `
        INSERT INTO inventory 
        (barcode, item_name, expiration_date, quantity, status, created_at, updated_at, sale_price)
        VALUES ?
    `;

    // 월별로 안전하게(1개월씩) 생성 및 목표 매출 범위(80만~120만 원 내) 검증 후 INSERT
    for (const mCfg of monthsConfig) {
        let attempt = 0;
        let result = generateMonthRows(mCfg);
        while ((result.rev < mCfg.minRev || result.rev > mCfg.maxRev) && attempt < 50) {
            result = generateMonthRows(mCfg);
            attempt++;
        }
        const ym = `${mCfg.year}-${String(mCfg.month).padStart(2, '0')}`;
        const [res] = await db.query(insertSql, [result.rows]);
        console.log(`[${ym}] ${res.affectedRows}개 적재 완료 (월 매출: ${result.rev.toLocaleString()}원)`);
    }

    // 폐기 내역 disposal_logs 동기화
    const logSql = `
        INSERT INTO disposal_logs (inventory_id, item_name, barcode, disposed_at)
        SELECT id, item_name, barcode, updated_at
        FROM inventory
        WHERE status = 'expired' 
          AND created_at >= '2026-01-01 00:00:00' 
          AND created_at <= '2026-10-31 23:59:59'
    `;
    const [logRes] = await db.query(logSql);
    console.log(`disposal_logs에 ${logRes.affectedRows}건 폐기 이력 동기화 완료 ✅`);

    // 전체 기간(2025-10 ~ 2026-10, 13개월) 월별 요약 출력
    const [summary] = await db.query(`
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m') as month,
            SUM(quantity) as total_in,
            SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) as sold_count,
            SUM(CASE WHEN status = 'expired' THEN quantity ELSE 0 END) as expired_count,
            ROUND(SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) / SUM(quantity) * 100, 1) as sales_rate,
            ROUND(SUM(CASE WHEN status = 'expired' THEN quantity ELSE 0 END) / SUM(quantity) * 100, 1) as disposal_rate,
            SUM(CASE WHEN status = 'sold' THEN IFNULL(sale_price, 0) ELSE 0 END) as total_revenue
        FROM inventory
        WHERE created_at >= '2025-10-01 00:00:00' AND created_at <= '2026-10-31 23:59:59'
        GROUP BY month
        ORDER BY month
    `);
    console.log('\n=== 2025-10 ~ 2026-10 전체 월별 통계 추이 ===');
    console.table(summary);

    await db.end();
}

if (require.main === module) {
    seedJanToOct2026().catch(console.error);
}
module.exports = seedJanToOct2026;
