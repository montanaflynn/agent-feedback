const projects = [
  { name: "Atlas Mobile", progress: 78, status: "On track", tone: "green" },
  { name: "Q3 Campaign", progress: 54, status: "At risk", tone: "orange" },
  { name: "Design System", progress: 91, status: "On track", tone: "green" }
];

export default function DashboardPage() {
  return (
    <div className="shell">
      <aside>
        <a className="wordmark" href="#" aria-label="Northstar home">
          <span>✦</span> Northstar
        </a>
        <nav aria-label="Workspace navigation">
          <a className="selected" href="#today"><span>⌂</span> Today</a>
          <a href="#projects"><span>□</span> Projects</a>
          <a href="#calendar"><span>◷</span> Calendar</a>
          <a href="#team"><span>♧</span> Team</a>
        </nav>
        <div className="sidebar-footer">
          <p>Workspace</p>
          <button type="button">
            <span className="team-avatar">AC</span>
            <span><strong>Acme Studio</strong><small>8 members</small></span>
            <span>⌄</span>
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="kicker">Monday, July 20</p>
            <h1>Good morning, Maya.</h1>
          </div>
          <div className="header-actions">
            <button className="search-button" type="button" aria-label="Search">
              ⌕
            </button>
            <button className="new-task" data-testid="new-task" type="button">
              <span>＋</span><span>New task</span>
            </button>
          </div>
        </header>

        <section className="focus-card" id="today">
          <div>
            <p className="kicker light">Today’s focus</p>
            <h2>Ship the onboarding refresh</h2>
            <p>3 of 5 tasks completed · Due today at 5:00 PM</p>
          </div>
          <div className="focus-progress" aria-label="60 percent complete">
            <strong>60%</strong><span>complete</span>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-title">
              <div>
                <p className="kicker">Priority</p>
                <h2>Up next</h2>
              </div>
              <a href="#all-tasks">View all</a>
            </div>
            <div className="task-list">
              <label>
                <input type="checkbox" />
                <span><strong>Review onboarding copy</strong><small>Atlas Mobile · 10:30 AM</small></span>
                <span className="person lavender">IK</span>
              </label>
              <label>
                <input type="checkbox" />
                <span><strong>Approve final illustrations</strong><small>Design System · 1:00 PM</small></span>
                <span className="person peach">JL</span>
              </label>
              <label>
                <input type="checkbox" />
                <span><strong>Send campaign brief</strong><small>Q3 Campaign · 3:30 PM</small></span>
                <span className="person blue">MR</span>
              </label>
            </div>
          </article>

          <article className="panel" id="projects">
            <div className="panel-title">
              <div>
                <p className="kicker">Portfolio</p>
                <h2>Active projects</h2>
              </div>
              <button className="more-button" type="button" aria-label="More project options">
                •••
              </button>
            </div>
            <div className="project-list">
              {projects.map((project) => (
                <div className="project" key={project.name}>
                  <div>
                    <strong>{project.name}</strong>
                    <span className={`status ${project.tone}`}>{project.status}</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${project.progress}%` }} />
                  </div>
                  <small>{project.progress}%</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <p className="example-note">
          Next.js App Router example · Click <strong>◎ Annotate</strong> to try the loop
        </p>
      </main>
    </div>
  );
}
