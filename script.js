// script.js - SỬ DỤNG FIREBASE COMPAT (hoạt động khi mở trực tiếp trên trình duyệt)

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
let currentWallet = 'chung'; // Ví hiện tại đang xem

// Lấy tên ví từ HTML
function getWalletName(walletId) {
    const tab = document.querySelector('.wallet-tab[data-wallet="' + walletId + '"]');
    if (tab) {
        return tab.textContent.trim();
    }
    const option = document.querySelector('#wallet option[value="' + walletId + '"]');
    return option ? option.textContent.trim() : walletId;
}

const transactionTableBody = document.getElementById('transaction-table-body');
const categorySelect = document.getElementById('category');
const sourceSelect = document.getElementById('source');
const walletSelect = document.getElementById('wallet');

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
const walletTabs = document.querySelectorAll('.wallet-tab');
const currentWalletName = document.getElementById('current-wallet-name');


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
    
    // Setup wallet tabs
    setupWalletTabs();
});

function setupEventListeners() {
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);
    document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
    document.getElementById('add-source-form').addEventListener('submit', handleAddSource);
}

function setupWalletTabs() {
    walletTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            // Xóa class active từ tất cả tabs
            walletTabs.forEach(function(t) { t.classList.remove('active'); });
            // Thêm class active vào tab được click
            tab.classList.add('active');
            
            // Cập nhật ví hiện tại
            currentWallet = tab.dataset.wallet;
            currentWalletName.textContent = 'Đang xem: ' + tab.textContent.trim();
            
            // Cập nhật wallet selector trong form
            walletSelect.value = currentWallet;
            
            // Render lại giao diện
            renderTransactions();
            calculateSummary();
            renderCalendar();
        });
    });
}


// --- 5. HÀM LẮNG NGHE DỮ LIỆU THỜI GIAN THỰC ---
function setupRealtimeListeners() {
    // 1. Lắng nghe Dữ liệu Giao Dịch
    transactionsCol.onSnapshot(function(snapshot) {
        transactions = [];
        snapshot.forEach(function(doc) {
            var data = doc.data();
            // Nếu giao dịch cũ không có wallet, gán mặc định là 'chung'
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

    // 2. Lắng nghe Dữ liệu Cài Đặt (Danh mục/Nguồn)
    settingsDoc.onSnapshot(function(docSnap) {
        if (docSnap.exists) {
            var data = docSnap.data();
            categories = data.categories || [];
            sources = data.sources || [];
            updateSelectOptions();
            renderTags();
        } else {
            // Lần đầu tiên chạy, tạo dữ liệu mặc định trên đám mây
            settingsDoc.set({
                categories: ["Ăn uống", "Lương", "Đi lại", "Mua sắm", "Tiền nhà"],
                sources: ["Tiền mặt", "Thẻ ATM", "Chuyển khoản"]
            });
        }
    });
}


// --- 6. TÍNH TOÁN & HIỂN THỊ CHUNG ---

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
    
    // Chỉ tính cho ví hiện tại
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
    
    // Lọc và sắp xếp giao dịch theo ví hiện tại
    var filteredTransactions = getFilteredTransactions();
    filteredTransactions.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    filteredTransactions.forEach(function(t) {
        var row = transactionTableBody.insertRow();
        
        // Cột Ví
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
        if (confirm('Bạn có chắc muốn xóa "' + tagName + '" khỏi danh sách ' + tagType + ' không?')) {
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


// --- 7. LOGIC THÊM / XÓA GIAO DỊCH ---

// Thêm giao dịch
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

    // Lưu lên Firebase
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
    // Giữ lại ví đang chọn
    document.getElementById('wallet').value = currentWallet;
}

// Hàm chung để cập nhật cài đặt
function updateSettings(field, newArray) {
    var updateData = {};
    updateData[field] = newArray;
    settingsDoc.update(updateData)
        .catch(function(error) { console.error('Lỗi khi cập nhật ' + field + ': ', error); });
}

// Thêm Danh Mục mới
function handleAddCategory(e) {
    e.preventDefault();
    var newCat = document.getElementById('new-category').value.trim();
    if (newCat && !categories.includes(newCat)) {
        categories.push(newCat);
        updateSettings('categories', categories); 
        e.target.reset();
    }
}

// Thêm Nguồn Tiền mới
function handleAddSource(e) {
    e.preventDefault();
    var newSrc = document.getElementById('new-source').value.trim();
    if (newSrc && !sources.includes(newSrc)) {
        sources.push(newSrc);
        updateSettings('sources', sources);
        e.target.reset();
    }
}


// --- 8. LOGIC LỊCH THÁNG ---

function changeMonth(step) {
    currentMonth.setMonth(currentMonth.getMonth() + step);
    renderCalendar();
}

function renderCalendar() {
    var year = currentMonth.getFullYear();
    var month = currentMonth.getMonth();

    currentMonthDisplay.textContent = 'Tháng ' + (month + 1) + ' Năm ' + year;

    // 1. Dữ liệu tổng hợp Thu/Chi theo ngày (chỉ cho ví hiện tại)
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

    // 2. Tạo cấu trúc lịch
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

    // 3. Đổ ngày trống (padding)
    for (var i = 0; i < firstDayOfMonth; i++) {
        var emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }

    // 4. Đổ ngày trong tháng
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
