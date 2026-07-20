const activity = [
  { amount: "+$480", label: "Helio Studio", time: "2m ago" },
  { amount: "+$215", label: "North & Pine", time: "18m ago" },
  { amount: "+$96", label: "Morrow Goods", time: "1h ago" }
];

const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const revenue = [42, 58, 49, 73, 66, 92];

export function App() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Sprout home">
          <span className="brand-mark">S</span>
          <span>sprout</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#overview">Overview</a>
          <a href="#invoices">Invoices</a>
          <a href="#customers">Customers</a>
        </nav>
        <button className="avatar" type="button" aria-label="Open profile menu">
          MF
        </button>
      </header>

      <section className="hero" id="overview">
        <div>
          <p className="eyebrow">Monday, July 20</p>
          <h1>Your business is growing.</h1>
          <p className="lede">
            Revenue is up 18% this month. Here is what deserves your attention.
          </p>
        </div>
        <button className="primary-action" data-testid="new-invoice" type="button">
          <span aria-hidden="true">＋</span>
          <span>New invoice</span>
        </button>
      </section>

      <section className="metric-grid" aria-label="Business summary">
        <article className="metric featured">
          <p>Monthly revenue</p>
          <strong>$12,840</strong>
          <span>↗ 18.2% from last month</span>
        </article>
        <article className="metric">
          <p>Outstanding</p>
          <strong>$3,260</strong>
          <span>6 invoices</span>
        </article>
        <article className="metric">
          <p>Average payment</p>
          <strong>4.2 days</strong>
          <span>1.4 days faster</span>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cash flow</p>
              <h2>Six month revenue</h2>
            </div>
            <button className="ghost-button" type="button">Last 6 months⌄</button>
          </div>
          <div className="chart" aria-label="Decorative revenue bar chart">
            {revenue.map((height, index) => (
              <div className="bar-column" key={months[index]}>
                <div className="bar" style={{ height: `${height}%` }} />
                <span>{months[index]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live</p>
              <h2>Recent payments</h2>
            </div>
            <a href="#all-payments">View all</a>
          </div>
          <ul className="activity-list">
            {activity.map((item) => (
              <li key={item.label}>
                <span className="company-dot">{item.label[0]}</span>
                <span className="activity-name">
                  <strong>{item.label}</strong>
                  <small>{item.time}</small>
                </span>
                <strong className="amount">{item.amount}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <p className="example-note">
        Vite + React example · Click <strong>◎ Annotate</strong> to try the loop
      </p>
    </main>
  );
}
