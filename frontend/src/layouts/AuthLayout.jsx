import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background circles */}
      <div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite",
        }}
      ></div>
      <div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
          animationDelay: "2s",
        }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title Section */}
        <div className="text-center mb-8">
          {/* Logo/Icon with glassmorphism */}
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 mx-auto"
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              animation: "float 3s ease-in-out infinite",
            }}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>

          {/* Title with text shadow */}
          <span>
            <h1
              className="text-6xl font-bold mb-3"
              style={{
                color: "#ffffff",
                textShadow:
                  "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)",
                letterSpacing: "-0.02em",
              }}
            >
              Research Hub
            </h1>
          </span>
        </div>

        {/* Form Container */}
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
