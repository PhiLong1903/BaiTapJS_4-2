// --- CẤU HÌNH & TRẠNG THÁI ---
const API_URL = 'https://api.escuelajs.co/api/v1/products';
let allProducts = [];       // Dữ liệu gốc từ API
let filteredProducts = [];  // Dữ liệu sau khi tìm kiếm/sắp xếp

let currentPage = 1;
let pageSize = 10;
let sortCol = '';
let sortAsc = true;

// Modal instance
let productModal;

// --- KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Bootstrap Modal
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    
    // Tải dữ liệu ban đầu
    fetchData();
    
    // Gán sự kiện (Event Listeners)
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('pageSizeSelect').addEventListener('change', handlePageSizeChange);
    document.getElementById('btnSave').addEventListener('click', handleSave);
    document.getElementById('btnOpenCreate').addEventListener('click', openCreateModal);
    document.getElementById('btnExport').addEventListener('click', exportToCSV);

    // Gán sự kiện sort cho các cột có class .sortable
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            handleSort(column);
        });
    });
});

// --- TẢI DỮ LIỆU ---
async function fetchData() {
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json();
        filteredProducts = [...allProducts]; // Copy ban đầu
        renderTable();
        renderPagination();
    } catch (error) {
        alert('Lỗi khi tải dữ liệu: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// --- RENDER DỮ LIỆU ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Tính toán slice cho phân trang
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredProducts.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Không tìm thấy dữ liệu</td></tr>';
        document.getElementById('pageInfo').innerText = '';
        return;
    }

    pageData.forEach(item => {
        // Xử lý ảnh: API trả về mảng, đôi khi là chuỗi JSON bị lỗi, cần clean
        let imgUrl = "https://via.placeholder.com/50";
        if (item.images && item.images.length > 0) {
            // Clean các ký tự lạ do fakeapi đôi khi trả về string dạng '["url"]'
            let cleanUrl = item.images[0].replace(/[\[\]"]/g, '');
            if(cleanUrl.startsWith('http')) imgUrl = cleanUrl;
        }

        const tr = document.createElement('tr');
        
        // Yêu cầu: Description hiển thị khi di chuột (title attribute)
        tr.setAttribute('title', item.description || "No description");
        
        // Sự kiện click vào dòng để xem chi tiết
        tr.onclick = () => openEditModal(item);

        tr.innerHTML = `
            <td>${item.id}</td>
            <td class="fw-bold text-primary">${item.title}</td>
            <td>$${item.price}</td>
            <td><span class="badge bg-info text-dark">${item.category ? item.category.name : 'N/A'}</span></td>
            <td><img src="${imgUrl}" class="product-img" alt="img" onerror="this.src='https://via.placeholder.com/50'"></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('pageInfo').innerText = 
        `Hiển thị ${start + 1}-${Math.min(end, filteredProducts.length)} trên tổng số ${filteredProducts.length} mục`;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    if (totalPages === 0) return;

    // Helper tạo thẻ li
    const createPageItem = (text, page, isActive = false, isDisabled = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
        if (!isDisabled && !isActive) {
            li.onclick = (e) => {
                e.preventDefault();
                changePage(page);
            };
        }
        return li;
    };

    // Nút Prev
    pagination.appendChild(createPageItem('Trước', currentPage - 1, false, currentPage === 1));

    // Các trang (hiển thị tối đa 5 nút quanh trang hiện tại để gọn)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPageItem(i, i, i === currentPage));
    }

    // Nút Next
    pagination.appendChild(createPageItem('Sau', currentPage + 1, false, currentPage === totalPages));
}

// --- CÁC HÀM XỬ LÝ SỰ KIỆN ---

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
}

function handlePageSizeChange(e) {
    pageSize = parseInt(e.target.value);
    currentPage = 1; // Reset về trang 1 khi đổi size
    renderTable();
    renderPagination();
}

function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(p => 
        p.title.toLowerCase().includes(keyword)
    );
    
    // Giữ lại sort nếu đang sort
    if (sortCol) applySort();
    
    currentPage = 1;
    renderTable();
    renderPagination();
}

function handleSort(column) {
    // Đảo chiều nếu click lại cột cũ, mặc định Asc nếu cột mới
    if (sortCol === column) {
        sortAsc = !sortAsc;
    } else {
        sortCol = column;
        sortAsc = true;
    }

    // Cập nhật icon
    updateSortIcons(column, sortAsc);
    applySort();
    renderTable();
}

function applySort() {
    filteredProducts.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });
}

function updateSortIcons(col, asc) {
    // Reset icons
    document.getElementById('icon-title').className = 'fas fa-sort';
    document.getElementById('icon-price').className = 'fas fa-sort';
    
    // Set active icon
    const icon = document.getElementById(`icon-${col}`);
    if(icon) {
        icon.className = asc ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
}

// --- XỬ LÝ MODAL (VIEW / EDIT / CREATE) ---

function openCreateModal() {
    resetForm();
    document.getElementById('modalTitle').innerText = "Tạo sản phẩm mới";
    document.getElementById('btnSave').innerText = "Tạo mới";
    document.getElementById('btnSave').dataset.action = "create";
    productModal.show();
}

function openEditModal(product) {
    // Fill data
    document.getElementById('prodId').value = product.id;
    document.getElementById('prodTitle').value = product.title;
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodDesc').value = product.description;
    document.getElementById('prodCategoryId').value = product.category ? product.category.id : 1;
    
    // Handle Image
    let img = "";
    if (product.images && product.images.length > 0) {
            img = product.images[0].replace(/[\[\]"]/g, '');
    }
    document.getElementById('prodImage').value = img;
    document.getElementById('imagePreview').src = img;
    document.getElementById('imagePreview').style.display = img ? 'block' : 'none';

    // UI Setup
    document.getElementById('modalTitle').innerText = `Chỉnh sửa: ${product.title}`;
    document.getElementById('btnSave').innerText = "Cập nhật";
    document.getElementById('btnSave').dataset.action = "update";
    
    productModal.show();
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
}

async function handleSave() {
    const action = document.getElementById('btnSave').dataset.action;
    
    const data = {
        title: document.getElementById('prodTitle').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        description: document.getElementById('prodDesc').value,
        categoryId: parseInt(document.getElementById('prodCategoryId').value),
        images: [document.getElementById('prodImage').value || "https://placeimg.com/640/480/any"]
    };

    showLoading(true);
    try {
        if (action === 'create') {
            // API Create (POST)
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create');
            const newProduct = await res.json();
            
            // Thêm vào đầu danh sách
            allProducts.unshift(newProduct);
            alert("Tạo thành công!");

        } else {
            // API Update (PUT)
            const id = document.getElementById('prodId').value;
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update');
            const updatedProduct = await res.json();

            // Cập nhật trong mảng cục bộ
            const index = allProducts.findIndex(p => p.id == id);
            if (index !== -1) allProducts[index] = updatedProduct;
            alert("Cập nhật thành công!");
        }

        // Refresh UI
        productModal.hide();
        // Reset filter/sort logic để thấy item mới
        handleSearch({target: {value: document.getElementById('searchInput').value}});
        
    } catch (error) {
        alert("Có lỗi xảy ra: " + error.message);
    } finally {
        showLoading(false);
    }
}

// --- XUẤT CSV ---
function exportToCSV() {
    if (filteredProducts.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }

    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Title,Price,Category,Description\n";

    // Rows (Dữ liệu hiện tại đang hiển thị/filter)
    filteredProducts.forEach(row => {
        // Xử lý dấu phẩy trong nội dung để không vỡ CSV
        const title = row.title ? row.title.replace(/,/g, " ") : "";
        const cat = row.category ? row.category.name.replace(/,/g, " ") : "";
        const desc = row.description ? row.description.replace(/,/g, " ").replace(/\n/g, " ") : "";
        
        csvContent += `${row.id},${title},${row.price},${cat},${desc}\n`;
    });

    // Tạo link download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "products_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper loading
function showLoading(isShow) {
    document.getElementById('loading').style.display = isShow ? 'flex' : 'none';
}