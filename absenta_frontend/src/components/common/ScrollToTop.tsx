import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * 🚀 ScrollToTop Component
 * -------------------------
 * Komponen pembantu untuk mereset posisi scroll layar ke paling atas (0, 0)
 * setiap kali rute/halaman berubah. Sangat berguna untuk UI High-Density
 * dengan Sidebar yang panjang.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string>(pathname);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.scrollTo(0, 0);
      }
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
