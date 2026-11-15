const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = process.env.PORT || 3000;

// ngrok 또는 외부 접속 시 브라우저 경고 방지 미들웨어
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

app.use(express.json());
app.use(express.static('public'));

// DB 접속 정보 (Aiven DB) - Connection Pool 사용 (자동 재연결)
const db = mysql.createPool({
    host: 'infodb.ansan.ac.kr',
    user: 'i2151002',
    password: 'khwjstk2@', 
    port: 3306,
    database: 'db2151002_capstone',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('FF POS DB 커넥션 풀 연결 정보 설정됨! 🟢');


// MySQL 형식에 맞는 날짜 변환기 (YYYY-MM-DD HH:mm:ss)
function getMySQLDateTime(date) {
    const formatted = date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0') + ' ' + 
           String(date.getHours()).padStart(2, '0') + ':' + 
           String(date.getMinutes()).padStart(2, '0') + ':00';
    return formatted;
}


// ===============================
// [기능 1] 바코드 스캔 및 유통기한 계산
// ===============================
app.post('/api/inspect', (req, res) => {
    const { barcode } = req.body;

    // 바코드 규칙에 따라 상품 ID 파싱 (14자리)
    const itemID = barcode.substring(0, 14); 
    const last4 = barcode.slice(-4);
    let hour = parseInt(last4.substring(0, 2));
    let day = parseInt(last4.substring(2, 4));

    // 일반 바코드 포맷 스캔 시 NaN 발생 및 저장 오류 방지
    if (isNaN(hour) || isNaN(day) || hour > 23 || day > 31) {
        hour = 0;
        day = new Date().getDate() + 3;
    }

    let now = new Date();
    let year = now.getFullYear();
    let currentMonth = now.getMonth();
    let today = now.getDate();

    // 월/연도 넘어가는 경우 처리
    if (day < today) {
        currentMonth += 1;
    }
    if (currentMonth > 11) {
        currentMonth = 0;
        year += 1;
    }

    const finalExp = new Date(year, currentMonth, day, hour, 0, 0);
    const expDate = getMySQLDateTime(finalExp);

    // 마스터 테이블 및 발주 테이블 조인 조회
    const sql = `
        SELECT p.item_name, IFNULL(o.expected_qty, 0) as expected_qty 
        FROM products_master p 
        LEFT JOIN orders o ON p.item_id = o.item_id 
        WHERE p.item_id = ?`;

    db.query(sql, [itemID], (err, result) => {
        if (err) return res.status(500).send(err);

        const itemName = (result.length > 0) ? result[0].item_name : "미등록 상품";
        const expectedQty = (result.length > 0) ? result[0].expected_qty : 0;

        res.json({
            barcode,
            itemName,
            expDate,
            expectedQty,
            quantity: 1
        });
    });
});


// ===============================
// [기능 2] 검수 완료 (재고 저장)
// ===============================
app.post('/api/finalize', (req, res) => {
    const items = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "데이터가 없습니다." });
    }

    const values = [];
    items.forEach(i => {
        // DB에 저장할 때 수량(quantity)만큼 개별 데이터로 쪼개기
        for (let j = 0; j < i.quantity; j++) {
            values.push([
                i.barcode,
                i.itemName,
                i.expDate,
                1, // 각각 낱개(1개)로 취급하여 저장
                'selling'
            ]);
        }
    });

    const sql = `
        INSERT INTO inventory 
        (barcode, item_name, expiration_date, quantity, status)
        VALUES ?
    `;

    db.query(sql, [values], (err) => {
        if (err) {
            console.error("저장 오류:", err);
            return res.status(500).json({ message: "저장 실패", error: err.message });
        }

        console.log("DB 저장 완료 ✅");
        res.json({ message: "검수 완료! 재고가 성공적으로 저장되었습니다." });
    });
});


// ===============================
// [기능 3] 전체 재고 조회
// ===============================
app.get('/api/inventory', (req, res) => {
    const sql = `
        SELECT * FROM inventory 
        WHERE status = 'selling' 
        ORDER BY expiration_date ASC
    `;

    db.query(sql, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});


// ===============================
// [기능 9] 폐기 내역 조회
// ===============================
app.get('/api/disposed', (req, res) => {
    const sql = `
        SELECT * FROM inventory 
        WHERE status = 'expired' 
        ORDER BY expiration_date DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});


// ===============================
// [기능 4] 폐기 알림 (1시간 이내 대상)
// ===============================
app.get('/api/alerts', (req, res) => {
    const now = new Date();
    const currentTime = getMySQLDateTime(now);

    const sql = `
        SELECT *,
        TIMESTAMPDIFF(MINUTE, ?, expiration_date) as minutes_left
        FROM inventory 
        WHERE status = 'selling' 
        AND expiration_date <= DATE_ADD(?, INTERVAL 3 HOUR)
        ORDER BY expiration_date ASC
    `;

    db.query(sql, [currentTime, currentTime], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});


// ===============================
// [기능 8] 상품 폐기 등록
// ===============================
app.post('/api/dispose', (req, res) => {
    const { id } = req.body;

    const sql = `
        UPDATE inventory 
        SET status = 'expired' 
        WHERE id = ? 
        AND status = 'selling'
    `;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        
        // [4주차] 로깅(History) 저장
        if (result.affectedRows > 0) {
            const logSql = `INSERT INTO disposal_logs (inventory_id, item_name, barcode) SELECT id, item_name, barcode FROM inventory WHERE id = ?`;
            db.query(logSql, [id], (err2) => {
                if (err2) console.error('로그 저장 에러:', err2);
            });
        }

        res.json({
            message: result.affectedRows > 0 ? "폐기 처리되었습니다. 🗑️" : "이미 폐기되었거나 없는 상품입니다."
        });
    });
});

// ===============================
// [3/4주차] 일괄 폐기 처리 및 로깅 (Batch Dispose)
// ===============================
app.post('/api/dispose-all', (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
        return res.json({ message: "폐기할 상품이 없습니다." });
    }

    const sql = `
        UPDATE inventory 
        SET status = 'expired' 
        WHERE id IN (?) 
        AND status = 'selling'
    `;

    db.query(sql, [ids], (err, result) => {
        if (err) return res.status(500).send(err);
        
        // [4주차] 다중 로깅(History) 저장
        if (result.affectedRows > 0) {
            const logSql = `INSERT INTO disposal_logs (inventory_id, item_name, barcode) SELECT id, item_name, barcode FROM inventory WHERE id IN (?)`;
            db.query(logSql, [ids], (err2) => {
                if (err2) console.error('일괄 로그 저장 에러:', err2);
            });
        }

        res.json({
            message: `총 ${result.affectedRows}개의 상품이 일괄 폐기 완료되었습니다. 🗑️`
        });
    });
});

// ===============================
app.post('/api/sale', (req, res) => {
    const { barcode } = req.body;

    // 1. 유통기한이 가장 임박한 상품 1개 조회 및 원가 가져오기
    const selectSql = `
        SELECT i.id, i.expiration_date, i.item_name, p.price,
               TIMESTAMPDIFF(MINUTE, NOW(), i.expiration_date) as minutes_left
        FROM inventory i
        LEFT JOIN products_master p ON SUBSTRING(i.barcode, 1, 14) = p.item_id
        WHERE i.barcode = ? AND i.status = 'selling'
        ORDER BY i.expiration_date ASC
        LIMIT 1
    `;

    db.query(selectSql, [barcode], (err, rows) => {
        if (err) return res.status(500).send(err);
        if (rows.length === 0) {
            return res.json({ success: false, message: "판매 가능한 재고가 없습니다. ❌" });
        }

        const item = rows[0];
        const originalPrice = item.price || 0;
        let salePrice = originalPrice;
        let discountRate = 0;

        // 2시간(120분) 전 30%, 1시간(60분) 전 50% 할인 로직
        if (item.minutes_left <= 60 && item.minutes_left >= -60) {
            discountRate = 50;
        } else if (item.minutes_left <= 120 && item.minutes_left > 60) {
            discountRate = 30;
        }

        if (discountRate > 0) {
            salePrice = Math.floor(originalPrice * (1 - discountRate / 100));
        }

        // 2. 상태 업데이트 및 판매가(sale_price) 기록
        const updateSql = `
            UPDATE inventory 
            SET status = 'sold', sale_price = ?
            WHERE id = ?
        `;

        db.query(updateSql, [salePrice, item.id], (err, result) => {
            if (err) return res.status(500).send(err);
            
            let msg = `[정상결제] ${item.item_name}\n결제 금액: ${salePrice}원`;
            if (discountRate > 0) {
                msg = `🎉 마감할인 ${discountRate}% 자동 적용!\n[${item.item_name}]\n원가: ${originalPrice}원 ➔ 결제가: ${salePrice}원`;
            }

            res.json({ success: true, message: msg });
        });
    });
});


// ===============================
// [기능 6] 판매 실적 분석 (수량 집계 오류 수정본)
// ===============================
app.get('/api/analysis', (req, res) => {
    // COUNT(*) 대신 SUM(quantity)를 사용하여 실제 입고/판매 수량을 정확히 집계합니다.
    const sql = `
        SELECT 
            item_name,
            SUM(quantity) as total_in,
            SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) as sold_count,
            ROUND(
                (SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) 
                / SUM(quantity)) * 100, 1
            ) as sales_rate
        FROM inventory
        GROUP BY item_name
        HAVING total_in > 0
        ORDER BY sales_rate DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("분석 쿼리 에러:", err);
            return res.status(500).send(err);
        }
        res.json(rows);
    });
});


// ===============================
// [기능 10] 일일 판매 실적 조회
// ===============================
app.get('/api/analysis/daily', (req, res) => {
    const targetDate = req.query.date;
    if(!targetDate) return res.status(400).json({message: "date 파라미터가 필요합니다."});

    const sql = `
        SELECT 
            item_name,
            SUM(CASE WHEN DATE(created_at) = ? THEN quantity ELSE 0 END) as total_in,
            SUM(CASE WHEN status = 'sold' AND DATE(updated_at) = ? THEN quantity ELSE 0 END) as sold_count,
            SUM(CASE WHEN status = 'expired' AND DATE(updated_at) = ? THEN quantity ELSE 0 END) as expired_count,
            SUM(CASE WHEN status = 'sold' AND DATE(updated_at) = ? THEN sale_price ELSE 0 END) as total_revenue
        FROM inventory
        WHERE DATE(created_at) = ? OR DATE(updated_at) = ?
        GROUP BY item_name
    `;
    db.query(sql, [targetDate, targetDate, targetDate, targetDate, targetDate, targetDate], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

// ===============================
// [기능 11] AI 스마트 발주 추천 및 로스 경고
// ===============================
app.get('/api/recommendation', (req, res) => {
    const warnings = [];

    // 1. 내일이 공휴일인지 확인
    const holidayCheckSql = `SELECT holiday_name FROM holidays WHERE holiday_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`;
    
    db.query(holidayCheckSql, (err, holidayRes) => {
        if (err) return res.status(500).send(err);
        
        let tomorrowHoliday = null;
        if (holidayRes.length > 0) {
            tomorrowHoliday = holidayRes[0].holiday_name;
        }

        // 2. 과거 공휴일 폐기 데이터 조회
        const holidayExpiredSql = `
            SELECT i.item_name, SUM(i.quantity) as holiday_expired
            FROM inventory i
            JOIN holidays h ON DATE(i.updated_at) = h.holiday_date
            WHERE i.status = 'expired'
            GROUP BY i.item_name
            HAVING holiday_expired >= 1
        `;

        db.query(holidayExpiredSql, (err, hRows) => {
            if (err) return res.status(500).send(err);
            
            if (tomorrowHoliday) {
                hRows.forEach(row => {
                    warnings.push({
                        type: 'holiday',
                        message: `🚨 내일은 <b>[${tomorrowHoliday}]</b>입니다! 과거 행사/공휴일에 폐기가 잦았던 <b>[${row.item_name}]</b>(${row.holiday_expired}개 폐기)의 발주를 주의하세요.`
                    });
                });
            }

            // 3. 기존 요일별 폐기 데이터 조회
            const weekdaySql = `
                SELECT 
                    item_name,
                    DAYOFWEEK(updated_at) as day_of_week,
                    SUM(quantity) as total_expired
                FROM inventory
                WHERE status = 'expired'
                GROUP BY item_name, day_of_week
                ORDER BY total_expired DESC
            `;

            db.query(weekdaySql, (err, wRows) => {
                if (err) return res.status(500).send(err);
                
                const dayNames = ['-', '일', '월', '화', '수', '목', '금', '토'];
                wRows.forEach(row => {
                    if (row.total_expired >= 1) {
                        warnings.push({
                            type: 'weekday',
                            message: `🚨 <b>${dayNames[row.day_of_week]}요일</b> 집중 폐기 경고: <b>[${row.item_name}]</b> (${row.total_expired}개 폐기 이력 확인됨)`
                        });
                    }
                });
                
                res.json(warnings);
            });
        });
    });
});


// ===============================
// [기능 12] 전체 공휴일 목록 조회 (달력 UI 표시용)
// ===============================
app.get('/api/holidays', (req, res) => {
    db.query("SELECT holiday_date FROM holidays", (err, rows) => {
        if (err) return res.status(500).send(err);
        
        // 날짜를 YYYY-MM-DD 형태의 문자열 배열로 변환
        const holidayDates = rows.map(r => {
            const d = new Date(r.holiday_date);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        });
        
        res.json(holidayDates);
    });
});


// ===============================
// [기능 7] 서버/DB 시간 동기화 확인용
// ===============================
app.get('/api/db-time', (req, res) => {
    db.query("SELECT NOW() as db_now", (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({
            node_now: new Date(),
            db_now: result[0].db_now
        });
    });
});


app.listen(port, () => {
    console.log(`FF POS 서버 실행 중: http://localhost:${port}`);
});
// ===============================
// [4주차] 로깅(History) 조회 API
// ===============================
app.get('/api/logs', (req, res) => {
    const sql = `
        SELECT * FROM disposal_logs 
        ORDER BY disposed_at DESC 
        LIMIT 50
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});


// 2026-01 ~ 2026-10 시계열 데이터 자동 시딩 보장 헬퍼
let seedingPromise = null;
function ensure2026DataSeeded(callback) {
    db.query("SELECT COUNT(*) as cnt FROM inventory WHERE created_at >= '2026-01-01 00:00:00' AND created_at <= '2026-01-31 23:59:59'", (err, rows) => {
        if (!err && rows && rows[0].cnt === 0) {
            if (!seedingPromise) {
                console.log('2026-01 ~ 2026-10 시계열 더미 데이터 자동 적재를 시작합니다...');
                const seedJanToOct2026 = require('./seed_2026_01_to_10.js');
                seedingPromise = seedJanToOct2026()
                    .catch(e => console.error('시딩 오류:', e))
                    .finally(() => { seedingPromise = null; });
            }
            seedingPromise.then(() => callback());
        } else {
            callback();
        }
    });
}

// ===============================
// [5주차] 월간(기간별) 실적 분석 및 발주 개편 추천 API
// ===============================
app.get('/api/analysis/monthly', (req, res) => {
    const targetMonth = req.query.month || '2025-10'; // YYYY-MM

    ensure2026DataSeeded(() => {
        const sql = `
            SELECT 
                item_name,
                SUM(quantity) as total_in,
                SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) as sold_count,
                SUM(CASE WHEN status = 'expired' THEN quantity ELSE 0 END) as expired_count,
                ROUND(SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) / SUM(quantity) * 100, 1) as sales_rate,
                SUM(CASE WHEN status = 'sold' THEN IFNULL(sale_price, 0) ELSE 0 END) as total_revenue
            FROM inventory
            WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
            GROUP BY item_name
            HAVING total_in > 0
            ORDER BY sales_rate DESC, sold_count DESC
        `;
        db.query(sql, [targetMonth], (err, rows) => {
            if (err) return res.status(500).send(err);
            res.json(rows);
        });
    });
});

// ===============================
// [6~7주차] 1년(4계절) 계절별 인기/비인기 통계 및 발주 전략 API
// ===============================
app.get('/api/analysis/seasonal', (req, res) => {
    const season = req.query.season || 'spring'; // spring, summer, autumn, winter
    let months = [3, 4, 5];
    if (season === 'summer') months = [6, 7, 8];
    else if (season === 'autumn') months = [9, 10, 11];
    else if (season === 'winter') months = [12, 1, 2];

    ensure2026DataSeeded(() => {
        const sql = `
            SELECT 
                item_name,
                SUM(quantity) as total_in,
                SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) as sold_count,
                SUM(CASE WHEN status = 'expired' THEN quantity ELSE 0 END) as expired_count,
                ROUND(SUM(CASE WHEN status = 'sold' THEN quantity ELSE 0 END) / SUM(quantity) * 100, 1) as sales_rate,
                SUM(CASE WHEN status = 'sold' THEN IFNULL(sale_price, 0) ELSE 0 END) as total_revenue
            FROM inventory
            WHERE created_at >= '2025-10-01 00:00:00' 
              AND created_at <= '2026-10-31 23:59:59'
              AND MONTH(created_at) IN (?)
            GROUP BY item_name
            HAVING total_in > 0
            ORDER BY sales_rate DESC, sold_count DESC
        `;
        db.query(sql, [months], (err, rows) => {
            if (err) return res.status(500).send(err);
            res.json(rows);
        });
    });
});

// 서버 시작 시 2026-01 ~ 2026-10 데이터가 비어있으면 자동 시딩 실행
ensure2026DataSeeded(() => {});

// ===============================
// [매장별 로그인 및 회원가입 기능 - Salt + Scrypt 단방향 암호화 적용]
// ===============================
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedPassword) {
    if (!storedPassword) return false;
    // 기존에 평문으로 저장된 계정이 있다면 호환 처리
    if (!storedPassword.includes(':')) {
        return password === storedPassword;
    }
    const [salt, key] = storedPassword.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const fs = require('fs');
const createStoresTableSql = `
    CREATE TABLE IF NOT EXISTS stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        store_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;
db.query(createStoresTableSql, (err) => {
    if (err) console.error('stores 테이블 생성 확인 중 오류:', err.message);
    else {
        console.log('stores (매장 회원) 테이블 준비 완료 ✅');
        // 기존 가입된 계정 DB 초기화 (최초 1회 자동 실행)
        if (!fs.existsSync('.stores_wiped')) {
            db.query('TRUNCATE TABLE stores', (err2) => {
                if (!err2) {
                    fs.writeFileSync('.stores_wiped', 'wiped');
                    console.log('기존 회원가입 계정 DB(stores) 초기화 완료 🗑️');
                }
            });
        }
    }
});

// [회원가입 API] 아이디, 비밀번호(Salt+Scrypt 단방향 해시 암호화), 비밀번호 확인, 매장이름
app.post('/api/auth/register', (req, res) => {
    const { username, password, passwordConfirm, storeName } = req.body;

    if (!username || !password || !passwordConfirm || !storeName) {
        return res.status(400).json({ success: false, message: '모든 항목을 입력해주세요.' });
    }
    if (password !== passwordConfirm) {
        return res.status(400).json({ success: false, message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.' });
    }

    const encryptedPassword = hashPassword(password);
    // 새로 가입하거나, 시연 영상 재촬영 시 동일 아이디로 다시 가입해도 덮어써서 새로 가입되도록 처리
    const insertSql = `
        INSERT INTO stores (username, password, store_name) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE password = VALUES(password), store_name = VALUES(store_name), created_at = CURRENT_TIMESTAMP
    `;
    db.query(insertSql, [username, encryptedPassword, storeName], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: '회원가입 저장 중 오류가 발생했습니다.' });
        res.json({
            success: true,
            message: '매장 회원가입이 완료되었습니다!',
            user: { username, storeName }
        });
    });
});

// [로그인 API] 아이디 조회 후 암호화 해시 대조 및 매장이름 반환
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const sql = `SELECT id, username, password, store_name FROM stores WHERE username = ? LIMIT 1`;
    db.query(sql, [username], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'DB 조회 오류가 발생했습니다.' });
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        const store = rows[0];
        if (!verifyPassword(password, store.password)) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 만약 기존 평문 계정이었다면 로그인 성공 시 자동으로 암호화 해시로 DB 업그레이드
        if (!store.password.includes(':')) {
            const upgradedHash = hashPassword(password);
            db.query(`UPDATE stores SET password = ? WHERE id = ?`, [upgradedHash, store.id], () => {});
        }

        res.json({
            success: true,
            message: `${store.store_name} 로그인 성공!`,
            user: {
                id: store.id,
                username: store.username,
                storeName: store.store_name
            }
        });
    });
});


