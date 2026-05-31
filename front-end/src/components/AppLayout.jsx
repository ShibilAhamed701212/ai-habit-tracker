import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import MobileNav from "./MobileNav.jsx";
import AIChat from "./AIChat.jsx";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar />
      <MobileNav />
      <div className="flex-1 md:pl-64 flex flex-col">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>
      <AIChat />
    </div>
  );
}
