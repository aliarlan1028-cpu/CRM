// 数据存储管理
const DataStore = {
  get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  getCustomers() {
    return this.get('customers') || [];
  },
  
  saveCustomers(customers) {
    this.set('customers', customers);
  },
  
  getProducts() {
    return this.get('products') || [];
  },
  
  saveProducts(products) {
    this.set('products', products);
  },
  
  getTransactions() {
    return this.get('transactions') || [];
  },
  
  saveTransactions(transactions) {
    this.set('transactions', transactions);
  },
  
  getPointRedemptions() {
    return this.get('pointRedemptions') || [];
  },
  
  savePointRedemptions(redemptions) {
    this.set('pointRedemptions', redemptions);
  },
  
  getPayments() {
    return this.get('payments') || [];
  },
  
  savePayments(payments) {
    this.set('payments', payments);
  },
  
  addPayment(customerName, amount) {
    const payments = this.getPayments();
    payments.push({
      customerName,
      amount,
      date: new Date().toISOString(),
      id: Date.now().toString()
    });
    this.savePayments(payments);
    return payments;
  },
  
  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.push({
      ...transaction,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      // 支付信息
      paymentMethod: transaction.paymentMethod || 'full',
      paidAmount: transaction.paidAmount || transaction.amount,
      debtAmount: transaction.debtAmount || 0
    });
    this.saveTransactions(transactions);
    return transactions;
  },
  
  addCustomer(name) {
    const customers = this.getCustomers();
    if (!customers.find(c => c.name === name)) {
      customers.push({ name, id: Date.now().toString() });
      this.saveCustomers(customers);
    }
    return customers;
  },
  
  addProduct(name, totalQuantity = 0) {
    const products = this.getProducts();
    if (!products.find(p => p.name === name)) {
      products.push({ 
        name, 
        id: Date.now().toString(),
        totalQuantity: totalQuantity || 0,
        remainingQuantity: totalQuantity || 0
      });
      this.saveProducts(products);
    }
    return products;
  },
  
  updateProductQuantity(productName, soldQuantity) {
    const products = this.getProducts();
    const product = products.find(p => p.name === productName);
    if (product) {
      product.remainingQuantity = Math.max(0, (product.remainingQuantity || 0) - soldQuantity);
      this.saveProducts(products);
    }
  },
  
  restockProduct(productName, restockQuantity) {
    const products = this.getProducts();
    const product = products.find(p => p.name === productName);
    if (product) {
      product.remainingQuantity = (product.remainingQuantity || 0) + restockQuantity;
      product.totalQuantity = (product.totalQuantity || 0) + restockQuantity;
      this.saveProducts(products);
    }
  },
  
  updateCustomerName(oldName, newName) {
    const customers = this.getCustomers();
    const customer = customers.find(c => c.name === oldName);
    if (customer && !customers.find(c => c.name === newName)) {
      customer.name = newName;
      this.saveCustomers(customers);
      
      // 更新所有交易记录中的客户名称
      const transactions = this.getTransactions();
      transactions.forEach(t => {
        if (t.customerName === oldName) {
          t.customerName = newName;
        }
      });
      this.saveTransactions(transactions);
      
      // 更新还款记录
      const payments = this.getPayments();
      payments.forEach(p => {
        if (p.customerName === oldName) {
          p.customerName = newName;
        }
      });
      this.savePayments(payments);
      
      // 更新积分兑换记录
      const redemptions = this.getPointRedemptions();
      redemptions.forEach(r => {
        if (r.customerName === oldName) {
          r.customerName = newName;
        }
      });
      this.savePointRedemptions(redemptions);
    }
  },
  
  updateProductName(oldName, newName) {
    const products = this.getProducts();
    const product = products.find(p => p.name === oldName);
    if (product && !products.find(p => p.name === newName)) {
      product.name = newName;
      this.saveProducts(products);
      
      // 更新所有交易记录中的商品名称
      const transactions = this.getTransactions();
      transactions.forEach(t => {
        t.products.forEach(p => {
          if (p.name === oldName) {
            p.name = newName;
          }
        });
      });
      this.saveTransactions(transactions);
    }
  },
  
  deleteTransaction(transactionId) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== transactionId);
    this.saveTransactions(filtered);
    return filtered;
  },
  
  redeemPoints(customerName, points) {
    const redemptions = this.getPointRedemptions();
    redemptions.push({
      customerName,
      points,
      date: new Date().toISOString(),
      id: Date.now().toString()
    });
    this.savePointRedemptions(redemptions);
    return redemptions;
  }
};

// 应用主类
class WholesaleCRM {
  constructor() {
    this.currentPage = 'dashboard';
    this.selectedCustomer = null;
    this.selectedProduct = null;
    this.selectedProducts = [];
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadInitialData();
    this.showPage('dashboard');
    this.registerServiceWorker();
    this.setupDateInput();
    this.fixBottomNavOnKeyboard();
  }
  
  // 修复键盘弹起时底部导航栏上移的问题
  fixBottomNavOnKeyboard() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    
    // 存储 rafId 以便清理
    let rafId = null;
    
    // 保存初始底部位置
    const setNavPosition = () => {
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // 强制设置导航栏位置，确保紧贴底部
      nav.style.position = 'fixed';
      nav.style.bottom = '0px';
      nav.style.marginBottom = '0px';
      nav.style.paddingBottom = 'calc(8px + env(safe-area-inset-bottom, 0))';
      nav.style.left = '0px';
      nav.style.right = '0px';
      nav.style.width = '100%';
      nav.style.transform = 'translate3d(0, 0, 0)';
      nav.style.webkitTransform = 'translate3d(0, 0, 0)';
    };
    
    // 初始设置
    setNavPosition();
    
    // 监听视口变化（键盘弹起/收起）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        setNavPosition();
      });
      
      window.visualViewport.addEventListener('scroll', () => {
        setNavPosition();
      });
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      setNavPosition();
    });
    
    // 监听页面滚动事件，确保导航栏始终在底部
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      // 立即修复位置
      setNavPosition();
      // 清除之前的定时器
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      // 滚动结束后再次确保位置正确
      scrollTimeout = setTimeout(() => {
        setNavPosition();
      }, 50);
    }, { passive: true });
    
    // 使用 requestAnimationFrame 持续监控并修复位置
    const checkNavPosition = () => {
      const computedStyle = window.getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // 如果导航栏不在底部，强制修复
      if (computedStyle.position !== 'fixed' || 
          computedStyle.bottom !== '0px' || 
          Math.abs(rect.bottom - windowHeight) > 1) { // 允许1px的误差
        setNavPosition();
      }
      
      rafId = requestAnimationFrame(checkNavPosition);
    };
    checkNavPosition();
    
    // 存储清理函数（如果需要的话）
    this._navPositionRafId = rafId;
    
    // 监听输入框焦点事件
    const handleInputFocus = () => {
      setTimeout(() => {
        setNavPosition();
        // 滚动到输入框，但保持导航栏在底部
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    };
    
    // 为所有输入框添加事件监听
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        handleInputFocus();
      }
    });
    
    document.addEventListener('focusout', () => {
      setTimeout(() => {
        setNavPosition();
      }, 300);
    });
    
    // 定期检查并修复位置（作为备用方案）
    setInterval(() => {
      const computedStyle = window.getComputedStyle(nav);
      if (computedStyle.position !== 'fixed' || computedStyle.bottom !== '0px') {
        setNavPosition();
      }
    }, 500);
  }
  
  setupDateInput() {
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }
  
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
    }
  }
  
  setupEventListeners() {
    // 保存 this 引用，供所有事件处理器使用
    const self = this;
    
    // 导航按钮 - 直接绑定事件监听器确保可靠
    // 延迟绑定确保DOM完全加载
    setTimeout(() => {
      const navButtons = document.querySelectorAll('.nav-btn');
      navButtons.forEach((btn) => {
        const page = btn.dataset.page || btn.getAttribute('data-page');
        
        // 绑定事件监听器
        const newHandler = function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const pageName = this.dataset.page || this.getAttribute('data-page');
          if (pageName) {
            try {
              self.showPage(pageName);
            } catch (error) {
              console.error('导航按钮点击错误:', error, pageName);
            }
          }
        };
        
        // 绑定新的事件监听器
        btn.addEventListener('click', newHandler, { capture: true, passive: false });
      });
    }, 100);
    
    // 交易表单
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
      transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTransactionSubmit();
      });
    }
    
    // 添加客户按钮（客户页面）
    document.getElementById('add-customer-btn')?.addEventListener('click', () => {
      this.showAddCustomerModal();
    });
    
    // 添加客户按钮（交易页面内联）
    document.getElementById('add-customer-inline-btn')?.addEventListener('click', () => {
      this.showAddCustomerModal();
    });
    
    // 添加商品按钮（商品页面）
    document.getElementById('add-product-btn')?.addEventListener('click', () => {
      this.showAddProductModal();
    });
    
    // 添加商品按钮（交易页面内联）
    document.getElementById('add-product-inline-btn')?.addEventListener('click', () => {
      this.showAddProductModal();
    });
    
    // 商品选择变化
    document.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.name === 'product') {
        this.updateQuantityInputs();
      }
      if (e.target.type === 'radio' && e.target.name === 'customer') {
        document.getElementById('selected-customer').value = e.target.value;
      }
    });
    
    // 客户选择搜索
    const customerSelectSearch = document.getElementById('customer-select-search');
    if (customerSelectSearch) {
      customerSelectSearch.addEventListener('input', (e) => {
        this.filterCustomerSelect(e.target.value);
      });
    }
    
    // 商品选择搜索
    const productSelectSearch = document.getElementById('product-select-search');
    if (productSelectSearch) {
      productSelectSearch.addEventListener('input', (e) => {
        this.filterProductSelect(e.target.value);
      });
    }
    
    // 搜索功能
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
      customerSearch.addEventListener('input', (e) => {
        this.filterCustomers(e.target.value);
      });
    }
    
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
      productSearch.addEventListener('input', (e) => {
        this.filterProducts(e.target.value);
      });
    }
    
    // 模态框
    document.getElementById('save-customer-btn')?.addEventListener('click', () => {
      this.saveNewCustomer();
    });
    
    document.getElementById('cancel-customer-btn')?.addEventListener('click', () => {
      this.hideAddCustomerModal();
    });
    
    document.getElementById('save-product-btn')?.addEventListener('click', () => {
      this.saveNewProduct();
    });
    
    document.getElementById('cancel-product-btn')?.addEventListener('click', () => {
      this.hideAddProductModal();
    });
    
    // 使用事件委托处理其他按钮点击（确保动态加载的按钮也能响应）
    document.addEventListener('click', function(e) {
      // 跳过导航按钮（已经直接绑定）
      if (e.target.closest('.nav-btn')) {
        return;
      }
      
      // 检查是否点击了兑换积分按钮或其内部元素
      const redeemBtn = e.target.closest('#redeem-points-btn');
      if (redeemBtn) {
        e.preventDefault();
        e.stopPropagation();
        self.showRedeemModal();
        return false;
      }
      
      // 检查是否点击了已收款按钮或其内部元素
      const recordPaymentBtn = e.target.closest('#record-payment-btn');
      if (recordPaymentBtn) {
        e.preventDefault();
        e.stopPropagation();
        self.showRecordPaymentModal();
        return false;
      }
      
      // 检查是否点击了补货按钮或其内部元素
      const restockBtn = e.target.closest('#restock-product-btn');
      if (restockBtn) {
        e.preventDefault();
        e.stopPropagation();
        self.showRestockModal();
        return false;
      }
      
      // 检查是否点击了编辑客户按钮
      const editCustomerBtn = e.target.closest('#edit-customer-btn');
      if (editCustomerBtn) {
        e.preventDefault();
        e.stopPropagation();
        self.showEditCustomerModal();
        return false;
      }
      
      // 检查是否点击了编辑商品按钮
      const editProductBtn = e.target.closest('#edit-product-btn');
      if (editProductBtn) {
        e.preventDefault();
        e.stopPropagation();
        self.showEditProductModal();
        return false;
      }
      
      // 检查是否点击了删除交易按钮
      const deleteTransactionBtn = e.target.closest('.delete-transaction-btn');
      if (deleteTransactionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const transactionId = deleteTransactionBtn.dataset.transactionId;
        self.deleteTransaction(transactionId);
        return false;
      }
    });
    
    document.getElementById('confirm-redeem-btn')?.addEventListener('click', () => {
      this.handleRedeemPoints();
    });
    
    document.getElementById('cancel-redeem-btn')?.addEventListener('click', () => {
      this.hideRedeemModal();
    });
    
    document.getElementById('confirm-payment-btn')?.addEventListener('click', () => {
      this.handleRecordPayment();
    });
    
    document.getElementById('cancel-payment-btn')?.addEventListener('click', () => {
      this.hideRecordPaymentModal();
    });
    
    // 补货按钮
    document.getElementById('confirm-restock-btn')?.addEventListener('click', () => {
      this.handleRestockProduct();
    });
    
    document.getElementById('cancel-restock-btn')?.addEventListener('click', () => {
      this.hideRestockModal();
    });
    
    // 编辑客户
    document.getElementById('save-edit-customer-btn')?.addEventListener('click', () => {
      this.handleEditCustomer();
    });
    
    document.getElementById('cancel-edit-customer-btn')?.addEventListener('click', () => {
      this.hideEditCustomerModal();
    });
    
    // 编辑商品
    document.getElementById('save-edit-product-btn')?.addEventListener('click', () => {
      this.handleEditProduct();
    });
    
    document.getElementById('cancel-edit-product-btn')?.addEventListener('click', () => {
      this.hideEditProductModal();
    });
    
    // 支付方式选择变化
    const paymentMethodSelect = document.getElementById('payment-method-select');
    if (paymentMethodSelect) {
      paymentMethodSelect.addEventListener('change', (e) => {
        this.handlePaymentMethodChange(e.target.value);
      });
    }
    
    // 支付金额输入变化，自动计算欠款金额
    const paidAmountInput = document.getElementById('paid-amount-input');
    if (paidAmountInput) {
      paidAmountInput.addEventListener('input', () => {
        this.calculateDebtAmount();
      });
    }
    
    // 购买金额变化时，如果是部分支付，重新计算
    const amountInput = document.getElementById('amount-input');
    if (amountInput) {
      amountInput.addEventListener('input', () => {
        const paymentMethod = document.getElementById('payment-method-select')?.value;
        if (paymentMethod === 'partial') {
          this.calculateDebtAmount();
        }
      });
    }
    
    // 交易记录筛选
    document.getElementById('filter-transactions-btn')?.addEventListener('click', () => {
      this.filterTransactions();
    });
    
    document.getElementById('reset-filter-btn')?.addEventListener('click', () => {
      this.resetTransactionFilter();
    });
    
    // 返回按钮 - 使用事件委托确保在PWA模式下也能工作
    document.addEventListener('click', (e) => {
      const backBtn = e.target.closest('.back-btn');
      if (backBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        // 优先检查哪个详情页面是激活的（最可靠的方法）
        const customerDetailPage = document.getElementById('customer-detail-page');
        const productDetailPage = document.getElementById('product-detail-page');
        
        if (productDetailPage && productDetailPage.classList.contains('active')) {
          // 从商品详情页返回商品列表页
          this.currentPage = 'products'; // 确保状态正确
          this.showPage('products');
        } else if (customerDetailPage && customerDetailPage.classList.contains('active')) {
          // 从客户详情页返回客户列表页
          this.currentPage = 'customers'; // 确保状态正确
          this.showPage('customers');
        } else if (this.currentPage === 'product-detail') {
          // 备用：使用 currentPage 状态
          this.showPage('products');
        } else if (this.currentPage === 'customer-detail') {
          // 备用：使用 currentPage 状态
          this.showPage('customers');
        } else {
          // 默认返回客户列表页（向后兼容）
          this.showPage('customers');
        }
      }
    });
    
    // 语言变更监听
    window.addEventListener('languageChanged', () => {
      this.loadInitialData();
      if (this.currentPage === 'customer-detail' && this.selectedCustomer) {
        this.showCustomerDetail(this.selectedCustomer);
      } else if (this.currentPage === 'product-detail' && this.selectedProduct) {
        this.showProductDetail(this.selectedProduct);
      } else if (this.currentPage === 'transaction') {
        this.loadCustomerSelect();
        this.loadProductSelect();
      }
    });
  }
  
  loadInitialData() {
    this.loadCustomers();
    this.loadProducts();
    this.loadRecentTransactions();
    this.updateDashboard();
  }
  
  showPage(pageName) {
    if (!pageName) {
      console.error('showPage: pageName is required');
      return;
    }
    
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // 更新导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(`${pageName}-page`);
    if (!targetPage) {
      console.error(`showPage: Page "${pageName}-page" not found`);
      return;
    }
    
    targetPage.classList.add('active');
    const navBtn = document.querySelector(`[data-page="${pageName}"]`);
    if (navBtn) {
      navBtn.classList.add('active');
    }
    this.currentPage = pageName;
    
    // 页面特定的加载
    if (pageName === 'dashboard') {
      // 延迟一下确保DOM已渲染
      setTimeout(() => {
        this.updateDashboard();
      }, 100);
    } else if (pageName === 'customers') {
      this.loadCustomersList();
    } else if (pageName === 'products') {
      this.loadProductsList();
    } else if (pageName === 'transaction') {
      this.loadCustomerSelect();
      this.loadProductSelect();
      // 设置交易日期为今天
      setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date-input');
        if (dateInput) {
          dateInput.value = today;
        }
      }, 100);
    }
  }
  
  // 客户管理
  loadCustomers() {
    this.loadCustomerSelect();
    this.loadCustomersList();
  }
  
  loadCustomerSelect() {
    const customers = DataStore.getCustomers();
    const container = document.getElementById('customer-radio-group');
    if (!container) return;
    
    container.innerHTML = '';
    customers.forEach(customer => {
      const item = document.createElement('div');
      item.className = 'radio-item';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'customer';
      radio.value = customer.name;
      radio.id = `customer-radio-${customer.id}`;
      
      const label = document.createElement('label');
      label.htmlFor = `customer-radio-${customer.id}`;
      label.textContent = customer.name;
      
      item.appendChild(radio);
      item.appendChild(label);
      
      item.addEventListener('click', (e) => {
        if (e.target !== radio) {
          radio.checked = true;
          document.getElementById('selected-customer').value = customer.name;
          // 更新选中样式
          container.querySelectorAll('.radio-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
      
      radio.addEventListener('change', () => {
        if (radio.checked) {
          container.querySelectorAll('.radio-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
      
      container.appendChild(item);
    });
  }
  
  filterCustomerSelect(query) {
    const customers = DataStore.getCustomers();
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const container = document.getElementById('customer-radio-group');
    if (!container) return;
    
    container.innerHTML = '';
    filtered.forEach(customer => {
      const item = document.createElement('div');
      item.className = 'radio-item';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'customer';
      radio.value = customer.name;
      radio.id = `customer-radio-${customer.id}`;
      
      const label = document.createElement('label');
      label.htmlFor = `customer-radio-${customer.id}`;
      label.textContent = customer.name;
      
      item.appendChild(radio);
      item.appendChild(label);
      
      item.addEventListener('click', (e) => {
        if (e.target !== radio) {
          radio.checked = true;
          document.getElementById('selected-customer').value = customer.name;
          container.querySelectorAll('.radio-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
      
      radio.addEventListener('change', () => {
        if (radio.checked) {
          container.querySelectorAll('.radio-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
      });
      
      container.appendChild(item);
    });
  }
  
  loadCustomersList() {
    const customers = DataStore.getCustomers();
    const container = document.getElementById('customers-list');
    if (!container) return;
    
    container.innerHTML = '';
    customers.forEach(customer => {
      const card = document.createElement('div');
      const stats = this.getCustomerStats(customer.name);
      
      // 检查是否有欠款，如果有则添加红色样式
      if (stats.pendingDebt > 0) {
        card.className = 'customer-card customer-card-debt';
      } else {
        card.className = 'customer-card';
      }
      
      card.addEventListener('click', () => {
        this.showCustomerDetail(customer.name);
      });
      
      const lang = localStorage.getItem('language') || 'zh';
      const totalRevenueText = lang === 'ug' ? 'جەمئىي سېتىۋېلىش' : '累计购买';
      const currentPointsText = lang === 'ug' ? 'جەمئىي ئۇچۇر' : '累计积分';
      
      card.innerHTML = `
        <h3>${customer.name}</h3>
        <p>${totalRevenueText}: ¥${stats.totalRevenue.toFixed(2)}</p>
        <p>${currentPointsText}: ${stats.currentPoints.toFixed(0)}</p>
      `;
      
      container.appendChild(card);
    });
  }
  
  filterCustomers(query) {
    const customers = DataStore.getCustomers();
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const container = document.getElementById('customers-list');
    if (!container) return;
    
    container.innerHTML = '';
    filtered.forEach(customer => {
      const card = document.createElement('div');
      const stats = this.getCustomerStats(customer.name);
      
      // 检查是否有欠款，如果有则添加红色样式
      if (stats.pendingDebt > 0) {
        card.className = 'customer-card customer-card-debt';
      } else {
        card.className = 'customer-card';
      }
      
      card.addEventListener('click', () => {
        this.showCustomerDetail(customer.name);
      });
      
      const lang = localStorage.getItem('language') || 'zh';
      const totalRevenueText = lang === 'ug' ? 'جەمئىي سېتىۋېلىش' : '累计购买';
      const currentPointsText = lang === 'ug' ? 'جەمئىي ئۇچۇر' : '累计积分';
      
      card.innerHTML = `
        <h3>${customer.name}</h3>
        <p>${totalRevenueText}: ¥${stats.totalRevenue.toFixed(2)}</p>
        <p>${currentPointsText}: ${stats.currentPoints.toFixed(0)}</p>
      `;
      
      container.appendChild(card);
    });
  }
  
  // 商品管理
  loadProducts() {
    this.loadProductSelect();
    this.loadProductsList();
  }
  
  loadProductSelect() {
    const products = DataStore.getProducts();
    const container = document.getElementById('product-checkboxes');
    if (!container) return;
    
    container.innerHTML = '';
    products.forEach(product => {
      const item = document.createElement('div');
      item.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'product';
      checkbox.value = product.name;
      checkbox.id = `product-${product.id}`;
      
      const label = document.createElement('label');
      label.htmlFor = `product-${product.id}`;
      label.textContent = product.name;
      
      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });
  }
  
  filterProductSelect(query) {
    const products = DataStore.getProducts();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const container = document.getElementById('product-checkboxes');
    if (!container) return;
    
    container.innerHTML = '';
    filtered.forEach(product => {
      const item = document.createElement('div');
      item.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'product';
      checkbox.value = product.name;
      checkbox.id = `product-${product.id}`;
      
      const label = document.createElement('label');
      label.htmlFor = `product-${product.id}`;
      label.textContent = product.name;
      
      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });
  }
  
  loadProductsList() {
    const products = DataStore.getProducts();
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.addEventListener('click', () => {
        this.showProductDetail(product.name);
      });
      
      const stats = this.getProductStats(product.name);
      const lang = localStorage.getItem('language') || 'zh';
      const monthlySalesText = lang === 'ug' ? 'سېتىلىش' : '销量';
      const remainingText = lang === 'ug' ? 'قالدۇق' : '剩余';
      const remaining = product.remainingQuantity || 0;
      
      card.innerHTML = `
        <h3>${product.name}</h3>
        <p>${monthlySalesText}: ${stats.monthlySales}</p>
        <p>${remainingText}: ${remaining}</p>
      `;
      
      container.appendChild(card);
    });
  }
  
  filterProducts(query) {
    const products = DataStore.getProducts();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';
    filtered.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.addEventListener('click', () => {
        this.showProductDetail(product.name);
      });
      
      const stats = this.getProductStats(product.name);
      const lang = localStorage.getItem('language') || 'zh';
      const monthlySalesText = lang === 'ug' ? 'سېتىلىش' : '销量';
      const remainingText = lang === 'ug' ? 'قالدۇق' : '剩余';
      const remaining = product.remainingQuantity || 0;
      
      card.innerHTML = `
        <h3>${product.name}</h3>
        <p>${monthlySalesText}: ${stats.monthlySales}</p>
        <p>${remainingText}: ${remaining}</p>
      `;
      
      container.appendChild(card);
    });
  }
  
  updateQuantityInputs() {
    const checkedProducts = Array.from(document.querySelectorAll('input[name="product"]:checked'))
      .map(cb => cb.value);
    
    const container = document.getElementById('quantity-inputs');
    if (!container) return;
    
    container.innerHTML = '';
    checkedProducts.forEach(productName => {
      const group = document.createElement('div');
      group.className = 'quantity-input-group';
      
      const label = document.createElement('label');
      label.textContent = productName;
      
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.value = '1';
      input.dataset.product = productName;
      input.required = true;
      
      group.appendChild(label);
      group.appendChild(input);
      container.appendChild(group);
    });
  }
  
  // 交易处理
  handleTransactionSubmit() {
    const customerName = document.getElementById('selected-customer').value;
    if (!customerName) {
      const lang = localStorage.getItem('language') || 'zh';
      alert(lang === 'ug' ? 'خېرىدار تاللاڭ' : '请选择客户');
      return;
    }
    const amount = parseFloat(document.getElementById('amount-input').value);
    const date = document.getElementById('date-input').value;
    
    const checkedProducts = Array.from(document.querySelectorAll('input[name="product"]:checked'))
      .map(cb => cb.value);
    
    if (checkedProducts.length === 0) {
      const lang = localStorage.getItem('language') || 'zh';
      alert(lang === 'ug' ? 'مەھسۇلات تاللاڭ' : '请至少选择一个商品');
      return;
    }
    
    const quantities = {};
    checkedProducts.forEach(productName => {
      const input = document.querySelector(`input[data-product="${productName}"]`);
      if (input) {
        quantities[productName] = parseInt(input.value) || 0;
      }
    });
    
    // 获取支付方式
    const paymentMethod = document.getElementById('payment-method-select').value;
    let paidAmount = amount;
    let debtAmount = 0;
    
    if (paymentMethod === 'full') {
      paidAmount = amount;
      debtAmount = 0;
    } else if (paymentMethod === 'partial') {
      paidAmount = parseFloat(document.getElementById('paid-amount-input').value) || 0;
      debtAmount = parseFloat(document.getElementById('debt-amount-input').value) || 0;
      if (Math.abs(paidAmount + debtAmount - amount) > 0.01) {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'تاپشۇرۇلغان مىقدار + قەرز مىقدارى = سېتىۋېلىش مىقدارى بولۇشى كېرەك' : '支付金额 + 欠款金额 = 购买金额');
        return;
      }
    } else if (paymentMethod === 'debt') {
      // 欠款时：已付金额为0，欠款金额等于购买金额
      paidAmount = 0;
      debtAmount = amount;
    }
    
    // 确保客户存在
    DataStore.addCustomer(customerName);
    
    // 确保商品存在（不自动添加，必须先在商品页面添加）
    for (const productName of checkedProducts) {
      const products = DataStore.getProducts();
      const product = products.find(p => p.name === productName);
      if (!product) {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'مەھسۇلات ئاللىبۇرۇن قوشۇش كېرەك' : '请先在商品页面添加该商品');
        return;
      }
      // 检查库存
      const quantity = quantities[productName] || 0;
      const remaining = product.remainingQuantity || 0;
      if (quantity > remaining) {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' 
          ? `${productName} قالدۇق سانى يېتەرلىك ئەمەس (قالدۇق: ${remaining})`
          : `${productName} 剩余数量不足 (剩余: ${remaining})`);
        return;
      }
    }
    
    // 更新商品库存
    checkedProducts.forEach(productName => {
      const quantity = quantities[productName] || 0;
      DataStore.updateProductQuantity(productName, quantity);
    });
    
    // 添加交易
    const transaction = {
      customerName,
      products: checkedProducts.map(name => ({
        name,
        quantity: quantities[name] || 0
      })),
      amount,
      paymentMethod,
      paidAmount,
      debtAmount,
      date
    };
    
    DataStore.addTransaction(transaction);
    
    // 重置表单
    document.getElementById('transaction-form').reset();
    this.setupDateInput();
    document.getElementById('quantity-inputs').innerHTML = '';
    document.querySelectorAll('input[name="product"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="customer"]').forEach(rb => rb.checked = false);
    document.getElementById('selected-customer').value = '';
    document.getElementById('customer-select-search').value = '';
    document.getElementById('product-select-search').value = '';
    document.querySelectorAll('.radio-item').forEach(item => item.classList.remove('selected'));
    // 重置支付方式相关输入
    document.getElementById('paid-amount-group').style.display = 'none';
    document.getElementById('debt-amount-group').style.display = 'none';
    
    // 重新加载数据
    this.loadInitialData();
    
    const lang = localStorage.getItem('language') || 'zh';
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك قوشۇلدى' : '交易记录添加成功！');
  }
  
  loadRecentTransactions(filteredTransactions = null) {
    const transactions = filteredTransactions || DataStore.getTransactions();
    const recent = transactions.slice(-10).reverse();
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    container.innerHTML = '';
    if (recent.length === 0) {
      const lang = localStorage.getItem('language') || 'zh';
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = lang === 'ug' ? 'سودا خاتىرىسى يوق' : '暂无交易记录';
      container.appendChild(emptyMsg);
      return;
    }
    
    recent.forEach(transaction => {
      const item = document.createElement('div');
      item.className = 'transaction-item';
      
      const productsText = transaction.products.map(p => 
        `${p.name} (${p.quantity})`
      ).join(', ');
      
      const lang = localStorage.getItem('language') || 'zh';
      const paymentMethodText = transaction.paymentMethod === 'full' 
        ? (lang === 'ug' ? 'تولۇق تاپشۇرۇش' : '全额支付')
        : transaction.paymentMethod === 'partial'
        ? (lang === 'ug' ? 'قىسىم تاپشۇرۇش' : '部分支付')
        : (lang === 'ug' ? 'قەرز' : '欠款');
      
      let paymentInfo = '';
      if (transaction.paymentMethod === 'partial') {
        paymentInfo = `<p style="color: #666; font-size: 12px;">${paymentMethodText} - ${lang === 'ug' ? 'تاپشۇرۇلغان' : '已付'}: ¥${(transaction.paidAmount || 0).toFixed(2)}, ${lang === 'ug' ? 'قەرز' : '欠款'}: ¥${(transaction.debtAmount || 0).toFixed(2)}</p>`;
      } else if (transaction.paymentMethod === 'debt') {
        paymentInfo = `<p style="color: #F44336; font-size: 12px;">${paymentMethodText} - ${lang === 'ug' ? 'قەرز' : '欠款'}: ¥${(transaction.debtAmount || transaction.amount || 0).toFixed(2)}</p>`;
      }
      
      const deleteText = lang === 'ug' ? 'ئۆچۈرۈش' : '删除';
      
      item.innerHTML = `
        <div class="transaction-info">
          <h4>${transaction.customerName}</h4>
          <p>${productsText}</p>
          <p>${transaction.date}</p>
          ${paymentInfo}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
          <div class="transaction-amount">¥${transaction.amount.toFixed(2)}</div>
          <button class="btn-secondary delete-transaction-btn" style="padding: 6px 12px; font-size: 12px; min-width: auto;" data-transaction-id="${transaction.id}">${deleteText}</button>
        </div>
      `;
      
      container.appendChild(item);
    });
  }
  
  filterTransactions() {
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    if (!startDate || !endDate) {
      const lang = localStorage.getItem('language') || 'zh';
      alert(lang === 'ug' ? 'باشلىنىش ۋە ئاخىرلىشىش چېسىسىنى تاللاڭ' : '请选择开始和结束日期');
      return;
    }
    
    const transactions = DataStore.getTransactions();
    const filtered = transactions.filter(transaction => {
      const transactionDate = transaction.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    this.loadRecentTransactions(filtered);
  }
  
  resetTransactionFilter() {
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    this.loadRecentTransactions();
  }
  
  // 统计计算
  getCustomerStats(customerName) {
    const transactions = DataStore.getTransactions();
    const redemptions = DataStore.getPointRedemptions();
    const payments = DataStore.getPayments();
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlyRevenue = 0;
    let totalRevenue = 0;
    let totalDebt = 0;
    let totalPaid = 0;
    const productCounts = {};
    
    transactions.forEach(transaction => {
      if (transaction.customerName === customerName) {
        const transactionDate = new Date(transaction.date);
        totalRevenue += transaction.amount;
        
        // 本月交易额
        if (transactionDate >= monthStart) {
          monthlyRevenue += transaction.amount;
        }
        
        // 欠款统计
        const debtAmount = transaction.debtAmount || 0;
        const paidAmount = transaction.paidAmount || transaction.amount;
        totalDebt += debtAmount;
        totalPaid += paidAmount;
        
        transaction.products.forEach(product => {
          productCounts[product.name] = (productCounts[product.name] || 0) + product.quantity;
        });
      }
    });
    
    // 已还款金额
    const paidBack = payments
      .filter(p => p.customerName === customerName)
      .reduce((sum, p) => sum + p.amount, 0);
    
    // 待还款 = 累计欠款 - 已还款
    const pendingDebt = Math.max(0, totalDebt - paidBack);
    
    const totalRedeemed = redemptions
      .filter(r => r.customerName === customerName)
      .reduce((sum, r) => sum + r.points, 0);
    
    const currentPoints = totalRevenue - totalRedeemed;
    
    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return {
      monthlyRevenue,
      totalRevenue,
      currentPoints,
      totalDebt,
      paidBack,
      pendingDebt,
      topProducts
    };
  }
  
  getProductStats(productName) {
    const transactions = DataStore.getTransactions();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlySales = 0;
    const customerCounts = {};
    
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const product = transaction.products.find(p => p.name === productName);
      
      if (product) {
        // 本月销量
        if (transactionDate >= monthStart) {
          monthlySales += product.quantity;
        }
        
        customerCounts[transaction.customerName] = 
          (customerCounts[transaction.customerName] || 0) + product.quantity;
      }
    });
    
    const topCustomers = Object.entries(customerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return {
      monthlySales,
      topCustomers
    };
  }
  
  // 图表实例
  charts = {
    salesTrend: null,
    topCustomersMonth: null,
    topProductsMonth: null,
    topCustomersAll: null,
    paymentStructure: null
  };
  
  // 仪表板更新
  updateDashboard() {
    const transactions = DataStore.getTransactions();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 统计指标
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let todayRevenue = 0;
    let totalFullPayment = 0;
    let totalDebt = 0;
    
    const customerRevenue = {};
    const productSales = {};
    const allCustomerRevenue = {};
    
    // 计算过去30天的每日销售额（用于趋势图）
    const dailySales = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailySales[dateStr] = 0;
    }
    
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const dateStr = transactionDate.toISOString().split('T')[0];
      const transactionDay = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      
      // 累计交易额
      totalRevenue += transaction.amount;
      
      // 本月交易额
      if (transactionDate >= monthStart) {
        monthlyRevenue += transaction.amount;
      }
      
      // 今日交易额
      if (transactionDay.getTime() === today.getTime()) {
        todayRevenue += transaction.amount;
      }
      
      // 收入结构 - 只计算实际收到的金额
      // 全额支付：全额算入全额收款
      // 部分支付：只计算已付部分
      // 纯欠款：不算入全额收款，只算入欠款
      if (transaction.paymentMethod === 'full') {
        totalFullPayment += transaction.amount;
      } else if (transaction.paymentMethod === 'partial') {
        totalFullPayment += (transaction.paidAmount || 0);
        totalDebt += (transaction.debtAmount || 0);
      } else if (transaction.paymentMethod === 'debt') {
        // 纯欠款：只算入欠款，不算入全额收款
        totalDebt += (transaction.debtAmount || transaction.amount || 0);
      }
      
      allCustomerRevenue[transaction.customerName] = 
        (allCustomerRevenue[transaction.customerName] || 0) + transaction.amount;
      
      // 本月数据
      if (transactionDate >= monthStart) {
        if (dailySales[dateStr] !== undefined) {
          dailySales[dateStr] += transaction.amount;
        }
        
        customerRevenue[transaction.customerName] = 
          (customerRevenue[transaction.customerName] || 0) + transaction.amount;
        
        transaction.products.forEach(product => {
          productSales[product.name] = 
            (productSales[product.name] || 0) + product.quantity;
        });
      }
    });
    
    // 更新显示
    document.getElementById('total-revenue').textContent = 
      '¥' + totalRevenue.toFixed(2);
    document.getElementById('monthly-revenue').textContent = 
      '¥' + monthlyRevenue.toFixed(2);
    document.getElementById('today-revenue').textContent = 
      '¥' + todayRevenue.toFixed(2);
    
    // 总客户数和总商品数
    const totalCustomers = DataStore.getCustomers().length;
    const totalProducts = DataStore.getProducts().length;
    const totalCustomersEl = document.getElementById('total-customers');
    const totalProductsEl = document.getElementById('total-products');
    if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    
    // 即将售罄商品（剩余数量 <= 10）
    this.updateLowStockProducts();
    
    // 绘制收入结构图
    this.updatePaymentStructureChart(totalFullPayment, totalDebt);
    
    // 绘制销售额趋势图
    this.updateSalesTrendChart(dailySales);
    
    // 本月购买力前十客户
    const topCustomersMonth = Object.entries(customerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // 绘制图表
    this.updateTopCustomersMonthChart(topCustomersMonth);
    
    // 本月畅销前十商品
    const topProductsMonth = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // 绘制图表
    this.updateTopProductsMonthChart(topProductsMonth);
    
    // 累计交易额前十客户
    const topCustomersAll = Object.entries(allCustomerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // 绘制图表
    this.updateTopCustomersAllChart(topCustomersAll);
  }
  
  // 更新即将售罄商品
  updateLowStockProducts() {
    const products = DataStore.getProducts();
    const lowStockProducts = products
      .filter(p => (p.remainingQuantity || 0) > 0 && (p.remainingQuantity || 0) <= 10)
      .sort((a, b) => (a.remainingQuantity || 0) - (b.remainingQuantity || 0))
      .slice(0, 10);
    
    const container = document.getElementById('low-stock-products');
    if (!container) return;
    
    container.innerHTML = '';
    if (lowStockProducts.length === 0) {
      const lang = localStorage.getItem('language') || 'zh';
      const li = document.createElement('li');
      li.textContent = lang === 'ug' ? 'تېزلا تۈگىدىغان مەھسۇلات يوق' : '暂无即将售罄商品';
      li.style.color = '#999';
      container.appendChild(li);
    } else {
      lowStockProducts.forEach(product => {
        const li = document.createElement('li');
        const remaining = product.remainingQuantity || 0;
        const lang = localStorage.getItem('language') || 'zh';
        const remainingText = lang === 'ug' ? 'قالدۇق' : '剩余';
        li.innerHTML = `<span>${product.name}</span><span style="color: ${remaining <= 5 ? '#F44336' : '#FF9800'}; font-weight: 600;">${remainingText}: ${remaining}</span>`;
        container.appendChild(li);
      });
    }
  }
  
  // 更新即将售罄商品
  updateLowStockProducts() {
    const products = DataStore.getProducts();
    const lowStockProducts = products
      .filter(p => (p.remainingQuantity || 0) > 0 && (p.remainingQuantity || 0) <= 10)
      .sort((a, b) => (a.remainingQuantity || 0) - (b.remainingQuantity || 0))
      .slice(0, 10);
    
    const container = document.getElementById('low-stock-products');
    if (!container) return;
    
    container.innerHTML = '';
    if (lowStockProducts.length === 0) {
      const lang = localStorage.getItem('language') || 'zh';
      const li = document.createElement('li');
      li.textContent = lang === 'ug' ? 'تېزلا تۈگىدىغان مەھسۇلات يوق' : '暂无即将售罄商品';
      li.style.color = '#999';
      container.appendChild(li);
    } else {
      lowStockProducts.forEach(product => {
        const li = document.createElement('li');
        const remaining = product.remainingQuantity || 0;
        const lang = localStorage.getItem('language') || 'zh';
        const remainingText = lang === 'ug' ? 'قالدۇق' : '剩余';
        li.innerHTML = `<span>${product.name}</span><span style="color: ${remaining <= 5 ? '#F44336' : '#FF9800'}; font-weight: 600;">${remainingText}: ${remaining}</span>`;
        container.appendChild(li);
      });
    }
  }
  
  // 更新收入结构图
  updatePaymentStructureChart(fullPayment, debt) {
    const ctx = document.getElementById('payment-structure-chart');
    if (!ctx) return;
    
    const lang = localStorage.getItem('language') || 'zh';
    const fullPaymentLabel = lang === 'ug' ? 'تولۇق تاپشۇرۇش' : '全额收款';
    const debtLabel = lang === 'ug' ? 'قەرز مىقدارى' : '欠款金额';
    
    if (this.charts.paymentStructure) {
      this.charts.paymentStructure.destroy();
    }
    
    this.charts.paymentStructure = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [fullPaymentLabel, debtLabel],
        datasets: [{
          data: [fullPayment, debt],
          backgroundColor: [
            'rgba(76, 175, 80, 0.8)',
            'rgba(244, 67, 54, 0.8)'
          ],
          borderColor: [
            '#4CAF50',
            '#F44336'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                size: 14
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ¥${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // 更新销售额趋势图
  updateSalesTrendChart(dailySales) {
    const ctx = document.getElementById('sales-trend-chart');
    if (!ctx) return;
    
    const dates = Object.keys(dailySales).sort();
    const values = dates.map(date => dailySales[date]);
    
    // 格式化日期标签
    const labels = dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    if (this.charts.salesTrend) {
      this.charts.salesTrend.destroy();
    }
    
    this.charts.salesTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '销售额',
          data: values,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2196F3',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                return '¥' + context.parsed.y.toFixed(2);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toFixed(0);
              },
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 11
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // 更新近一个月客户图表
  updateTopCustomersMonthChart(data) {
    const ctx = document.getElementById('top-customers-month-chart');
    if (!ctx) return;
    
    const names = data.map(([name]) => name.length > 8 ? name.substring(0, 8) + '...' : name);
    const amounts = data.map(([, amount]) => amount);
    
    if (this.charts.topCustomersMonth) {
      this.charts.topCustomersMonth.destroy();
    }
    
    this.charts.topCustomersMonth = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: '交易额',
          data: amounts,
          backgroundColor: 'rgba(33, 150, 243, 0.8)',
          borderColor: '#2196F3',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return '¥' + context.parsed.x.toFixed(2);
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toFixed(0);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // 更新近一个月商品图表
  updateTopProductsMonthChart(data) {
    const ctx = document.getElementById('top-products-month-chart');
    if (!ctx) return;
    
    const names = data.map(([name]) => name.length > 8 ? name.substring(0, 8) + '...' : name);
    const quantities = data.map(([, quantity]) => quantity);
    
    if (this.charts.topProductsMonth) {
      this.charts.topProductsMonth.destroy();
    }
    
    this.charts.topProductsMonth = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: '销量',
          data: quantities,
          backgroundColor: 'rgba(76, 175, 80, 0.8)',
          borderColor: '#4CAF50',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return context.parsed.x + ' 件';
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // 更新累计客户图表
  updateTopCustomersAllChart(data) {
    const ctx = document.getElementById('top-customers-all-chart');
    if (!ctx) return;
    
    const names = data.map(([name]) => name.length > 10 ? name.substring(0, 10) + '...' : name);
    const amounts = data.map(([, amount]) => amount);
    
    if (this.charts.topCustomersAll) {
      this.charts.topCustomersAll.destroy();
    }
    
    this.charts.topCustomersAll = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: '累计交易额',
          data: amounts,
          backgroundColor: 'rgba(255, 193, 7, 0.8)',
          borderColor: '#FFC107',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return '¥' + context.parsed.x.toFixed(2);
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '¥' + value.toFixed(0);
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          y: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // 客户详情
  showCustomerDetail(customerName) {
    this.selectedCustomer = customerName;
    this.currentPage = 'customer-detail';
    
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    const detailPage = document.getElementById('customer-detail-page');
    if (detailPage) {
      detailPage.classList.add('active');
    }
    
    // 按钮事件已通过事件委托处理，无需重复绑定
    
    const stats = this.getCustomerStats(customerName);
    
    document.getElementById('customer-detail-name').textContent = customerName;
    document.getElementById('customer-monthly-revenue').textContent = 
      '¥' + stats.monthlyRevenue.toFixed(2);
    document.getElementById('customer-total-revenue').textContent = 
      '¥' + stats.totalRevenue.toFixed(2);
    document.getElementById('customer-current-points').textContent = 
      stats.currentPoints.toFixed(0);
    document.getElementById('customer-total-debt').textContent = 
      '¥' + stats.totalDebt.toFixed(2);
    document.getElementById('customer-paid-amount').textContent = 
      '¥' + stats.paidBack.toFixed(2);
    document.getElementById('customer-pending-debt').textContent = 
      '¥' + stats.pendingDebt.toFixed(2);
    
    // 前10商品
    const topProductsList = document.getElementById('customer-top-products');
    if (topProductsList) {
      topProductsList.innerHTML = '';
      stats.topProducts.forEach(({ name, count }) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${name}</span><span>${count}</span>`;
        topProductsList.appendChild(li);
      });
    }
    
    // 还款记录
    const payments = DataStore.getPayments()
      .filter(p => p.customerName === customerName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const paymentHistoryList = document.getElementById('payment-history');
    if (paymentHistoryList) {
      paymentHistoryList.innerHTML = '';
      const lang = localStorage.getItem('language') || 'zh';
      if (payments.length === 0) {
        const li = document.createElement('li');
        li.textContent = lang === 'ug' 
          ? 'تاپشۇرۇش خاتىرىسى يوق'
          : '暂无还款记录';
        paymentHistoryList.appendChild(li);
      } else {
        payments.forEach(payment => {
          const li = document.createElement('li');
          const date = new Date(payment.date).toLocaleDateString();
          li.innerHTML = `<span>${date}</span><span>+¥${payment.amount.toFixed(2)}</span>`;
          paymentHistoryList.appendChild(li);
        });
      }
    }
    
    // 积分兑换记录
    const redemptions = DataStore.getPointRedemptions()
      .filter(r => r.customerName === customerName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const pointsHistoryList = document.getElementById('points-history');
    if (pointsHistoryList) {
      pointsHistoryList.innerHTML = '';
      const lang = localStorage.getItem('language') || 'zh';
      if (redemptions.length === 0) {
        const li = document.createElement('li');
        li.textContent = lang === 'ug' 
          ? 'ئۇچۇر ئالماشتۇرۇش خاتىرىسى يوق'
          : '暂无积分兑换记录';
        pointsHistoryList.appendChild(li);
      } else {
        redemptions.forEach(redemption => {
          const li = document.createElement('li');
          const date = new Date(redemption.date).toLocaleDateString();
          li.innerHTML = `<span>${date}</span><span>-${redemption.points}</span>`;
          pointsHistoryList.appendChild(li);
        });
      }
    }
  }
  
  // 商品详情
  showProductDetail(productName) {
    this.selectedProduct = productName;
    this.currentPage = 'product-detail';
    
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    const detailPage = document.getElementById('product-detail-page');
    if (detailPage) {
      detailPage.classList.add('active');
    }
    
    const stats = this.getProductStats(productName);
    
    // 获取商品信息
    const products = DataStore.getProducts();
    const product = products.find(p => p.name === productName);
    const totalQuantity = product?.totalQuantity || 0;
    const remainingQuantity = product?.remainingQuantity || 0;
    
    document.getElementById('product-detail-name').textContent = productName;
    document.getElementById('product-monthly-sales').textContent = stats.monthlySales;
    document.getElementById('product-total-quantity').textContent = totalQuantity;
    document.getElementById('product-remaining-quantity').textContent = remainingQuantity;
    
    // 补货按钮已经通过事件委托处理，不需要重新绑定
    
    // 前10用户
    const topCustomersList = document.getElementById('product-top-customers');
    if (topCustomersList) {
      topCustomersList.innerHTML = '';
      stats.topCustomers.forEach(({ name, count }) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${name}</span><span>${count}</span>`;
        topCustomersList.appendChild(li);
      });
    }
  }
  
  // 模态框
  showAddCustomerModal() {
    document.getElementById('add-customer-modal').classList.add('active');
    document.getElementById('new-customer-name').value = '';
    document.getElementById('new-customer-name').focus();
  }
  
  hideAddCustomerModal() {
    document.getElementById('add-customer-modal').classList.remove('active');
  }
  
  saveNewCustomer() {
    const name = document.getElementById('new-customer-name').value.trim();
    const lang = localStorage.getItem('language') || 'zh';
    if (!name) {
      alert(lang === 'ug' ? 'خېرىدار ئىسمىنى كىرگۈزۈڭ' : '请输入客户名称');
      return;
    }
    
    const customers = DataStore.getCustomers();
    if (customers.find(c => c.name === name)) {
      alert(lang === 'ug' ? 'بۇ خېرىدار ئاللىبۇرۇن مەۋجۇت' : '该客户已存在');
      return;
    }
    
    DataStore.addCustomer(name);
    this.loadCustomers();
    this.hideAddCustomerModal();
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك قوشۇلدى' : '客户添加成功！');
  }
  
  showAddProductModal() {
    document.getElementById('add-product-modal').classList.add('active');
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-quantity').value = '0';
    document.getElementById('new-product-name').focus();
  }
  
  hideAddProductModal() {
    document.getElementById('add-product-modal').classList.remove('active');
  }
  
  saveNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const totalQuantity = parseInt(document.getElementById('new-product-quantity').value) || 0;
    const lang = localStorage.getItem('language') || 'zh';
    if (!name) {
      alert(lang === 'ug' ? 'مەھسۇلات ئىسمىنى كىرگۈزۈڭ' : '请输入商品名称');
      return;
    }
    
    const products = DataStore.getProducts();
    if (products.find(p => p.name === name)) {
      alert(lang === 'ug' ? 'بۇ مەھسۇلات ئاللىبۇرۇن مەۋجۇت' : '该商品已存在');
      return;
    }
    
    DataStore.addProduct(name, totalQuantity);
    this.loadProducts();
    this.hideAddProductModal();
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك قوشۇلدى' : '商品添加成功！');
  }
  
  showRedeemModal() {
    // 如果selectedCustomer未设置，尝试从页面获取
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName && customerName.trim()) {
        this.selectedCustomer = customerName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const stats = this.getCustomerStats(this.selectedCustomer);
    const availablePointsEl = document.getElementById('available-points');
    const redeemAmountEl = document.getElementById('redeem-amount');
    const redeemModal = document.getElementById('redeem-modal');
    
    if (availablePointsEl) availablePointsEl.textContent = stats.currentPoints.toFixed(0);
    if (redeemAmountEl) redeemAmountEl.value = '';
    if (redeemModal) {
      redeemModal.classList.add('active');
      setTimeout(() => {
        if (redeemAmountEl) redeemAmountEl.focus();
      }, 100);
    }
  }
  
  hideRedeemModal() {
    document.getElementById('redeem-modal').classList.remove('active');
  }
  
  // 支付方式选择变化
  handlePaymentMethodChange(method) {
    const paidAmountGroup = document.getElementById('paid-amount-group');
    const debtAmountGroup = document.getElementById('debt-amount-group');
    const paidAmountInput = document.getElementById('paid-amount-input');
    const debtAmountInput = document.getElementById('debt-amount-input');
    const amountInput = document.getElementById('amount-input');
    
    if (method === 'full') {
      paidAmountGroup.style.display = 'none';
      debtAmountGroup.style.display = 'none';
      paidAmountInput.value = '';
      debtAmountInput.value = '';
    } else if (method === 'partial') {
      paidAmountGroup.style.display = 'block';
      debtAmountGroup.style.display = 'block';
      // 不设置默认值，让用户手动输入
      if (!paidAmountInput.value) {
        paidAmountInput.value = '';
      }
      if (!debtAmountInput.value) {
        debtAmountInput.value = '';
      }
    } else if (method === 'debt') {
      paidAmountGroup.style.display = 'none';
      debtAmountGroup.style.display = 'block';
      paidAmountInput.value = '';
      if (amountInput.value) {
        debtAmountInput.value = amountInput.value;
      }
    }
  }
  
  // 自动计算欠款金额
  calculateDebtAmount() {
    const amountInput = document.getElementById('amount-input');
    const paidAmountInput = document.getElementById('paid-amount-input');
    const debtAmountInput = document.getElementById('debt-amount-input');
    const paymentMethod = document.getElementById('payment-method-select')?.value;
    
    if (paymentMethod === 'partial' && amountInput && paidAmountInput && debtAmountInput) {
      const totalAmount = parseFloat(amountInput.value) || 0;
      const paidAmount = parseFloat(paidAmountInput.value) || 0;
      const debtAmount = Math.max(0, totalAmount - paidAmount);
      debtAmountInput.value = debtAmount.toFixed(2);
    }
  }
  
  // 显示补货模态框
  showRestockModal() {
    if (!this.selectedProduct) {
      const productName = document.getElementById('product-detail-name')?.textContent;
      if (productName && productName.trim()) {
        this.selectedProduct = productName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'مەھسۇلات تاللانمىدى' : '请先选择商品');
        return;
      }
    }
    
    const products = DataStore.getProducts();
    const product = products.find(p => p.name === this.selectedProduct);
    const currentRemaining = product?.remainingQuantity || 0;
    
    const currentRemainingEl = document.getElementById('current-remaining-quantity');
    const restockQuantityInput = document.getElementById('restock-quantity-input');
    const restockModal = document.getElementById('restock-modal');
    
    if (currentRemainingEl) currentRemainingEl.textContent = currentRemaining;
    if (restockQuantityInput) restockQuantityInput.value = '';
    if (restockModal) {
      restockModal.classList.add('active');
      setTimeout(() => {
        if (restockQuantityInput) restockQuantityInput.focus();
      }, 100);
    }
  }
  
  // 隐藏补货模态框
  hideRestockModal() {
    document.getElementById('restock-modal').classList.remove('active');
  }
  
  // 处理补货
  handleRestockProduct() {
    if (!this.selectedProduct) {
      const productName = document.getElementById('product-detail-name')?.textContent;
      if (productName && productName.trim()) {
        this.selectedProduct = productName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'مەھسۇلات تاللانمىدى' : '请先选择商品');
        return;
      }
    }
    
    const restockQuantityInput = document.getElementById('restock-quantity-input');
    const restockQuantity = parseInt(restockQuantityInput?.value) || 0;
    const lang = localStorage.getItem('language') || 'zh';
    
    if (!restockQuantity || restockQuantity <= 0) {
      alert(lang === 'ug' ? 'تولدۇرۇش سانىنى كىرگۈزۈڭ' : '请输入补货数量');
      return;
    }
    
    DataStore.restockProduct(this.selectedProduct, restockQuantity);
    this.hideRestockModal();
    this.showProductDetail(this.selectedProduct); // 刷新商品详情页面
    this.loadProducts(); // 刷新商品列表
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك تولدۇرۇلدى' : '补货成功！');
  }
  
  // 显示编辑客户模态框
  showEditCustomerModal() {
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName && customerName.trim()) {
        this.selectedCustomer = customerName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const editNameInput = document.getElementById('edit-customer-name-input');
    const editModal = document.getElementById('edit-customer-modal');
    
    if (editNameInput) editNameInput.value = this.selectedCustomer;
    if (editModal) {
      editModal.classList.add('active');
      setTimeout(() => {
        if (editNameInput) editNameInput.focus();
      }, 100);
    }
  }
  
  // 隐藏编辑客户模态框
  hideEditCustomerModal() {
    document.getElementById('edit-customer-modal').classList.remove('active');
  }
  
  // 处理编辑客户
  handleEditCustomer() {
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName && customerName.trim()) {
        this.selectedCustomer = customerName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const editNameInput = document.getElementById('edit-customer-name-input');
    const newName = editNameInput?.value.trim();
    const lang = localStorage.getItem('language') || 'zh';
    
    if (!newName) {
      alert(lang === 'ug' ? 'خېرىدار ئىسمىنى كىرگۈزۈڭ' : '请输入客户名称');
      return;
    }
    
    if (newName === this.selectedCustomer) {
      this.hideEditCustomerModal();
      return;
    }
    
    DataStore.updateCustomerName(this.selectedCustomer, newName);
    this.selectedCustomer = newName;
    this.hideEditCustomerModal();
    this.showCustomerDetail(newName); // 刷新客户详情页面
    this.loadCustomersList(); // 刷新客户列表
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك يېڭىلاندى' : '客户信息更新成功！');
  }
  
  // 显示编辑商品模态框
  showEditProductModal() {
    if (!this.selectedProduct) {
      const productName = document.getElementById('product-detail-name')?.textContent;
      if (productName && productName.trim()) {
        this.selectedProduct = productName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'مەھسۇلات تاللانمىدى' : '请先选择商品');
        return;
      }
    }
    
    const editNameInput = document.getElementById('edit-product-name-input');
    const editModal = document.getElementById('edit-product-modal');
    
    if (editNameInput) editNameInput.value = this.selectedProduct;
    if (editModal) {
      editModal.classList.add('active');
      setTimeout(() => {
        if (editNameInput) editNameInput.focus();
      }, 100);
    }
  }
  
  // 隐藏编辑商品模态框
  hideEditProductModal() {
    document.getElementById('edit-product-modal').classList.remove('active');
  }
  
  // 处理编辑商品
  handleEditProduct() {
    if (!this.selectedProduct) {
      const productName = document.getElementById('product-detail-name')?.textContent;
      if (productName && productName.trim()) {
        this.selectedProduct = productName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'مەھسۇلات تاللانمىدى' : '请先选择商品');
        return;
      }
    }
    
    const editNameInput = document.getElementById('edit-product-name-input');
    const newName = editNameInput?.value.trim();
    const lang = localStorage.getItem('language') || 'zh';
    
    if (!newName) {
      alert(lang === 'ug' ? 'مەھسۇلات ئىسمىنى كىرگۈزۈڭ' : '请输入商品名称');
      return;
    }
    
    if (newName === this.selectedProduct) {
      this.hideEditProductModal();
      return;
    }
    
    DataStore.updateProductName(this.selectedProduct, newName);
    this.selectedProduct = newName;
    this.hideEditProductModal();
    this.showProductDetail(newName); // 刷新商品详情页面
    this.loadProducts(); // 刷新商品列表
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك يېڭىلاندى' : '商品信息更新成功！');
  }
  
  // 删除交易
  deleteTransaction(transactionId) {
    const lang = localStorage.getItem('language') || 'zh';
    if (!confirm(lang === 'ug' ? 'بۇ سودا خاتىرىسىنى ئۆچۈرەمسىز؟' : '确定要删除这条交易记录吗？')) {
      return;
    }
    
    // 恢复商品库存（如果交易被删除，需要恢复库存）
    const transactions = DataStore.getTransactions();
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      transaction.products.forEach(product => {
        // 恢复库存：增加剩余数量
        const products = DataStore.getProducts();
        const p = products.find(pr => pr.name === product.name);
        if (p) {
          p.remainingQuantity = (p.remainingQuantity || 0) + product.quantity;
          DataStore.saveProducts(products);
        }
      });
    }
    
    DataStore.deleteTransaction(transactionId);
    this.loadRecentTransactions(); // 刷新交易列表
    this.updateDashboard(); // 更新仪表盘
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك ئۆچۈرۈلدى' : '交易记录已删除！');
  }
  
  // 记录还款
  showRecordPaymentModal() {
    // 如果selectedCustomer未设置，尝试从页面获取
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName && customerName.trim()) {
        this.selectedCustomer = customerName.trim();
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const stats = this.getCustomerStats(this.selectedCustomer);
    const pendingDebtEl = document.getElementById('pending-debt-amount');
    const paymentAmountEl = document.getElementById('payment-amount-input');
    const recordPaymentModal = document.getElementById('record-payment-modal');
    
    if (pendingDebtEl) pendingDebtEl.textContent = '¥' + stats.pendingDebt.toFixed(2);
    if (paymentAmountEl) paymentAmountEl.value = '';
    if (recordPaymentModal) {
      recordPaymentModal.classList.add('active');
      setTimeout(() => {
        if (paymentAmountEl) paymentAmountEl.focus();
      }, 100);
    }
  }
  
  hideRecordPaymentModal() {
    document.getElementById('record-payment-modal').classList.remove('active');
  }
  
  handleRecordPayment() {
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName) {
        this.selectedCustomer = customerName;
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const amount = parseFloat(document.getElementById('payment-amount-input').value);
    const lang = localStorage.getItem('language') || 'zh';
    if (!amount || amount <= 0) {
      alert(lang === 'ug' ? 'تاپشۇرۇلغان مىقدارنى كىرگۈزۈڭ' : '请输入收款金额');
      return;
    }
    
    const stats = this.getCustomerStats(this.selectedCustomer);
    if (amount > stats.pendingDebt) {
      alert(lang === 'ug' 
        ? 'تاپشۇرۇلغان مىقدار كۈتۈۋاتقان قەرزدىن ئېشىپ كەتمەسلىكى كېرەك'
        : '收款金额不能超过待还款');
      return;
    }
    
    DataStore.addPayment(this.selectedCustomer, amount);
    this.showCustomerDetail(this.selectedCustomer);
    this.hideRecordPaymentModal();
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك قوبۇل قىلىندى' : '收款记录成功！');
  }
  
  handleRedeemPoints() {
    // 如果selectedCustomer未设置，尝试从页面获取
    if (!this.selectedCustomer) {
      const customerName = document.getElementById('customer-detail-name')?.textContent;
      if (customerName) {
        this.selectedCustomer = customerName;
      } else {
        const lang = localStorage.getItem('language') || 'zh';
        alert(lang === 'ug' ? 'خېرىدار تاللانمىدى' : '请先选择客户');
        return;
      }
    }
    
    const points = parseFloat(document.getElementById('redeem-amount').value);
    const lang = localStorage.getItem('language') || 'zh';
    if (!points || points <= 0) {
      alert(lang === 'ug' ? 'ئۇچۇر سانىنى كىرگۈزۈڭ' : '请输入积分数');
      return;
    }
    
    const stats = this.getCustomerStats(this.selectedCustomer);
    if (points > stats.currentPoints) {
      alert(lang === 'ug' 
        ? 'ئۇچۇر يېتەرلىك ئەمەس'
        : '积分不足');
      return;
    }
    
    DataStore.redeemPoints(this.selectedCustomer, points);
    this.showCustomerDetail(this.selectedCustomer);
    this.hideRedeemModal();
    alert(lang === 'ug' ? 'مۇۋەپپەقىيەتلىك ئالماشتۇرۇلدى' : '积分兑换成功！');
  }
}

// 初始化应用
let app;

function initApp() {
  if (!app) {
    try {
      app = new WholesaleCRM();
      console.log('应用初始化成功');
    } catch (error) {
      console.error('应用初始化失败:', error);
    }
  }
}

// 支持多种初始化方式，确保PWA模式下也能工作
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM已经加载完成，直接初始化
  initApp();
}

// 如果window已经加载完成，也尝试初始化（PWA模式）
window.addEventListener('load', () => {
  if (!app) {
    initApp();
  }
});

