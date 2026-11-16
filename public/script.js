let currentMode = 'inspect';
let tempItems = []; 
let isCameraRunning = false;
// 스캔 중복 실행 방지를 위한 플래그
let isScanning = false; 

const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 20 }; // qrbox를 제거하여 전체 화면을 스캔 영역으로 사용 (깜빡이는 네모 박스 제거)

// 페이지 로드 시 카메라 시작
window.onload = () => {
    const storeRaw = localStorage.getItem('ff_pos_store');
    if (!storeRaw) {
        window.location.href = '/login.html';
        return;
    }
    try {
        const storeUser = JSON.parse(storeRaw);
        const badge = document.getElementById('headerStoreBadge');
        if (badge && storeUser.storeName) {
            badge.innerText = `📍 ${storeUser.storeName}`;
        }
        const sidebarHeader = document.getElementById('sidebarStoreHeader');
        if (sidebarHeader && storeUser.storeName) {
            sidebarHeader.innerText = `🏪 ${storeUser.storeName} 메뉴`;
        }
    } catch (e) {
        console.error(e);
    }
    manageCamera('start');
};

window.logoutStore = function() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    localStorage.removeItem('ff_pos_store');
    window.location.href = '/login.html';
};

// 사이드바 토글
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// 카메라 제어 (시작/중지)
function manageCamera(action) {
    const readerDiv = document.getElementById('reader');
    if (action === 'stop' && isCameraRunning) {
        html5QrCode.stop().then(() => { 
            readerDiv.style.display = 'none'; 
            isCameraRunning = false; 
        });
    } else if (action === 'start' && !isCameraRunning) {
        readerDiv.style.display = 'block';
        html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess)
            .then(() => { isCameraRunning = true; })
            .catch(err => alert("카메라 권한을 확인해주세요."));
    }
}

// 메뉴 모드 전환
window.setMode = function(mode) {
    currentMode = mode;
    // 사이드바 UI 업데이트
    document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + 'ModeBtn').classList.add('active');

    // 섹션 전환
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    // [4주차] 알람, 통계 페이지에서는 컨테이너 너비를 확장 (그리드 레이아웃 대응)
    const container = document.querySelector('.container');
    if (container) {
        if (mode === 'alert' || mode === 'analysis') {
            container.style.maxWidth = '1360px';
            container.style.width = '96%';
        } else {
            container.style.maxWidth = '600px';
        }
    }

    
    if (mode === 'inspect') {
        document.getElementById('inspectSection').classList.add('active');
        manageCamera('start');
    } else if (mode === 'inventory') {
        document.getElementById('inventorySection').classList.add('active');
        manageCamera('stop');
        updateInventoryList();
    } else if (mode === 'sale') {
        document.getElementById('inspectSection').classList.add('active'); 
        manageCamera('start');
    } else if (mode === 'alert') {
        document.getElementById('alertSectionPage').classList.add('active');
        manageCamera('stop');
        checkExpiredAlerts();
    } else if (mode === 'disposed') {
        document.getElementById('disposedSection').classList.add('active');
        manageCamera('stop');
        updateDisposedList();
    } else if (mode === 'analysis') {
        document.getElementById('analysisSection').classList.add('active');
        manageCamera('stop');
        updateMonthlyAnalysis('2025-10');
    }
    toggleSidebar();
}

// [조회] 전체 재고 목록 업데이트
function updateInventoryList() {
    fetch('/api/inventory').then(res => res.json()).then(data => {
        const list = document.getElementById('inventoryList');
        if (!data || data.length === 0) { 
            list.innerHTML = '<tr><td colspan="3">재고 없음</td></tr>'; 
            return; 
        }
        list.innerHTML = data.map(i => {
            const date = new Date(i.expiration_date);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}시`;
            return `<tr><td style="text-align:left;">${i.item_name}</td><td>${dateStr}</td><td>${i.quantity}</td></tr>`;
        }).join('');
    });
}

// [조회] 폐기 알림 확인 (타겟팅 수거 지시 UI - 카테고리 그리드 적용)
function checkExpiredAlerts() {
    fetch('/api/alerts').then(res => res.json()).then(data => {
        const list = document.getElementById('alertListPage');
        if (data.length === 0) { 
            list.innerHTML = '<p style="text-align:center;">경고 대상 상품 없음</p>'; 
            return; 
        }

        // [3주차] 일괄 폐기 버튼 추가
        const disposeAllBtn = `
            <div style="text-align: center; margin-bottom: 15px;">
                <button onclick="disposeAllItems()" style="padding: 12px 20px; background: #343a40; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; width: 100%; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    🗑️ 알림 목록 일괄 수거 및 폐기 완료
                </button>
            </div>
        `;

        // [4주차] 카테고리별 그리드(Grid) 렌더링 로직 추가 (도시락 카테고리 추가: 총 5단 그리드)
        const categories = {
            "일반김밥": [],
            "삼각김밥": [],
            "도시락": [],
            "햄버거": [],
            "샌드위치": []
        };

        data.forEach(i => {
            let color = '#dc3545';
            let stageBadge = '<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🚨 골든타임</span>';
            if (i.minutes_left > 30) {
                color = '#ffc107';
                stageBadge = '<span style="background:#ffc107; color:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🟡 관심</span>';
            } else if (i.minutes_left > 10) {
                color = '#fd7e14';
                stageBadge = '<span style="background:#fd7e14; color:white; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:5px;">🟠 주의</span>';
            }

            const imageDatabase = {
                "아이돌유닛샌드위치": "/img/sandwich.jpg", "아이돌인기샌드위치": "/img/sandwich.jpg", "화이트햄에그마요샌드위치": "/img/sandwich.jpg",
                "불고기버거(2편)": "/img/burger.jpg", "매콤불고기버거": "/img/burger.jpg", "숯불갈비버거": "/img/burger.jpg", "비프토마토버거": "/img/burger.jpg", "빅&더블스테이크버거(1편)": "/img/burger.jpg",
                "이달의도시락 1편": "/img/dosirak.jpg", "혜자로운 도시락": "/img/dosirak.jpg",
                "종가)김치참치김밥": "/img/gimbap.jpg", "묵은지참치김밥": "/img/gimbap.jpg",
                "더큰참치마요 B": "/img/triangle.jpg", "더큰참치마요 A": "/img/triangle.jpg", "최강록)날치알명란&계란": "/img/triangle.jpg", "흑백)서울엄마콩불": "/img/triangle.jpg", "더큰)불닭콘치즈": "/img/triangle.jpg", "스팸콘치즈김치볶음밥": "/img/triangle.jpg"
            };

            const imageUrl = imageDatabase[i.item_name] || "https://dummyimage.com/150x150/cccccc/000000&text=No+Image";
            
            let catName = "일반김밥";
            if(imageUrl.includes('dosirak') || i.item_name.includes('도시락')) catName = "도시락";
            else if(imageUrl.includes('gimbap')) catName = "일반김밥";
            else if(imageUrl.includes('triangle')) catName = "삼각김밥";
            else if(imageUrl.includes('burger')) catName = "햄버거";
            else if(imageUrl.includes('sandwich')) catName = "샌드위치";

            const cardHtml = `
            <div class="alert-card" style="border-left: 5px solid ${color}; padding: 10px; margin-bottom: 10px; background: white; flex-direction: column; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center;">
                    <img src="${imageUrl}" alt="상품" style="width:50px; height:50px; object-fit:cover; border-radius:8px; margin-right:10px; border:1px solid #eee;" onerror="this.src='https://dummyimage.com/150x150/cccccc/000000&text=No+Image'">
                    <div>
                        <div style="margin-bottom: 5px;">${stageBadge}</div>
                        <strong style="font-size: 0.95rem;">${i.item_name}</strong>
                        <div style="font-size: 0.8rem; color: #dc3545; font-weight: bold; margin-top:3px;">
                            ${i.minutes_left < 0 ? `경과 ${Math.abs(i.minutes_left)}분` : `남음 ${i.minutes_left}분`}
                        </div>
                    </div>
                </div>
                <button onclick="disposeItem(${i.id}, '${i.item_name.replace(/'/g, "\'")}')" style="margin-top: 10px; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-size: 0.9rem; font-weight: bold;">
                    🗑️ 개별 폐기
                </button>
            </div>`;

            if(categories[catName]) categories[catName].push(cardHtml);
        });

        const gridHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 15px; width: 100%;">
                ${Object.keys(categories).map(cat => `
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h3 style="text-align: center; border-bottom: 2px solid #343a40; padding-bottom: 8px; margin-top:0; font-size: 1.1rem; color: #343a40;">${cat}</h3>
                        <div style="max-height: 70vh; overflow-y: auto; padding-right: 5px;">
                            ${categories[cat].length > 0 ? categories[cat].join('') : '<p style="text-align:center; color:#999; font-size:0.9rem;">없음</p>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        list.innerHTML = disposeAllBtn + gridHtml;
        
        // Removed the polling setTimeout to prevent conflicts, 
        // assuming it's handled by pollAlerts() or something else.
    })
    .catch(err => {
        console.error("경고 조회 실패:", err);
    });
}

function updateDisposedList() {
    fetch('/api/disposed').then(res => res.json()).then(data => {
        const list = document.getElementById('disposedList');
        if (!data || data.length === 0) { 
            list.innerHTML = '<tr><td colspan="3">폐기 내역 없음 🗑️</td></tr>'; 
            return; 
        }

        // [3주차] 일괄 폐기 버튼 추가
        const disposeAllBtn = `
            <div style="text-align: center; margin-bottom: 15px;">
                <button onclick="disposeAllItems()" style="padding: 12px 20px; background: #343a40; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; width: 100%; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    🗑️ 알림 목록 일괄 수거 및 폐기 완료
                </button>
            </div>
        `;

        list.innerHTML = disposeAllBtn + data.map(i => {

            const date = new Date(i.expiration_date);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}시`;
            return `<tr><td style="text-align:left;">${i.item_name}</td><td>${dateStr}</td><td>${i.quantity}</td></tr>`;
        }).join('');
    });
}

// [추가] 폐기 처리 함수
window.disposeItem = function(id, itemName) {
    if(!confirm(`'${itemName}' 항목을 폐기 처리하시겠습니까?`)) return;

    fetch('/api/dispose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        checkExpiredAlerts(); // 목록 갱신
    })
    .catch(err => {
        console.error("폐기 에러:", err);
        alert("폐기 처리 중 오류가 발생했습니다.");
    });
}

// [이벤트] Flatpickr 달력 초기화 및 날짜 변경 이벤트
fetch('/api/holidays').then(res => res.json()).then(holidays => {
    flatpickr("#analysisDate", {
        locale: "ko",
        defaultDate: new Date(),
        onChange: function(selectedDates, dateStr, instance) {
            updateAnalysis(dateStr);
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // 요일 확인 (0: 일요일, 6: 토요일)
            const day = dayElem.dateObj.getDay();
            if (day === 0) dayElem.classList.add("is-sunday");
            else if (day === 6) dayElem.classList.add("is-saturday");
            
            // 공휴일 확인 (YYYY-MM-DD 형식 매칭)
            const dateString = dayElem.dateObj.getFullYear() + "-" + 
                               String(dayElem.dateObj.getMonth()+1).padStart(2,'0') + "-" + 
                               String(dayElem.dateObj.getDate()).padStart(2,'0');
            if (holidays.includes(dateString)) {
                dayElem.classList.add("is-holiday");
            }
        }
    });
}).catch(err => {
    console.error("공휴일 로드 오류:", err);
    // 실패 시 기본 이벤트 등록
    document.getElementById('analysisDate').addEventListener('change', (e) => {
        updateAnalysis(e.target.value);
    });
});

let barChartInstance = null;
let pieChartInstance = null;

// [조회] 일일 분석 리포트 업데이트 (선택 날짜 기준)
function updateAnalysis(dateString) {
    if (!dateString) {
        const today = new Date();
        dateString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        document.getElementById('analysisDate').value = dateString;
    }

    fetch('/api/analysis/daily?date=' + dateString).then(res => res.json()).then(data => {
        const list = document.getElementById('analysisList');
        
        let totalRevenue = 0;
        const labels = [];
        const soldData = [];
        const expiredData = [];
        const revenueData = [];

        if (data.length === 0) {
            list.innerHTML = '<tr><td colspan="5">해당 날짜의 데이터가 없습니다.</td></tr>';
            document.getElementById('totalRevenueDisplay').innerText = '0원';
            if(barChartInstance) barChartInstance.destroy();
            if(pieChartInstance) pieChartInstance.destroy();
        } else {
    
        // [3주차] 일괄 폐기 버튼 추가
        const disposeAllBtn = `
            <div style="text-align: center; margin-bottom: 15px;">
                <button onclick="disposeAllItems()" style="padding: 12px 20px; background: #343a40; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; width: 100%; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    🗑️ 알림 목록 일괄 수거 및 폐기 완료
                </button>
            </div>
        `;

        list.innerHTML = disposeAllBtn + data.map(i => {

                const itemRevenue = parseInt(i.total_revenue) || 0;
                totalRevenue += itemRevenue;
                
                // 차트 데이터 추가
                labels.push(i.item_name);
                soldData.push(i.sold_count);
                expiredData.push(i.expired_count);
                revenueData.push(itemRevenue);

                return `
                <tr>
                    <td style="text-align:left;">${i.item_name}</td>
                    <td>${i.total_in}</td>
                    <td style="color:blue; font-weight:bold;">${i.sold_count}</td>
                    <td style="color:red; font-weight:bold;">${i.expired_count}</td>
                    <td style="color:#28a745; font-weight:bold;">${itemRevenue.toLocaleString()}원</td>
                </tr>`;
            }).join('');
            
            document.getElementById('totalRevenueDisplay').innerText = `${totalRevenue.toLocaleString()}원`;
            renderCharts(labels, soldData, expiredData, revenueData);
        }
    });

    // 지능형 발주 추천/경고 가져오기
    fetch('/api/recommendation').then(res => res.json()).then(data => {
        const alertBox = document.getElementById('recommendationAlerts');
        if (data.length === 0) {
            alertBox.innerHTML = '<div style="padding: 10px; background: #e7f1ff; border-radius: 5px; text-align: center; color: #007bff; font-weight: bold;">💡 안심하세요! 반복적으로 폐기되는 상품 데이터가 없습니다.</div>';
        } else {
            const itemsHtml = data.map(i => {
                const cleanMsg = i.message.replace('🚨 경고: ', '');
                return `<div class="smart-alert-item">${cleanMsg}</div>`;
            }).join('');
            
            alertBox.innerHTML = `
                <div class="smart-alert-bar">
                    <div class="smart-alert-bar-title">🚨 스마트 발주 추천 및 경고</div>
                    ${itemsHtml}
                </div>
            `;
        }
    });
}

// [추가] 대시보드 차트 렌더링 함수
function renderCharts(labels, soldData, expiredData, revenueData) {
    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();

    // 1. 판매 vs 폐기 막대 차트
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '판매량 (개)',
                    data: soldData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    maxBarThickness: 40
                },
                {
                    label: '폐기량 (개)',
                    data: expiredData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    maxBarThickness: 40
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true, offset: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
                title: { display: true, text: '📈 상품별 판매 vs 폐기 현황', font: { size: 16 } }
            }
        }
    });

    // 2. 매출 비중 원형 차트
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: revenueData,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC926', '#1982C4'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: '💰 상품별 매출 기여도', font: { size: 16 } }
            }
        }
    });
}

let lastScannedBarcode = "";
let scanCooldownTimer = null;
const scanBeep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// [추가] 화면을 가리지 않는 하단 알림(Toast) 메시지 생성 함수
function showToast(message) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:12px 24px; border-radius:30px; z-index:9999; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    document.body.appendChild(toast);
    
    // 1.5초 뒤에 서서히 사라짐
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 1500);
}

// [핵심 개선] 바코드 스캔 성공 시 실행되는 함수 (초고속 연속 스캔 모드)
function onScanSuccess(decodedText) {
    if (isScanning) return; 

    // [스마트 쿨다운] 동일한 바코드가 2초 안에 다시 찍히는 것만 방지 (다른 상품은 딜레이 없이 즉시 스캔!)
    if (lastScannedBarcode === decodedText) {
        return; 
    }
    
    isScanning = true; 
    lastScannedBarcode = decodedText;
    
    // 2초 뒤에 쿨다운 해제 (같은 상품을 다시 스캔할 수 있게 됨)
    clearTimeout(scanCooldownTimer);
    scanCooldownTimer = setTimeout(() => {
        lastScannedBarcode = "";
    }, 2000);

    if (currentMode === 'inspect') {
        // 기존의 카메라 일시정지(pause) 로직을 없애서 카메라가 계속 돌게 만듦
        fetch('/api/inspect', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ barcode: decodedText }) 
        })
        .then(res => res.json())
        .then(data => {
            // [방어 코드] DB에 없는 상품(미등록 상품)이면 목록에 아예 추가하지 않음!
            if (data.itemName === "미등록 상품") {
                scanBeep.play().catch(e => console.log(e));
                showToast(`❌ 미등록 바코드입니다!`);
                isScanning = false;
                return;
            }

            // 팝업 제거 -> 사운드 재생 및 자동 추가
            scanBeep.play().catch(e => console.log(e));
            
            const existing = tempItems.find(i => i.barcode === data.barcode);
            if (!existing) {
                data.quantity = 1; 
                tempItems.push(data);
            } else {
                existing.quantity += 1;
            }
            renderList();
            
            // 팝업 대신 화면 하단에 부드럽게 메시지 표시
            showToast(`✅ ${data.itemName} 추가됨`);
            
            isScanning = false; // 즉시 다음 스캔 대기
        })
        .catch(err => {
            console.error("검수 에러:", err);
            isScanning = false;
        });

    } else if (currentMode === 'sale') {
        fetch('/api/sale', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ barcode: decodedText }) 
        })
        .then(res => res.json())
        .then(data => {
            scanBeep.play().catch(e => console.log(e));
            showToast(data.message.includes('❌') ? `❌ 실패: ${data.message}` : `💸 판매 처리 완료`);
            isScanning = false;
        })
        .catch(err => {
            console.error("결제 에러:", err);
            isScanning = false;
        });
    }
}

// [수정] 입고 검수 목록 렌더링 (삭제 버튼 추가)
function renderList() {
    const listBody = document.getElementById('inspectList');
    const finalizeBtn = document.getElementById('finalizeBtn');
    
    finalizeBtn.disabled = tempItems.length === 0;

    listBody.innerHTML = tempItems.map((item, index) => `
        <tr>
            <td style="text-align:left; font-size: 0.9rem;">${item.itemName}</td>
            <td>${item.expectedQty}</td>
            <td>
                <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                    <button onclick="changeQty(${index}, -1)" style="padding: 2px 6px; border: 1px solid #ccc; background: #fff; border-radius: 4px;">-</button>
                    <input type="number" 
                           value="${item.quantity}" 
                           min="1" 
                           onchange="updateQty(${index}, this.value)" 
                           style="width: 35px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 2px;">
                    <button onclick="changeQty(${index}, 1)" style="padding: 2px 6px; border: 1px solid #ccc; background: #fff; border-radius: 4px;">+</button>
                    <button onclick="removeItem(${index})" style="padding: 2px 6px; border: none; background: #dc3545; color: white; border-radius: 4px; margin-left: 3px; cursor: pointer;">X</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// [추가] 리스트에서 항목 삭제
window.removeItem = function(index) {
    tempItems.splice(index, 1);
    renderList();
};

// [추가] 수량 직접 입력 처리
window.updateQty = function(index, value) {
    const newQty = parseInt(value);
    if (newQty > 0) {
        tempItems[index].quantity = newQty;
    } else {
        tempItems[index].quantity = 1;
    }
    renderList();
};

// [추가] 버튼 클릭 수량 조절
window.changeQty = function(index, delta) {
    const newQty = tempItems[index].quantity + delta;
    if (newQty > 0) {
        tempItems[index].quantity = newQty;
        renderList();
    }
};

// [실행] 검수 완료 및 DB 저장
document.getElementById('finalizeBtn').onclick = () => {
    if (tempItems.length === 0) return;

    fetch('/api/finalize', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(tempItems) 
    })
    .then(res => res.json())
    .then(data => { 
        alert(data.message); 
        tempItems = []; 
        renderList(); 
    })
    .catch(err => alert("저장 중 오류가 발생했습니다."));
};

// ==========================================
// [기능 9주차] 푸시 알림 및 사운드 기능
// ==========================================
let isNotificationEnabled = false;
let pollingInterval = null;
const notifiedItems = new Map(); // 상품별 발송된 최고 알림 단계 저장 (1: 관심, 2: 주의, 3: 골든타임)

// 구글 제공 알람 사운드 사용
const alertSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

window.toggleNotifications = function() {
    if (!("Notification" in window)) {
        alert("이 브라우저는 데스크톱 알림을 지원하지 않습니다.");
        return;
    }

    if (isNotificationEnabled) {
        stopBackgroundMonitoring();
    } else {
        if (Notification.permission === "granted") {
            startBackgroundMonitoring();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    startBackgroundMonitoring();
                }
            });
        } else {
            alert("알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.");
        }
    }
};

function startBackgroundMonitoring() {
    isNotificationEnabled = true;
    
    // 버튼 UI 변경
    const btn = document.getElementById('notiBtn');
    btn.innerText = "🔔 알림 작동 중";
    btn.style.background = "#28a745"; // 녹색으로 변경

    // 사운드 재생 테스트
    alertSound.play().catch(e => console.log("오디오 재생 오류:", e));
    new Notification("FF POS 알림", { body: "실시간 폐기 모니터링이 시작되었습니다!" });

    // 1분(60000ms)마다 백그라운드 체크
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollAlerts, 60000);
    
    // 즉시 1회 실행
    pollAlerts();
}

function stopBackgroundMonitoring() {
    isNotificationEnabled = false;
    
    const btn = document.getElementById('notiBtn');
    btn.innerText = "🔕 알림 꺼짐";
    btn.style.background = "#6c757d"; // 회색으로 변경
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function pollAlerts() {
    fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) return;

            data.forEach(item => {
                // 알림 조건: 유통기한 앞뒤 1시간 이내 (-60분 <= 남은 시간 <= 60분)
                // 이미 폐기/판매 처리된 상품은 API 자체에서(status='selling') 걸러짐
                if (item.minutes_left <= 60 && item.minutes_left >= -60) {
                    let currentStage = 3; // 기본 3단계: 골든타임
                    if (item.minutes_left > 30) currentStage = 1;      // 1단계: 관심
                    else if (item.minutes_left > 10) currentStage = 2; // 2단계: 주의

                    const lastNotifiedStage = notifiedItems.get(item.id) || 0;
                    
                    // 현재 단계가 이전에 알림 보낸 단계보다 높을 경우에만 알림 발송
                    if (currentStage > lastNotifiedStage) {
                        notifiedItems.set(item.id, currentStage);
                        sendPushNotification(item.item_name, item.minutes_left, currentStage);
                    }
                }
            });
        })
        .catch(err => console.error("백그라운드 알림 폴링 에러:", err));
}

function sendPushNotification(itemName, minutesLeft, stage) {
    // 사운드 재생
    alertSound.play().catch(e => console.log("백그라운드 오디오 재생 오류:", e));

    let title = "🚨 폐기 임박 경고!";
    if (stage === 1) title = "🟡 폐기 관심 (60분 미만)";
    else if (stage === 2) title = "🟠 폐기 주의 (30분 미만)";
    else if (stage === 3) title = "🚨 골든타임! (10분 미만)";

    // 브라우저 푸시 알림 (진동 옵션 포함)
    const options = {
        body: `[${itemName}] 상품의 유통기한이 ${minutesLeft}분 남았습니다. 즉시 확인해주세요!`,
        icon: "icon.png",
        vibrate: [200, 100, 200, 100, 200] // 징- 징- 징- (스마트폰 진동 패턴)
    };
    new Notification(title, options);
}

// [3주차] 일괄 폐기 API 호출
window.disposeAllItems = function() {
    if(!confirm('목록에 있는 모든 상품을 일괄 폐기 처리하시겠습니까?')) return;

    fetch('/api/alerts').then(res => res.json()).then(data => {
        if(data.length === 0) return;
        const ids = data.map(item => item.id);
        
        fetch('/api/dispose-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        })
        .then(res => res.json())
        .then(resData => {
            alert(resData.message);
            checkExpiredAlerts(); // 새로고침
        })
        .catch(err => {
            console.error('일괄 폐기 에러:', err);
            alert('처리 중 오류가 발생했습니다.');
        });
    });
};

// [5~7주차] 일일 / 월간 / 계절별 리포트 뷰 전환 및 통계 & 발주 개편 추천 렌더링
window.switchAnalysisView = function(viewMode) {
    const btnMonthly = document.getElementById('btnMonthlyView');
    const btnSeasonal = document.getElementById('btnSeasonalView');
    const btnDaily = document.getElementById('btnDailyView');
    const monthlyBox = document.getElementById('monthlyPickerBox');
    const seasonalBox = document.getElementById('seasonalPickerBox');
    const dailyBox = document.getElementById('dailyPickerBox');
    const tableHead = document.getElementById('analysisTableHead');

    [btnMonthly, btnSeasonal, btnDaily].forEach(btn => {
        if (btn) {
            btn.style.background = 'white';
            btn.style.color = '#007bff';
            btn.style.border = '1px solid #007bff';
        }
    });

    if (viewMode === 'monthly') {
        btnMonthly.style.background = '#007bff';
        btnMonthly.style.color = 'white';
        monthlyBox.style.display = 'block';
        if (seasonalBox) seasonalBox.style.display = 'none';
        dailyBox.style.display = 'none';
        if (tableHead) {
            tableHead.innerHTML = '<th>상품명</th><th>총 입고</th><th>판매</th><th>폐기</th><th>판매율</th><th>매출액</th><th>차기 발주 권고</th>';
        }
        updateMonthlyAnalysis(document.getElementById('analysisMonth').value || '2025-10');
    } else if (viewMode === 'seasonal') {
        if (btnSeasonal) {
            btnSeasonal.style.background = '#007bff';
            btnSeasonal.style.color = 'white';
        }
        monthlyBox.style.display = 'none';
        if (seasonalBox) seasonalBox.style.display = 'block';
        dailyBox.style.display = 'none';
        if (tableHead) {
            tableHead.innerHTML = '<th>상품명</th><th>계절 총 입고</th><th>판매</th><th>폐기</th><th>판매율</th><th>매출액</th><th>계절 발주 전략</th>';
        }
        updateSeasonalAnalysis(document.getElementById('analysisSeason').value || 'spring');
    } else {
        btnDaily.style.background = '#007bff';
        btnDaily.style.color = 'white';
        monthlyBox.style.display = 'none';
        if (seasonalBox) seasonalBox.style.display = 'none';
        dailyBox.style.display = 'block';
        if (tableHead) {
            tableHead.innerHTML = '<th>상품명</th><th>총 입고</th><th>판매</th><th>폐기</th><th>매출액</th>';
        }
        updateAnalysis(document.getElementById('analysisDate').value || '2025-10-01');
    }
};

window.updateSeasonalAnalysis = function(seasonStr) {
    if (!seasonStr) seasonStr = 'spring';
    const seasonNames = {
        spring: '🌸 봄 시즌 (3~5월)',
        summer: '☀️ 여름 시즌 (6~8월)',
        autumn: '🍂 가을 시즌 (9~11월)',
        winter: '❄️ 겨울 시즌 (12~2월)'
    };

    fetch('/api/analysis/seasonal?season=' + seasonStr).then(res => res.json()).then(data => {
        const list = document.getElementById('analysisList');
        let totalRevenue = 0;
        const labels = [];
        const soldData = [];
        const expiredData = [];
        const revenueData = [];

        if (!data || data.length === 0) {
            list.innerHTML = '<tr><td colspan="7">해당 계절의 데이터가 없습니다.</td></tr>';
            document.getElementById('totalRevenueDisplay').innerText = '0원';
            if (barChartInstance) barChartInstance.destroy();
            if (pieChartInstance) pieChartInstance.destroy();
            return;
        }

        list.innerHTML = data.map(i => {
            const itemRevenue = parseInt(i.total_revenue) || 0;
            const rate = parseFloat(i.sales_rate) || 0;
            totalRevenue += itemRevenue;

            labels.push(i.item_name);
            soldData.push(Number(i.sold_count));
            expiredData.push(Number(i.expired_count));
            revenueData.push(itemRevenue);

            let badge = '';
            if (rate >= 82) {
                badge = '<span style="background:#e6f4ea; color:#1e7e34; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">🔥 계절 주력 (집중 발주)</span>';
            } else if (rate >= 68) {
                badge = '<span style="background:#fef7e0; color:#b06000; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">➖ 평시 유지</span>';
            } else {
                badge = '<span style="background:#fce8e6; color:#c5221f; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">❄️ 계절 비수기 (발주 축소)</span>';
            }

            return `
            <tr>
                <td style="text-align:left; font-weight:bold;">${i.item_name}</td>
                <td>${i.total_in}개</td>
                <td style="color:blue; font-weight:bold;">${i.sold_count}개</td>
                <td style="color:red; font-weight:bold;">${i.expired_count}개</td>
                <td style="font-weight:bold;">${rate}%</td>
                <td style="color:#28a745; font-weight:bold;">${itemRevenue.toLocaleString()}원</td>
                <td>${badge}</td>
            </tr>`;
        }).join('');

        document.getElementById('totalRevenueDisplay').innerText = `${totalRevenue.toLocaleString()}원 (${seasonNames[seasonStr] || seasonStr} 누적)`;
        renderCharts(labels, soldData, expiredData, revenueData);
    });
};

window.updateMonthlyAnalysis = function(monthStr) {
    if (!monthStr) monthStr = '2025-10';
    fetch('/api/analysis/monthly?month=' + monthStr).then(res => res.json()).then(data => {
        const list = document.getElementById('analysisList');
        let totalRevenue = 0;
        const labels = [];
        const soldData = [];
        const expiredData = [];
        const revenueData = [];

        if (!data || data.length === 0) {
            list.innerHTML = '<tr><td colspan="7">해당 월의 데이터가 없습니다.</td></tr>';
            document.getElementById('totalRevenueDisplay').innerText = '0원';
            if (barChartInstance) barChartInstance.destroy();
            if (pieChartInstance) pieChartInstance.destroy();
            return;
        }

        list.innerHTML = data.map(i => {
            const itemRevenue = parseInt(i.total_revenue) || 0;
            const rate = parseFloat(i.sales_rate) || 0;
            totalRevenue += itemRevenue;

            labels.push(i.item_name);
            soldData.push(Number(i.sold_count));
            expiredData.push(Number(i.expired_count));
            revenueData.push(itemRevenue);

            let badge = '';
            if (rate >= 80) {
                badge = '<span style="background:#e6f4ea; color:#1e7e34; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">🔺 발주 증량 (+30%)</span>';
            } else if (rate >= 60) {
                badge = '<span style="background:#fef7e0; color:#b06000; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">➖ 현행 유지</span>';
            } else {
                badge = '<span style="background:#fce8e6; color:#c5221f; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">🔻 발주 감축 (-50%)</span>';
            }

            return `
            <tr>
                <td style="text-align:left; font-weight:bold;">${i.item_name}</td>
                <td>${i.total_in}개</td>
                <td style="color:blue; font-weight:bold;">${i.sold_count}개</td>
                <td style="color:red; font-weight:bold;">${i.expired_count}개</td>
                <td style="font-weight:bold;">${rate}%</td>
                <td style="color:#28a745; font-weight:bold;">${itemRevenue.toLocaleString()}원</td>
                <td>${badge}</td>
            </tr>`;
        }).join('');

        document.getElementById('totalRevenueDisplay').innerText = `${totalRevenue.toLocaleString()}원 (${monthStr} 누적)`;
        renderCharts(labels, soldData, expiredData, revenueData);
    });
};


// ==========================================
// [단일 토글 버튼 알림 켜기/끄기 및 화면 내 알람 배너 연동]
// ==========================================
window.toggleNotifications = function() {
    if (isNotificationEnabled) {
        stopBackgroundMonitoring();
    } else {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().finally(() => {
                startBackgroundMonitoring();
            });
        } else {
            startBackgroundMonitoring();
        }
    }
};

function showInPageAlarmBanner(title, bodyText, borderColor) {
    let container = document.getElementById('inPageAlarmContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'inPageAlarmContainer';
        container.style.cssText = "position:fixed; top:70px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; max-width:340px; width:90%;";
        document.body.appendChild(container);
    }
    const card = document.createElement('div');
    card.style.cssText = `background:white; border-left:6px solid ${borderColor || '#dc3545'}; border-radius:10px; padding:14px 16px; box-shadow:0 8px 24px rgba(0,0,0,0.18); transition:0.3s; cursor:pointer;`;
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:0.95rem; color:#222;">${title}</strong>
            <span style="font-size:0.8rem; color:#888;">방금 전 ✕</span>
        </div>
        <div style="font-size:0.86rem; color:#555; line-height:1.4;">${bodyText}</div>
    `;
    card.onclick = () => card.remove();
    container.prepend(card);
    setTimeout(() => {
        if (card.parentNode) {
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        }
    }, 5500);
}

function startBackgroundMonitoring() {
    isNotificationEnabled = true;
    notifiedItems.clear();
    
    const btn = document.getElementById('notiBtn');
    if (btn) {
        btn.innerText = "🔔 알림 작동 중";
        btn.style.background = "#28a745";
    }

    alertSound.play().catch(e => console.log("오디오 재생 오류:", e));
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("FF POS 알림", { body: "실시간 폐기 모니터링이 시작되었습니다!" });
    }
    showInPageAlarmBanner("🔔 FF POS 실시간 알림 켜짐", "유통기한 임박 상품 모니터링이 시작되었습니다.", "#28a745");

    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(pollAlerts, 60000);
    pollAlerts();
}

function stopBackgroundMonitoring() {
    isNotificationEnabled = false;
    notifiedItems.clear();
    
    const btn = document.getElementById('notiBtn');
    if (btn) {
        btn.innerText = "🔕 알림 꺼짐";
        btn.style.background = "#6c757d";
    }
    const container = document.getElementById('inPageAlarmContainer');
    if (container) container.innerHTML = '';
    showToast("🔕 실시간 폐기 알림이 꺼졌습니다.");
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function pollAlerts() {
    fetch('/api/alerts')
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) return;

            let shownCount = 0;
            data.forEach(item => {
                if (item.minutes_left <= 180 && item.minutes_left >= -180) {
                    let currentStage = 3;
                    if (item.minutes_left > 30) currentStage = 1;
                    else if (item.minutes_left > 10) currentStage = 2;

                    const lastNotifiedStage = notifiedItems.get(item.id) || 0;
                    if (currentStage > lastNotifiedStage) {
                        notifiedItems.set(item.id, currentStage);
                        if (shownCount < 3) {
                            sendPushNotification(item.item_name, item.minutes_left, currentStage);
                            shownCount++;
                        }
                    }
                }
            });
        })
        .catch(err => console.error("백그라운드 알림 폴링 에러:", err));
}

function sendPushNotification(itemName, minutesLeft, stage) {
    alertSound.play().catch(e => console.log("백그라운드 오디오 재생 오류:", e));

    let title = "🚨 폐기 임박 경고!";
    let borderColor = "#dc3545";
    if (stage === 1) { title = "🟡 폐기 관심 (임박)"; borderColor = "#ffc107"; }
    else if (stage === 2) { title = "🟠 폐기 주의 (30분 미만)"; borderColor = "#fd7e14"; }
    else if (stage === 3) { title = "🚨 골든타임! (10분 미만)"; borderColor = "#dc3545"; }

    const bodyMsg = minutesLeft < 0 
        ? `[${itemName}] 유통기한이 ${Math.abs(minutesLeft)}분 경과했습니다! 즉시 수거하세요!`
        : `[${itemName}] 상품의 유통기한이 ${minutesLeft}분 남았습니다. 즉시 확인해주세요!`;

    showInPageAlarmBanner(title, bodyMsg, borderColor);

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: bodyMsg,
            icon: "icon.png",
            vibrate: [200, 100, 200, 100, 200]
        });
    }
}
