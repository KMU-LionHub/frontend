import {
  Mic,
  History,
  CircleHelp,
  LogOut,
} from "lucide-react";

function Sidebar({
  activeMenu = "record",
  onMenuChange,
  onLogout,
}) {
  const menuItems = [
    {
      id: "record",
      label: "녹음",
      icon: Mic,
    },
    {
      id: "history",
      label: "대화 기록",
      icon: History,
    },
    {
      id: "help",
      label: "도움말",
      icon: CircleHelp,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span />
        </div>

        <div>
          <strong>Context STT</strong>

          <p>정보 손실 없는 대화</p>
        </div>
      </div>

      <nav
        aria-label="주요 메뉴"
        className="sidebar-menu"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={
                activeMenu === item.id
                  ? "sidebar-menu-item active"
                  : "sidebar-menu-item"
              }
              aria-current={
                activeMenu === item.id
                  ? "page"
                  : undefined
              }
              onClick={() =>
                onMenuChange?.(item.id)
              }
            >
              <Icon
                size={17}
                strokeWidth={1.9}
              />

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
        >
          <LogOut
            size={17}
            strokeWidth={1.9}
          />

          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
