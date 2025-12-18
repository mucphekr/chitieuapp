// script.js - SỬ DỤNG FIREBASE COMPAT + QUẢN LÝ VÍ ĐỘNG

// 1. CẤU HÌNH FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDC1gme0hkUWK-np5sG4jqLO9LwgMOFF1M",
    authDomain: "chitieucacnhan.firebaseapp.com",
    projectId: "chitieucacnhan",
    storageBucket: "chitieucacnhan.firebasestorage.app",
    messagingSenderId: "591107537190",
    appId: "1:591107537190:web:21e716584f7043ca7429e7",
    measurementId: "G-SWZ590KJWN"
};

// 2. KHỞI TẠO FIREBASE
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Tham chiếu đến collections và documents
const transactionsCol = db.collection('transactions');
const settingsDoc = db.collection('settings').doc('appData');

// --- 3. CÁC BIẾN ỨNG DỤNG ---
let transactions = []; 
let categories = [];
let sources = [];
let wallets = []; // Danh sách ví động
let currentWallet = ''; // Ví hiện tại đang xem

// Biến cho History Section
let selectedDate = null;
const categorySelect = document.getElementById('category');
const sourceSelect = document.getElementById('source');
const walletSelect = document.getElementById('wallet');
const walletTabsContainer = document.getElementById('wallet-tabs');

// Biến cho Summary
const totalIncomeSummary = document.getElementById('total-income-summary');
const totalExpenseSummary = document.getElementById('total-expense-summary');
const netBalanceSummary = document.getElementById('net-balance-summary');
const netBalanceCard = document.querySelector('.net-balance');

// Biến cho Calendar
let currentMonth = new Date();
const currentMonthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');

// Biến cho Wallet
const currentWalletNameEl = document.getElementById('current-wallet-name');


// --- 4. LOGIC KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', function() {
    // Lắng nghe dữ liệu từ Firebase
    setupRealtimeListeners(); 
    
    // Khởi tạo lịch
    renderCalendar();
    
    // Khởi tạo date picker
    initDatePicker();
    
    // Sự kiện chuyển tháng (Calendar)
    document.getElementById('prev-month').addEventListener('click', function() { changeMonth(-1); });
    document.getElementById('next-month').addEventListener('click', function() { changeMonth(1); });
    
    // Sự kiện đóng chi tiết ngày
    document.getElementById('close-date-detail').addEventListener('click', function() { closeDateDetail(); });

    // Thêm event listeners cho các form
    setupEventListeners();
});

// --- HÀM KHỞI TẠO DATE PICKER ---
function initDatePicker() {
    var daySelect = document.getElementById('date-day');
    var monthSelect = document.getElementById('date-month');
    var yearSelect = document.getElementById('date-year');
    
    // Populate years (từ năm hiện tại - 5 đến năm hiện tại + 2)
    var currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (var y = currentYear - 5; y <= currentYear + 2; y++) {
        var option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }
    
    // Set current date
    var today = new Date();
    yearSelect.value = today.getFullYear();
    monthSelect.value = today.getMonth() + 1;
    updateDaysInMonth();
    daySelect.value = today.getDate();
    
    // Event listeners để cập nhật số ngày khi thay đổi tháng/năm
    monthSelect.addEventListener('change', updateDaysInMonth);
    yearSelect.addEventListener('change', updateDaysInMonth);
}

function updateDaysInMonth() {
    var daySelect = document.getElementById('date-day');
    var monthSelect = document.getElementById('date-month');
    var yearSelect = document.getElementById('date-year');
    
    var currentDay = parseInt(daySelect.value) || 1;
    var month = parseInt(monthSelect.value);
    var year = parseInt(yearSelect.value);
    
    // Tính số ngày trong tháng
    var daysInMonth = new Date(year, month, 0).getDate();
    
    // Populate days
    daySelect.innerHTML = '';
    for (var d = 1; d <= daysInMonth; d++) {
        var option = document.createElement('option');
        option.value = d;
        option.textContent = String(d).padStart(2, '0');
        daySelect.appendChild(option);
    }
    
    // Giữ ngày đã chọn nếu hợp lệ
    if (currentDay > daysInMonth) {
        daySelect.value = daysInMonth;
    } else {
        daySelect.value = currentDay;
    }
}

function getSelectedDate() {
    var day = document.getElementById('date-day').value;
    var month = document.getElementById('date-month').value;
    var year = document.getElementById('date-year').value;
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function setSelectedDate(dateStr) {
    var parts = dateStr.split('-');
    if (parts.length === 3) {
        var year = parseInt(parts[0]);
        var month = parseInt(parts[1]);
        var day = parseInt(parts[2]);
        
        document.getElementById('date-year').value = year;
        document.getElementById('date-month').value = month;
        updateDaysInMonth();
        document.getElementById('date-day').value = day;
    }
}

function setupEventListeners() {
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
    document.getElementById('add-source-form').addEventListener('submit', handleAddSource);
    document.getElementById('add-wallet-form').addEventListener('submit', handleAddWallet);
    
    // Event listeners cho modal chỉnh sửa
    document.getElementById('edit-wallet-form').addEventListener('submit', handleEditWallet);
    document.getElementById('edit-transaction-form').addEventListener('submit', handleEditTransaction);
    
    // Đóng modal khi click bên ngoài
    document.getElementById('edit-wallet-modal').addEventListener('click', function(e) {
        if (e.target === this) closeEditWalletModal();
    });
    document.getElementById('edit-transaction-modal').addEventListener('click', function(e) {
        if (e.target === this) closeEditTransactionModal();
    });
}


// --- 5. HÀM LẮNG NGHE DỮ LIỆU THỜI GIAN THỰC ---
function setupRealtimeListeners() {
    // 1. Lắng nghe Dữ liệu Giao Dịch
    transactionsCol.onSnapshot(function(snapshot) {
        transactions = [];
        snapshot.forEach(function(doc) {
            var data = doc.data();
            // Nếu giao dịch cũ không có wallet, gán mặc định
            if (!data.wallet) {
                data.wallet = 'chung';
            }
            transactions.push({ id: doc.id, ...data }); 
        });
        // Sau khi tải xong, vẽ lại giao diện
        calculateSummary();
        renderCalendar();
        // Nếu đang chọn ngày, cập nhật lại danh sách giao dịch
        if (selectedDate) {
            renderTransactionsForDate(selectedDate);
        }
    });

    // 2. Lắng nghe Dữ liệu Cài Đặt (Danh mục/Nguồn/Ví)
    settingsDoc.onSnapshot(function(docSnap) {
        if (docSnap.exists) {
            var data = docSnap.data();
            categories = data.categories || [];
            sources = data.sources || [];
            wallets = data.wallets || [
                { id: 'chung', icon: '🏠', name: 'Ví Chung' }
            ];
            
            // Nếu chưa có ví được chọn, chọn ví đầu tiên
            if (!currentWallet && wallets.length > 0) {
                currentWallet = wallets[0].id;
            }
            
            updateSelectOptions();
            renderTags();
            renderWalletTabs();
            renderWalletSelect();
            
            // Render lại khi có thay đổi
            calculateSummary();
            renderCalendar();
            // Nếu đang chọn ngày, cập nhật lại danh sách giao dịch
            if (selectedDate) {
                renderTransactionsForDate(selectedDate);
            }
        } else {
            // Lần đầu tiên chạy, tạo dữ liệu mặc định
            settingsDoc.set({
                categories: ["Ăn uống", "Lương", "Đi lại", "Mua sắm", "Tiền nhà"],
                sources: ["Tiền mặt", "Thẻ ATM", "Chuyển khoản"],
                wallets: [
                    { id: 'chung', icon: '🏠', name: 'Ví Chung' },
                    { id: 'chong', icon: '👨', name: 'Mực Phệ' },
                    { id: 'vo', icon: '👩', name: 'Gấu Chó' }
                ]
            });
        }
    });
}


// --- 6. QUẢN LÝ VÍ ---

// Render các tab ví
function renderWalletTabs() {
    walletTabsContainer.innerHTML = '';
    
    wallets.forEach(function(wallet) {
        var tab = document.createElement('button');
        tab.className = 'wallet-tab' + (wallet.id === currentWallet ? ' active' : '');
        tab.setAttribute('data-wallet', wallet.id);
        tab.innerHTML = wallet.icon + ' ' + wallet.name + 
            '<span class="edit-wallet" data-wallet-id="' + wallet.id + '" title="Sửa ví">✏️</span>' +
            '<span class="delete-wallet" data-wallet-id="' + wallet.id + '" title="Xóa ví">×</span>';
        
        // Click vào tab để chọn ví
        tab.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-wallet') || e.target.classList.contains('edit-wallet')) {
                return; // Bỏ qua nếu click vào nút xóa hoặc sửa
            }
            selectWallet(wallet.id);
        });
        
        walletTabsContainer.appendChild(tab);
    });
    
    // Thêm event listener cho nút sửa ví
    document.querySelectorAll('.edit-wallet').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var walletId = this.getAttribute('data-wallet-id');
            openEditWalletModal(walletId);
        });
    });
    
    // Thêm event listener cho nút xóa ví
    document.querySelectorAll('.delete-wallet').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var walletId = this.getAttribute('data-wallet-id');
            deleteWallet(walletId);
        });
    });
    
    // Cập nhật tên ví đang xem
    updateCurrentWalletDisplay();
}

// Render dropdown chọn ví trong form
function renderWalletSelect() {
    walletSelect.innerHTML = '';
    wallets.forEach(function(wallet) {
        var option = new Option(wallet.icon + ' ' + wallet.name, wallet.id);
        walletSelect.add(option);
    });
    walletSelect.value = currentWallet;
}

// Chọn ví
function selectWallet(walletId) {
    currentWallet = walletId;
    
    // Cập nhật UI tabs
    document.querySelectorAll('.wallet-tab').forEach(function(tab) {
        tab.classList.remove('active');
        if (tab.getAttribute('data-wallet') === walletId) {
            tab.classList.add('active');
        }
    });
    
    // Cập nhật dropdown
    walletSelect.value = walletId;
    
    // Cập nhật display
    updateCurrentWalletDisplay();
    
    // Render lại giao diện
    calculateSummary();
    renderCalendar();
    // Nếu đang chọn ngày, cập nhật lại danh sách giao dịch
    if (selectedDate) {
        renderTransactionsForDate(selectedDate);
    }
}

// Cập nhật hiển thị ví đang xem
function updateCurrentWalletDisplay() {
    var wallet = wallets.find(function(w) { return w.id === currentWallet; });
    if (wallet) {
        currentWalletNameEl.textContent = 'Đang xem: ' + wallet.icon + ' ' + wallet.name;
    }
}

// Lấy tên ví theo ID
function getWalletName(walletId) {
    var wallet = wallets.find(function(w) { return w.id === walletId; });
    if (wallet) {
        return wallet.icon + ' ' + wallet.name;
    }
    return walletId;
}

// Thêm ví mới
function handleAddWallet(e) {
    e.preventDefault();
    
    var icon = document.getElementById('new-wallet-icon').value.trim() || '💰';
    var name = document.getElementById('new-wallet-name').value.trim();
    
    if (!name) {
        alert('Vui lòng nhập tên ví!');
        return;
    }
    
    // Tạo ID từ tên (loại bỏ dấu, chuyển thường, thay space bằng _)
    var id = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    
    // Kiểm tra trùng
    if (wallets.some(function(w) { return w.id === id; })) {
        alert('Ví này đã tồn tại!');
        return;
    }
    
    wallets.push({ id: id, icon: icon, name: name });
    
    // Tự động chọn ví mới vừa tạo để có thể thêm giao dịch ngay
    currentWallet = id;
    
    updateSettings('wallets', wallets);
    
    e.target.reset();
}

// Xóa ví
function deleteWallet(walletId) {
    if (wallets.length <= 1) {
        alert('Phải có ít nhất 1 ví!');
        return;
    }
    
    var wallet = wallets.find(function(w) { return w.id === walletId; });
    var walletName = wallet ? wallet.icon + ' ' + wallet.name : walletId;
    
    // Đếm số giao dịch trong ví này
    var transactionCount = transactions.filter(function(t) { return t.wallet === walletId; }).length;
    
    var confirmMsg = 'Bạn có chắc muốn xóa ví "' + walletName + '"?';
    if (transactionCount > 0) {
        confirmMsg += '\n\n⚠️ Ví này có ' + transactionCount + ' giao dịch. Các giao dịch sẽ KHÔNG bị xóa nhưng sẽ không hiển thị.';
    }
    
    if (confirm(confirmMsg)) {
        wallets = wallets.filter(function(w) { return w.id !== walletId; });
        updateSettings('wallets', wallets);
        
        // Nếu đang xem ví bị xóa, chuyển sang ví đầu tiên
        if (currentWallet === walletId && wallets.length > 0) {
            selectWallet(wallets[0].id);
        }
    }
}

// Mở modal chỉnh sửa ví
function openEditWalletModal(walletId) {
    var wallet = wallets.find(function(w) { return w.id === walletId; });
    if (!wallet) return;
    
    document.getElementById('edit-wallet-id').value = walletId;
    document.getElementById('edit-wallet-icon').value = wallet.icon;
    document.getElementById('edit-wallet-name').value = wallet.name;
    
    document.getElementById('edit-wallet-modal').style.display = 'flex';
}

// Đóng modal chỉnh sửa ví
function closeEditWalletModal() {
    document.getElementById('edit-wallet-modal').style.display = 'none';
}

// Xử lý lưu chỉnh sửa ví
function handleEditWallet(e) {
    e.preventDefault();
    
    var walletId = document.getElementById('edit-wallet-id').value;
    var newIcon = document.getElementById('edit-wallet-icon').value.trim() || '💰';
    var newName = document.getElementById('edit-wallet-name').value.trim();
    
    if (!newName) {
        alert('Vui lòng nhập tên ví!');
        return;
    }
    
    // Cập nhật ví trong danh sách
    wallets = wallets.map(function(w) {
        if (w.id === walletId) {
            return { id: w.id, icon: newIcon, name: newName };
        }
        return w;
    });
    
    updateSettings('wallets', wallets);
    closeEditWalletModal();
}


// --- 7. TÍNH TOÁN & HIỂN THỊ CHUNG ---

// Đổi đơn vị tiền sang Won (KRW)
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

// Lọc giao dịch theo ví hiện tại
function getFilteredTransactions() {
    return transactions.filter(function(t) { return t.wallet === currentWallet; });
}

function calculateSummary() {
    var totalIncome = 0;
    var totalExpense = 0;
    
    var filteredTransactions = getFilteredTransactions();
    
    filteredTransactions.forEach(function(t) {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else if (t.type === 'expense') {
            totalExpense += t.amount;
        }
    });
    
    var netBalance = totalIncome - totalExpense;
    
    totalIncomeSummary.textContent = formatCurrency(totalIncome);
    totalExpenseSummary.textContent = formatCurrency(totalExpense);
    netBalanceSummary.textContent = formatCurrency(netBalance);
    
    if (netBalance < 0) {
        netBalanceCard.classList.add('negative');
    } else {
        netBalanceCard.classList.remove('negative');
    }
}

// --- 10. LOGIC LỊCH SỬ GIAO DỊCH THEO NGÀY ---

function selectDateForHistory(dateStr) {
    selectedDate = dateStr;
    
    // Hiển thị thông tin ngày đã chọn
    var dateObj = new Date(dateStr);
    var dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    document.getElementById('selected-date-text').textContent = '📅 ' + dayNames[dateObj.getDay()] + ', ' + dateObj.getDate() + '/' + (dateObj.getMonth() + 1) + '/' + dateObj.getFullYear();
    
    // Hiển thị section chi tiết giao dịch
    document.getElementById('transaction-detail-section').style.display = 'block';
    
    // Cập nhật ngày trong form Thêm Giao Dịch Mới
    setSelectedDate(dateStr);
    
    // Cập nhật highlight ngày trong lịch
    renderCalendar();
    
    renderTransactionsForDate(dateStr);
}

function renderTransactionsForDate(dateStr) {
    var list = document.getElementById('transaction-list');
    var summaryEl = document.getElementById('selected-date-summary');
    
    // Lọc giao dịch theo ngày
    var dayTransactions = getFilteredTransactions().filter(function(t) {
        return t.date === dateStr;
    });
    
    // Sắp xếp theo thời gian (mới nhất trước)
    dayTransactions.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    
    // Tính tổng
    var totalIncome = 0;
    var totalExpense = 0;
    dayTransactions.forEach(function(t) {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    });
    
    // Hiển thị tóm tắt
    summaryEl.innerHTML = '';
    if (totalIncome > 0) {
        var incomeSpan = document.createElement('span');
        incomeSpan.className = 'summary-item income';
        incomeSpan.textContent = '📈 Thu: ' + formatCurrency(totalIncome);
        summaryEl.appendChild(incomeSpan);
    }
    if (totalExpense > 0) {
        var expenseSpan = document.createElement('span');
        expenseSpan.className = 'summary-item expense';
        expenseSpan.textContent = '📉 Chi: ' + formatCurrency(totalExpense);
        summaryEl.appendChild(expenseSpan);
    }
    if (dayTransactions.length > 0) {
        var countSpan = document.createElement('span');
        countSpan.className = 'summary-item';
        countSpan.textContent = '📝 ' + dayTransactions.length + ' giao dịch';
        summaryEl.appendChild(countSpan);
    }
    
    // Render danh sách giao dịch
    list.innerHTML = '';
    
    if (dayTransactions.length === 0) {
        var emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<div class="empty-icon">📭</div><p>Không có giao dịch nào trong ngày này</p>';
        list.appendChild(emptyState);
        return;
    }
    
    dayTransactions.forEach(function(t) {
        var card = document.createElement('div');
        card.className = 'transaction-card ' + t.type;
        
        // Icon
        var icon = document.createElement('div');
        icon.className = 'transaction-icon';
        icon.textContent = t.type === 'income' ? '💰' : '💸';
        card.appendChild(icon);
        
        // Details
        var details = document.createElement('div');
        details.className = 'transaction-details';
        
        var desc = document.createElement('div');
        desc.className = 'transaction-description';
        desc.textContent = t.description;
        details.appendChild(desc);
        
        var meta = document.createElement('div');
        meta.className = 'transaction-meta';
        meta.innerHTML = '<span>' + t.category + '</span><span>' + t.source + '</span>';
        details.appendChild(meta);
        
        card.appendChild(details);
        
        // Amount
        var amount = document.createElement('div');
        amount.className = 'transaction-amount';
        amount.textContent = (t.type === 'income' ? '+' : '-') + formatCurrency(t.amount);
        card.appendChild(amount);
        
        // Action buttons
        var actions = document.createElement('div');
        actions.className = 'transaction-actions';
        
        // Edit button
        var editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Sửa';
        editBtn.setAttribute('data-id', t.id);
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            openEditTransactionModal(id);
        });
        actions.appendChild(editBtn);
        
        // Delete button
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Xóa';
        deleteBtn.setAttribute('data-id', t.id);
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-id');
            if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
                transactionsCol.doc(id).delete()
                    .then(function() {
                        console.log('Đã xóa thành công!');
                    })
                    .catch(function(error) {
                        console.error("Lỗi khi xóa giao dịch: ", error);
                        alert("Lỗi khi xóa giao dịch.");
                    });
            }
        });
        actions.appendChild(deleteBtn);
        card.appendChild(actions);
        
        list.appendChild(card);
    });
}

// --- MODAL CHỈNH SỬA GIAO DỊCH ---

// Khởi tạo date picker cho modal edit
function initEditDatePicker() {
    var yearSelect = document.getElementById('edit-date-year');
    var currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (var y = currentYear - 5; y <= currentYear + 2; y++) {
        var option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }
    
    // Event listeners
    document.getElementById('edit-date-month').addEventListener('change', updateEditDaysInMonth);
    document.getElementById('edit-date-year').addEventListener('change', updateEditDaysInMonth);
}

function updateEditDaysInMonth() {
    var daySelect = document.getElementById('edit-date-day');
    var month = parseInt(document.getElementById('edit-date-month').value);
    var year = parseInt(document.getElementById('edit-date-year').value);
    var currentDay = parseInt(daySelect.value) || 1;
    
    var daysInMonth = new Date(year, month, 0).getDate();
    
    daySelect.innerHTML = '';
    for (var d = 1; d <= daysInMonth; d++) {
        var option = document.createElement('option');
        option.value = d;
        option.textContent = String(d).padStart(2, '0');
        daySelect.appendChild(option);
    }
    
    daySelect.value = currentDay > daysInMonth ? daysInMonth : currentDay;
}

// Mở modal chỉnh sửa giao dịch
function openEditTransactionModal(transactionId) {
    var transaction = transactions.find(function(t) { return t.id === transactionId; });
    if (!transaction) return;
    
    // Khởi tạo date picker nếu chưa có
    if (document.getElementById('edit-date-year').options.length === 0) {
        initEditDatePicker();
    }
    
    // Cập nhật category và source options
    var editCategorySelect = document.getElementById('edit-category');
    var editSourceSelect = document.getElementById('edit-source');
    
    editCategorySelect.innerHTML = '';
    categories.forEach(function(cat) {
        var option = new Option(cat, cat);
        editCategorySelect.add(option);
    });
    
    editSourceSelect.innerHTML = '';
    sources.forEach(function(src) {
        var option = new Option(src, src);
        editSourceSelect.add(option);
    });
    
    // Điền dữ liệu vào form
    document.getElementById('edit-transaction-id').value = transactionId;
    document.getElementById('edit-type').value = transaction.type;
    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-description').value = transaction.description;
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-source').value = transaction.source;
    
    // Điền ngày
    var dateParts = transaction.date.split('-');
    document.getElementById('edit-date-year').value = parseInt(dateParts[0]);
    document.getElementById('edit-date-month').value = parseInt(dateParts[1]);
    updateEditDaysInMonth();
    document.getElementById('edit-date-day').value = parseInt(dateParts[2]);
    
    document.getElementById('edit-transaction-modal').style.display = 'flex';
}

// Đóng modal chỉnh sửa giao dịch
function closeEditTransactionModal() {
    document.getElementById('edit-transaction-modal').style.display = 'none';
}

// Xử lý lưu chỉnh sửa giao dịch
function handleEditTransaction(e) {
    e.preventDefault();
    
    var transactionId = document.getElementById('edit-transaction-id').value;
    var day = document.getElementById('edit-date-day').value;
    var month = document.getElementById('edit-date-month').value;
    var year = document.getElementById('edit-date-year').value;
    var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    
    var updatedData = {
        type: document.getElementById('edit-type').value,
        date: dateStr,
        amount: parseFloat(document.getElementById('edit-amount').value),
        description: document.getElementById('edit-description').value,
        category: document.getElementById('edit-category').value,
        source: document.getElementById('edit-source').value
    };
    
    if (isNaN(updatedData.amount) || updatedData.amount <= 0) {
        alert("Số tiền không hợp lệ!");
        return;
    }
    
    transactionsCol.doc(transactionId).update(updatedData)
        .then(function() {
            console.log('Đã cập nhật giao dịch thành công!');
            closeEditTransactionModal();
        })
        .catch(function(error) {
            console.error("Lỗi khi cập nhật giao dịch: ", error);
            alert("Lỗi khi cập nhật giao dịch.");
        });
}

function closeDateDetail() {
    selectedDate = null;
    
    // Ẩn section chi tiết giao dịch
    document.getElementById('transaction-detail-section').style.display = 'none';
    
    // Cập nhật lịch để bỏ highlight
    renderCalendar();
}

function updateSelectOptions() {
    categorySelect.innerHTML = '';
    categories.forEach(function(cat) {
        var option = new Option(cat, cat);
        categorySelect.add(option);
    });

    sourceSelect.innerHTML = '';
    sources.forEach(function(src) {
        var option = new Option(src, src);
        sourceSelect.add(option);
    });
}

function renderTags() {
    var categoryList = document.getElementById('category-list');
    var sourceList = document.getElementById('source-list');
    
    categoryList.innerHTML = '';
    categories.forEach(function(cat) {
        categoryList.appendChild(createTagElement(cat, 'category'));
    });
    
    sourceList.innerHTML = '';
    sources.forEach(function(src) {
        sourceList.appendChild(createTagElement(src, 'source'));
    });
}

function createTagElement(name, type) {
    var tag = document.createElement('span');
    tag.textContent = name;
    var removeButton = document.createElement('span');
    removeButton.textContent = 'x';
    removeButton.className = 'remove-tag';
    removeButton.setAttribute('data-name', name);
    removeButton.setAttribute('data-type', type);
    removeButton.addEventListener('click', function() {
        var tagName = this.getAttribute('data-name');
        var tagType = this.getAttribute('data-type');
        if (confirm('Bạn có chắc muốn xóa "' + tagName + '"?')) {
            if (tagType === 'category') {
                var updatedCategories = categories.filter(function(c) { return c !== tagName; });
                updateSettings('categories', updatedCategories);
            } else {
                var updatedSources = sources.filter(function(s) { return s !== tagName; });
                updateSettings('sources', updatedSources); 
            }
        }
    });
    tag.appendChild(removeButton);
    return tag;
}


// --- 8. LOGIC THÊM / XÓA GIAO DỊCH ---

function handleAddTransaction(e) {
    e.preventDefault();

    var newTransaction = {
        wallet: document.getElementById('wallet').value,
        type: document.getElementById('type').value,
        date: getSelectedDate(),
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        source: document.getElementById('source').value
    };
    
    if (isNaN(newTransaction.amount) || newTransaction.amount <= 0) {
        alert("Số tiền không hợp lệ!");
        return;
    }

    transactionsCol.add(newTransaction)
        .then(function() {
            console.log('Đã thêm giao dịch thành công!');
        })
        .catch(function(error) {
            console.error("Lỗi khi ghi giao dịch: ", error);
            alert("Lỗi khi ghi dữ liệu. Kiểm tra kết nối.");
        });

    e.target.reset(); 
    initDatePicker(); // Reset date picker về ngày hiện tại
    document.getElementById('wallet').value = currentWallet;
}

function updateSettings(field, newArray) {
    var updateData = {};
    updateData[field] = newArray;
    settingsDoc.update(updateData)
        .catch(function(error) { console.error('Lỗi khi cập nhật ' + field + ': ', error); });
}

function handleAddCategory(e) {
    e.preventDefault();
    var newCat = document.getElementById('new-category').value.trim();
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        updateSettings('categories', categories); 
        e.target.reset();
    }
}

function handleAddSource(e) {
    e.preventDefault();
    var newSrc = document.getElementById('new-source').value.trim();
    if (newSrc && !sources.includes(newSrc)) {
        sources.push(newSrc);
        updateSettings('sources', sources);
        e.target.reset();
    }
}


// --- 9. LOGIC LỊCH THÁNG ---

function changeMonth(step) {
    currentMonth.setMonth(currentMonth.getMonth() + step);
    renderCalendar();
}

function renderCalendar() {
    var year = currentMonth.getFullYear();
    var month = currentMonth.getMonth();

    currentMonthDisplay.textContent = 'Tháng ' + (month + 1) + ' Năm ' + year;

    var dailySummary = {};
    var currentMonthTransactions = getFilteredTransactions().filter(function(t) {
        var tDate = new Date(t.date);
        return tDate.getFullYear() === year && tDate.getMonth() === month;
    });

    currentMonthTransactions.forEach(function(t) {
        var day = new Date(t.date).getDate();
        if (!dailySummary[day]) {
            dailySummary[day] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            dailySummary[day].income += t.amount;
        } else {
            dailySummary[day].expense += t.amount;
        }
    });

    calendarGrid.innerHTML = '';
    var dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    dayNames.forEach(function(day) {
        var header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    var firstDayOfMonth = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < firstDayOfMonth; i++) {
        var emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }

    for (var day = 1; day <= daysInMonth; day++) {
        var dayElement = document.createElement('div');
        dayElement.className = 'calendar-day current-month';
        
        // Đánh dấu ngày đang được chọn
        if (selectedDate) {
            var selDate = new Date(selectedDate);
            if (selDate.getFullYear() === year && selDate.getMonth() === month && selDate.getDate() === day) {
                dayElement.classList.add('selected');
            }
        }

        var dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        if (dailySummary[day]) {
            var summary = dailySummary[day];
            
            if (summary.income > 0) {
                var incomeSpan = document.createElement('span');
                incomeSpan.className = 'day-income';
                incomeSpan.textContent = '+' + formatCurrency(summary.income);
                dayElement.appendChild(incomeSpan);
            }

            if (summary.expense > 0) {
                var expenseSpan = document.createElement('span');
                expenseSpan.className = 'day-expense';
                expenseSpan.textContent = '-' + formatCurrency(summary.expense);
                dayElement.appendChild(expenseSpan);
            }
        }
        
        // Thêm style clickable
        dayElement.style.cursor = 'pointer';
        
        // Click vào ngày để xem chi tiết giao dịch
        (function(d, y, m) {
            dayElement.addEventListener('click', function() {
                var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
                selectDateForHistory(dateStr);
                // Scroll đến phần chi tiết giao dịch
                document.getElementById('transaction-detail-section').scrollIntoView({ behavior: 'smooth' });
            });
        })(day, year, month);
        
        calendarGrid.appendChild(dayElement);
    }
}
