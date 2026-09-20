import { ArrowRight, BookOpen, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const shortcuts = [
  {
    to: "/admin/content",
    title: "内容管理",
    description: "创建和维护学习笔记、日常表达、词汇与面试题。",
    action: "管理学习内容",
    icon: BookOpen,
    tone: "content",
  },
  {
    to: "/admin/users",
    title: "用户管理",
    description: "查看用户账号，维护角色、状态和基本资料。",
    action: "管理用户",
    icon: Users,
    tone: "users",
  },
  {
    to: "/admin/login-monitor",
    title: "登录监控",
    description: "查看成功和失败的登录记录、IP 地址与登录时间。",
    action: "查看登录记录",
    icon: ShieldCheck,
    tone: "security",
  },
];

export function AdminDashboard() {
  return (
    <section className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">HAPPYENGLISH ADMIN</p>
          <h2>管理工作台</h2>
          <p>在这里维护学习内容、用户账号和登录安全记录。</p>
        </div>
        <Link className="admin-primary-action" to="/admin/content">
          创建学习内容
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>

      <div className="admin-shortcut-grid">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              className={`admin-shortcut-card admin-shortcut-${shortcut.tone}`}
              key={shortcut.to}
              to={shortcut.to}
            >
              <span className="admin-shortcut-icon" aria-hidden="true">
                <Icon size={23} strokeWidth={2.1} />
              </span>
              <h3>{shortcut.title}</h3>
              <p>{shortcut.description}</p>
              <span className="admin-shortcut-action">
                {shortcut.action}
                <ArrowRight aria-hidden="true" size={17} />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="admin-security-note">
        <span className="admin-security-icon" aria-hidden="true">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3>登录安全已纳入后台</h3>
          <p>
            登录监控会记录成功和失败的尝试，方便按账号、IP、时间和结果追踪异常情况。
          </p>
        </div>
        <Link to="/admin/login-monitor">打开登录监控</Link>
      </section>
    </section>
  );
}
