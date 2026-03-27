async function renderDashboard() {
  const content = document.getElementById('page-content');
  try {
    const d = await api.dashboard();
    const k = d.kpis;

    content.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card gold">
          <div class="kpi-icon">💰</div>
          <div class="kpi-value number">${formatMoney(k.monthly_sales)}</div>
          <div class="kpi-label">مبيعات الشهر (${k.monthly_sales_count} فاتورة)</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-icon">🏦</div>
          <div class="kpi-value number">${formatMoney(k.cash_balance + k.bank_balance)}</div>
          <div class="kpi-label">الرصيد النقدي والبنكي</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-value number">${formatMoney(k.overdue_amount)}</div>
          <div class="kpi-label">مستحقات متأخرة (${k.overdue_count})</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📦</div>
          <div class="kpi-value number">${formatMoney(k.inventory_value)}</div>
          <div class="kpi-label">قيمة المخزون</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🛒</div>
          <div class="kpi-value number">${formatMoney(k.monthly_purchases)}</div>
          <div class="kpi-label">مشتريات الشهر</div>
        </div>
        <div class="kpi-card ${k.low_stock_count > 0 ? 'red' : 'green'}">
          <div class="kpi-icon">🚨</div>
          <div class="kpi-value">${k.low_stock_count}</div>
          <div class="kpi-label">منتجات نقص المخزون</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 المبيعات - آخر 6 أشهر</span>
          </div>
          <canvas id="sales-chart" height="80"></canvas>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">⭐ أفضل العملاء</span>
          </div>
          <div id="top-customers-list"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">🧾 آخر الفواتير</span>
          <button class="btn btn-primary btn-sm" onclick="showPage('sales')">عرض الكل</button>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>التاريخ</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr></thead>
            <tbody>
              ${d.recent_invoices.map(inv => `
                <tr>
                  <td class="number">${inv.invoice_number}</td>
                  <td>${inv.customer}</td>
                  <td>${formatDate(inv.invoice_date)}</td>
                  <td class="number">${formatMoney(inv.total_amount)}</td>
                  <td>${statusBadge(inv.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Sales chart
    const chartData = d.charts.monthly_sales;
    if (chartData.length > 0) {
      const ctx = document.getElementById('sales-chart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.map(r => r.month),
          datasets: [{
            label: 'المبيعات (EGP)',
            data: chartData.map(r => r.total),
            backgroundColor: 'rgba(200,169,110,0.3)',
            borderColor: '#c8a96e',
            borderWidth: 2,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#8892aa', font: { family: 'Cairo' } } } },
          scales: {
            x: { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.8)' } },
            y: { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.8)' } }
          }
        }
      });
    }

    // Top customers
    const tcList = document.getElementById('top-customers-list');
    if (d.top_customers.length === 0) {
      tcList.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">👤</div><p>لا توجد بيانات</p></div>';
    } else {
      const maxSales = Math.max(...d.top_customers.map(c => c.total));
      tcList.innerHTML = d.top_customers.map(c => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600">${c.name}</span>
            <span style="font-size:13px;color:var(--accent)">${formatMoney(c.total)}</span>
          </div>
          <div style="height:6px;background:var(--bg-input);border-radius:3px;">
            <div style="height:100%;background:linear-gradient(90deg,var(--accent-dark),var(--accent));border-radius:3px;width:${(c.total/maxSales*100).toFixed(1)}%"></div>
          </div>
        </div>
      `).join('');
    }

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}
