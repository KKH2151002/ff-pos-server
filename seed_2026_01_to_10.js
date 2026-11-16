const mysql = require('mysql2/promise');
const addNewProducts = require('./add_new_products.js');

async function seedFullYearWithNewProducts() {
    // 1. 먼저 신규 4종 상품이 products_master와 orders에 등록되어 있도록 보장
    await addNewProducts();

    const db = await mysql.createConnection({
        host: 'infodb.ansan.ac.kr',
        user: 'i2151002',
        password: 'khwjstk2@',
        port: 3306,
        database: 'db2151002_capstone'
    });

    console.log('Connected to db2151002_capstone (신규 4종 포함 2025-10 ~ 2026-10 전체 통계 데이터 적재 시작)');

    // 2025-10 ~ 2026-10 기간의 기존 통계 데이터를 지우고 신규 4종 상품이 포함된 1년치 데이터로 재구성
    // (현재 실시간 폐기 시연용으로 오늘 날짜에 넣은 selling 재고가 있다면 보존하기 위해 status IN ('sold', 'expired') 조건 또는 해당 기간 정리)
    await db.execute("DELETE FROM disposal_logs WHERE disposed_at >= '2025-10-01 00:00:00' AND disposed_at <= '2026-10-31 23:59:59'");
    await db.execute("DELETE FROM inventory WHERE created_at >= '2025-10-01 00:00:00' AND created_at <= '2026-10-31 23:59:59' AND status IN ('sold', 'expired')");

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

    // 2025-10 ~ 2026-10 (13개월) 설정
    // 모든 달에 신규 4종(빅&더블스테이크버거(1편), 화이트햄에그마요샌드위치, 이달의도시락 1편, 혜자로운 도시락) 포함!
    // 월 매출액이 모든 달에서 80만원 ~ 120만원 사이(83만 ~ 117만원)에 완벽히 들어오도록 구성
    const monthsConfig = [
        {
            // 2025-10 (가을 기준월)
            year: 2025, month: 10, days: 31,
            minRev: 890000, maxRev: 960000,
            dailyCounts: { triangle: [7, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 1.5, sellProb: 0.90 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 1.5, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.4, sellProb: 0.85 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.4, sellProb: 0.84 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.2, sellProb: 0.54 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.2, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.5, sellProb: 0.85 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 1.4, sellProb: 0.82 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.2, sellProb: 0.52 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 1.5, sellProb: 0.84 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.2, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.3, sellProb: 0.55 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.0, sellProb: 0.52 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.4, sellProb: 0.86 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 1.3, sellProb: 0.82 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.2, sellProb: 0.72 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.2, sellProb: 0.56 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 1.0, sellProb: 0.38 }
                ]
            }
        },
        {
            // 2025-11 (1차 발주개편 + 초겨울 진입): 온장 도시락(혜자로운 도시락), 스테이크버거, 불고기버거 강세!
            year: 2025, month: 11, days: 30,
            minRev: 1040000, maxRev: 1120000,
            dailyCounts: { triangle: [8, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.93 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.6, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.0, sellProb: 0.85 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.8, sellProb: 0.86 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.6, sellProb: 0.48 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.2, sellProb: 0.68 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 2.0, sellProb: 0.65 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.7, sellProb: 0.42 }
                ],
                gimbap: [
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 2.2, sellProb: 0.91 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.2, sellProb: 0.82 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 0.9, sellProb: 0.84 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 0.7, sellProb: 0.76 }
                ],
                burger: [
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.4, sellProb: 0.91 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.6, sellProb: 0.86 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.9, sellProb: 0.85 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.5, sellProb: 0.35 }
                ]
            }
        },
        {
            // 2025-12 (한겨울 한파 & 종강/방학): 따뜻한 도시락(혜자로운/이달의도시락), 스테이크버거, 매콤불고기, 서울엄마콩불 강세! 샌드위치 비수기
            year: 2025, month: 12, days: 31,
            minRev: 880000, maxRev: 950000,
            dailyCounts: { triangle: [7, 9], sandwich: [1, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 2.6, sellProb: 0.91 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.6, sellProb: 0.85 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.2, sellProb: 0.80 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.2, sellProb: 0.68 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.8, sellProb: 0.52 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.0, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.8, sellProb: 0.55 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 1.6, sellProb: 0.50 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.6, sellProb: 0.42 }
                ],
                gimbap: [
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.2, sellProb: 0.90 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.8, sellProb: 0.88 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.4, sellProb: 0.82 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 1.8, sellProb: 0.72 }
                ],
                burger: [
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.2, sellProb: 0.88 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.2, sellProb: 0.86 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.0, sellProb: 0.83 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.0, sellProb: 0.76 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.4, sellProb: 0.33 }
                ]
            }
        },
        {
            // 2026-01 (혹한기 & 동계방학): 온장 도시락(혜자로운/이달의도시락), 빅&더블스테이크버거, 서울엄마콩불 주력!
            year: 2026, month: 1, days: 31,
            minRev: 920000, maxRev: 990000,
            dailyCounts: { triangle: [7, 9], sandwich: [1, 2], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.6, sellProb: 0.87 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.4, sellProb: 0.85 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 1.8, sellProb: 0.76 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.0, sellProb: 0.68 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.6, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.2, sellProb: 0.58 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 1.0, sellProb: 0.54 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.5, sellProb: 0.42 }
                ],
                gimbap: [
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 2.2, sellProb: 0.90 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.89 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.6, sellProb: 0.85 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 1.6, sellProb: 0.74 }
                ],
                burger: [
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.6, sellProb: 0.90 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.6, sellProb: 0.88 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.2, sellProb: 0.85 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.8, sellProb: 0.76 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.4, sellProb: 0.35 }
                ]
            }
        },
        {
            // 2026-02 (늦겨울~초봄 해빙기, 28일): 화이트햄에그마요샌드위치, 아이돌인기샌드위치, 날치알명란 반등 시작!
            year: 2026, month: 2, days: 28,
            minRev: 840000, maxRev: 910000,
            dailyCounts: { triangle: [7, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.6, sellProb: 0.86 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.2, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.2, sellProb: 0.78 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.2, sellProb: 0.72 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 2.6, sellProb: 0.60 }
                ],
                sandwich: [
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 1.6, sellProb: 0.90 },
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.6, sellProb: 0.88 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.0, sellProb: 0.82 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.0, sellProb: 0.86 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.8, sellProb: 0.82 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.2, sellProb: 0.70 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.4, sellProb: 0.66 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.0, sellProb: 0.82 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 1.0, sellProb: 0.85 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.2, sellProb: 0.72 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.0, sellProb: 0.65 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.8, sellProb: 0.60 }
                ]
            }
        },
        {
            // 2026-03 (봄 신학기 개강 성수기): 화이트햄에그마요샌드위치, 아이돌인기샌드위치, 이달의도시락 1편(신학기 리뉴얼), 날치알명란 대폭발!
            year: 2026, month: 3, days: 31,
            minRev: 1060000, maxRev: 1140000,
            dailyCounts: { triangle: [7, 9], sandwich: [3, 4], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.8, sellProb: 0.94 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.92 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.4, sellProb: 0.89 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 1.8, sellProb: 0.76 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.2, sellProb: 0.58 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.8, sellProb: 0.45 }
                ],
                sandwich: [
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 3.0, sellProb: 0.95 },
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.94 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.2, sellProb: 0.89 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.6, sellProb: 0.90 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.6, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.2, sellProb: 0.62 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.0, sellProb: 0.80 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 1.4, sellProb: 0.72 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.9, sellProb: 0.52 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.7, sellProb: 0.44 }
                ]
            }
        },
        {
            // 2026-04 (완연한 봄 & 중간고사): 샌드위치 강세 + 중간고사 밤샘 간식(빅&더블스테이크버거, 혜자로운 도시락, 불닭콘치즈) 활약!
            year: 2026, month: 4, days: 30,
            minRev: 1010000, maxRev: 1080000,
            dailyCounts: { triangle: [7, 9], sandwich: [3, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.8, sellProb: 0.90 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.6, sellProb: 0.89 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.2, sellProb: 0.88 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.2, sellProb: 0.83 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.4, sellProb: 0.76 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.7, sellProb: 0.46 }
                ],
                sandwich: [
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 3.0, sellProb: 0.92 },
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.91 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.2, sellProb: 0.85 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.89 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.6, sellProb: 0.88 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.5, sellProb: 0.84 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.2, sellProb: 0.64 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.6, sellProb: 0.88 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.0, sellProb: 0.86 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.8, sellProb: 0.78 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.8, sellProb: 0.54 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.44 }
                ]
            }
        },
        {
            // 2026-05 (대학 축제 & 봄나들이 절정): 화이트햄에그마요샌드위치, 아이돌인기샌드위치, 비프토마토버거, 묵은지김밥 최전성기!
            year: 2026, month: 5, days: 31,
            minRev: 1100000, maxRev: 1170000,
            dailyCounts: { triangle: [7, 9], sandwich: [3, 4], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.8, sellProb: 0.87 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.4, sellProb: 0.86 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.0, sellProb: 0.80 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.4, sellProb: 0.68 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.6, sellProb: 0.42 }
                ],
                sandwich: [
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 3.2, sellProb: 0.94 },
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 3.0, sellProb: 0.93 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 2.4, sellProb: 0.88 }
                ],
                gimbap: [
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.8, sellProb: 0.92 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.5, sellProb: 0.84 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.4, sellProb: 0.74 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.2, sellProb: 0.70 }
                ],
                burger: [
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 3.0, sellProb: 0.90 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.8, sellProb: 0.72 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 1.4, sellProb: 0.64 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 0.9, sellProb: 0.68 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.40 }
                ]
            }
        },
        {
            // 2026-06 (초여름 폭염 시작): 에그마요(화이트햄에그마요샌드위치), 날치알명란, 참치마요B 급락! 불닭/매콤버거/혜자로운도시락 강세
            year: 2026, month: 6, days: 30,
            minRev: 930000, maxRev: 1000000,
            dailyCounts: { triangle: [7, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.93 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 1.8, sellProb: 0.86 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.6, sellProb: 0.74 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.0, sellProb: 0.54 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 2.4, sellProb: 0.45 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.7, sellProb: 0.52 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.4, sellProb: 0.62 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 2.6, sellProb: 0.48 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.8, sellProb: 0.50 }
                ],
                gimbap: [
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.8, sellProb: 0.89 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.86 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.6, sellProb: 0.82 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.2, sellProb: 0.56 }
                ],
                burger: [
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.6, sellProb: 0.90 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.6, sellProb: 0.82 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.6, sellProb: 0.62 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 1.2, sellProb: 0.58 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.7, sellProb: 0.45 }
                ]
            }
        },
        {
            // 2026-07 (한여름 장마 & 방학 비수기): 에그마요/명란 발주 감축, 매콤 메뉴(불닭/매콤불고기/김치김밥) 및 혜자로운 도시락 집중
            year: 2026, month: 7, days: 31,
            minRev: 830000, maxRev: 900000,
            dailyCounts: { triangle: [7, 8], sandwich: [1, 2], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 3.2, sellProb: 0.92 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.6, sellProb: 0.88 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.0, sellProb: 0.76 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 0.8, sellProb: 0.54 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 0.8, sellProb: 0.58 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.5, sellProb: 0.35 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 1.6, sellProb: 0.68 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 0.8, sellProb: 0.45 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.7, sellProb: 0.46 }
                ],
                gimbap: [
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.90 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.6, sellProb: 0.89 },
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.4, sellProb: 0.85 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 0.6, sellProb: 0.52 }
                ],
                burger: [
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.8, sellProb: 0.91 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 2.4, sellProb: 0.84 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.0, sellProb: 0.65 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 0.8, sellProb: 0.56 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 0.6, sellProb: 0.50 }
                ]
            }
        },
        {
            // 2026-08 (늦여름 폭염 완화 & 개강 준비): 빅&더블스테이크버거, 불고기버거, 혜자로운 도시락, 서울엄마콩불 회복세!
            year: 2026, month: 8, days: 31,
            minRev: 910000, maxRev: 980000,
            dailyCounts: { triangle: [7, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.86 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.4, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.4, sellProb: 0.82 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.2, sellProb: 0.85 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 1.2, sellProb: 0.78 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.6, sellProb: 0.52 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.0, sellProb: 0.82 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 1.4, sellProb: 0.78 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 0.9, sellProb: 0.62 }
                ],
                gimbap: [
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.6, sellProb: 0.88 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.4, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 2.2, sellProb: 0.81 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.0, sellProb: 0.76 }
                ],
                burger: [
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 1.6, sellProb: 0.87 },
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 1.6, sellProb: 0.88 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 2.2, sellProb: 0.78 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 1.8, sellProb: 0.72 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.0, sellProb: 0.83 }
                ]
            }
        },
        {
            // 2026-09 (가을 2학기 개강 성수기): 신규 4종과 기존 베스트셀러 고른 활약!
            year: 2026, month: 9, days: 30,
            minRev: 1040000, maxRev: 1120000,
            dailyCounts: { triangle: [8, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.93 },
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.2, sellProb: 0.88 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.0, sellProb: 0.85 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.8, sellProb: 0.82 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 1.0, sellProb: 0.65 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.6, sellProb: 0.90 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 2.4, sellProb: 0.89 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.0, sellProb: 0.68 }
                ],
                gimbap: [
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.8, sellProb: 0.91 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.4, sellProb: 0.84 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.6, sellProb: 0.78 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.4, sellProb: 0.91 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.2, sellProb: 0.89 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 1.8, sellProb: 0.86 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.4, sellProb: 0.75 },
                    { id: '27000388782272', name: '비프토마토버거', price: 3600, orderWeight: 0.8, sellProb: 0.58 }
                ]
            }
        },
        {
            // 2026-10 (가을 성수기 & 1년 데이터 기반 최적 발주 완성형):
            // 혜자로운 도시락, 빅&더블스테이크버거, 화이트햄에그마요샌드위치, 이달의도시락 1편 모두 최적 발주로 고판매율 달성!
            year: 2026, month: 10, days: 31,
            minRev: 1090000, maxRev: 1160000,
            dailyCounts: { triangle: [8, 9], sandwich: [2, 3], gimbap: [2, 3], burger: [2, 3] },
            categories: {
                triangle: [
                    { id: '27000388783952', name: '더큰)불닭콘치즈', price: 2000, orderWeight: 2.8, sellProb: 0.94 },
                    { id: '27000388781592', name: '더큰참치마요 A', price: 1400, orderWeight: 2.8, sellProb: 0.93 },
                    { id: '27000388784492', name: '스팸콘치즈김치볶음밥', price: 2000, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388781422', name: '더큰참치마요 B', price: 1800, orderWeight: 2.2, sellProb: 0.89 },
                    { id: '27000388771522', name: '흑백)서울엄마콩불', price: 2000, orderWeight: 1.8, sellProb: 0.84 },
                    { id: '27000388770222', name: '최강록)날치알명란&계란', price: 2000, orderWeight: 0.8, sellProb: 0.68 }
                ],
                sandwich: [
                    { id: '27000388779542', name: '아이돌인기샌드위치', price: 3300, orderWeight: 2.6, sellProb: 0.91 },
                    { id: '27000388870832', name: '화이트햄에그마요샌드위치', price: 3200, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388731092', name: '아이돌유닛샌드위치', price: 3300, orderWeight: 1.0, sellProb: 0.72 }
                ],
                gimbap: [
                    { id: '27000388862392', name: '혜자로운 도시락', price: 5000, orderWeight: 1.8, sellProb: 0.92 },
                    { id: '27000388781112', name: '묵은지참치김밥', price: 2000, orderWeight: 2.4, sellProb: 0.90 },
                    { id: '27000388872052', name: '이달의도시락 1편', price: 5200, orderWeight: 1.4, sellProb: 0.86 },
                    { id: '27000388777182', name: '종가)김치참치김밥', price: 2000, orderWeight: 1.8, sellProb: 0.82 }
                ],
                burger: [
                    { id: '27000388776192', name: '불고기버거(2편)', price: 4400, orderWeight: 2.4, sellProb: 0.92 },
                    { id: '27000388852942', name: '빅&더블스테이크버거(1편)', price: 4200, orderWeight: 2.2, sellProb: 0.90 },
                    { id: '27000388777942', name: '숯불갈비버거', price: 3600, orderWeight: 2.0, sellProb: 0.87 },
                    { id: '27000388776262', name: '매콤불고기버거', price: 3800, orderWeight: 1.6, sellProb: 0.80 },
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

    for (const mCfg of monthsConfig) {
        let attempt = 0;
        let result = generateMonthRows(mCfg);
        while ((result.rev < mCfg.minRev || result.rev > mCfg.maxRev) && attempt < 80) {
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
          AND created_at >= '2025-10-01 00:00:00' 
          AND created_at <= '2026-10-31 23:59:59'
    `;
    const [logRes] = await db.query(logSql);
    console.log(`disposal_logs에 ${logRes.affectedRows}건 폐기 이력 동기화 완료 ✅`);

    await db.end();
}

if (require.main === module) {
    seedFullYearWithNewProducts().catch(console.error);
}
module.exports = seedFullYearWithNewProducts;
