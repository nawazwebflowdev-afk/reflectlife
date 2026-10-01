import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { tr } from "@/i18n/tr";
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">{tr("a.063acb0b3e")}</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          {tr("a.7d708367d6")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
