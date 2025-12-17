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

const transactionTableBody = document.getElementById('transaction-table-body');
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
    
    // Đặt ngày mặc định là ngày hiện tại
    document.getElementById('date').valueAsDate = new Date();
    
    // Sự kiện chuyển tháng
    document.getElementById('prev-month').addEventListener('click', function() { changeMonth(-1); });
    document.getElementById('next-month').addEventListener('click', function() { changeMonth(1); });

    // Thêm event listeners cho các form
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
    document.getElementById('add-source-form').addEventListener('submit', handleAddSource);
    document.getElementById('add-wallet-form').addEventListener('submit', handleAddWallet);
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
        renderTransactions();
        calculateSummary();
        renderCalendar();
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
            renderTransactions();
            calculateSummary();
            renderCalendar();
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
            '<span class="delete-wallet" data-wallet-id="' + wallet.id + '" title="Xóa ví">×</span>';
        
        // Click vào tab để chọn ví
        tab.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-wallet')) {
                return; // Bỏ qua nếu click vào nút xóa
            }
            selectWallet(wallet.id);
        });
        
        walletTabsContainer.appendChild(tab);
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
    renderTransactions();
    calculateSummary();
    renderCalendar();
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

function renderTransactions() {
    transactionTableBody.innerHTML = '';
    
    var filteredTransactions = getFilteredTransactions();
    filteredTransactions.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    filteredTransactions.forEach(function(t) {
        var row = transactionTableBody.insertRow();
        
        var walletCell = row.insertCell();
        walletCell.textContent = getWalletName(t.wallet);
        walletCell.className = 'wallet-cell';
        
        var typeCell = row.insertCell();
        typeCell.textContent = t.type === 'income' ? 'THU' : 'CHI';
        typeCell.className = t.type === 'income' ? 'transaction-income' : 'transaction-expense';

        row.insertCell().textContent = t.date;
        row.insertCell().textContent = t.description;
        row.insertCell().textContent = formatCurrency(t.amount);
        row.insertCell().textContent = t.category;
        row.insertCell().textContent = t.source;
        
        var actionCell = row.insertCell();
        var deleteButton = document.createElement('button');
        deleteButton.textContent = 'Xóa';
        deleteButton.className = 'delete-btn';
        deleteButton.setAttribute('data-id', t.id);
        deleteButton.addEventListener('click', function() {
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
        actionCell.appendChild(deleteButton);
    });
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
        date: document.getElementById('date').value,
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
    document.getElementById('date').valueAsDate = new Date();
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
        
        calendarGrid.appendChild(dayElement);
    }
}
