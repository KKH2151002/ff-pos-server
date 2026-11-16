const mysql = require('mysql2/promise');

function formatDateTime(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':00';
}

async function seedAlertCapture() {
    const db = await mysql.createConnection({
        host: 'infodb.ansan.ac.kr',
        user: 'i2151002',
        password: 'khwjstk2@',
        port: 3306,
        database: 'db2151002_capstone'
    });

    // Render 서버(UTC 시간대)에서 캡처할 경우 'node seed_alert_capture.js render' 옵션 지원
    const isRenderUtc = process.argv[2] === 'render';
    const baseNow = new Date();
    if (isRenderUtc) {
        baseNow.setHours(baseNow.getHours() - 9);
    }

    // 기존 판매중(selling) 재고 비우기
    await db.execute("DELETE FROM inventory WHERE status = 'selling'");

    // 5대 카테고리별(일반김밥 / 삼각김밥 / 도시락 / 햄버거 / 샌드위치)로
    // [🚨 골든타임(10분 이하), 🟠 주의(11~30분), 🟡 관심(31~60분)] 1개씩 총 15개 배치
    const captureItems = [
        // 1. 일반김밥 (골든타임 / 주의 / 관심)
        { barcode: '270003887811121416', name: '묵은지참치김밥', addMinutes: 7 },      // 🚨 골든타임
        { barcode: '270003887771821416', name: '종가)김치참치김밥', addMinutes: 24 },  // 🟠 주의
        { barcode: '270003887811122216', name: '묵은지참치김밥', addMinutes: 52 },     // 🟡 관심

        // 2. 삼각김밥 (골든타임 / 주의 / 관심)
        { barcode: '270003887814221416', name: '더큰참치마요 B', addMinutes: 6 },      // 🚨 골든타임
        { barcode: '270003887839521416', name: '더큰)불닭콘치즈', addMinutes: 21 },    // 🟠 주의
        { barcode: '270003887702221416', name: '최강록)날치알명란&계란', addMinutes: 48 }, // 🟡 관심

        // 3. 도시락 (골든타임 / 주의 / 관심)
        { barcode: '270003888623921416', name: '혜자로운 도시락', addMinutes: 5 },     // 🚨 골든타임
        { barcode: '270003888720521416', name: '이달의도시락 1편', addMinutes: 23 },   // 🟠 주의
        { barcode: '270003888623922216', name: '혜자로운 도시락', addMinutes: 50 },    // 🟡 관심

        // 4. 햄버거 (골든타임 / 주의 / 관심)
        { barcode: '270003887761921416', name: '불고기버거(2편)', addMinutes: 8 },     // 🚨 골든타임
        { barcode: '270003888529421416', name: '빅&더블스테이크버거(1편)', addMinutes: 25 }, // 🟠 주의
        { barcode: '270003887762621416', name: '매콤불고기버거', addMinutes: 54 },     // 🟡 관심

        // 5. 샌드위치 (골든타임 / 주의 / 관심)
        { barcode: '270003887795421416', name: '아이돌인기샌드위치', addMinutes: 9 },  // 🚨 골든타임
        { barcode: '270003888708321416', name: '화이트햄에그마요샌드위치', addMinutes: 22 }, // 🟠 주의
        { barcode: '270003887310921416', name: '아이돌유닛샌드위치', addMinutes: 49 }  // 🟡 관심
    ];

    const values = captureItems.map(item => {
        const exp = new Date(baseNow.getTime() + item.addMinutes * 60000);
        return [
            item.barcode,
            item.name,
            formatDateTime(exp),
            1,
            'selling'
        ];
    });

    const sql = `
        INSERT INTO inventory (barcode, item_name, expiration_date, quantity, status)
        VALUES ?
    `;
    await db.query(sql, [values]);

    console.log('====================================================');
    console.log('✅ 5개 카테고리(일반김밥/삼각김밥/도시락/햄버거/샌드위치) 3단계 폐기 알림 15개 등록 완료!');
    console.log('====================================================');

    await db.end();
}

seedAlertCapture().catch(console.error);
