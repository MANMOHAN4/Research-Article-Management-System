import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { statsAPI, citationAPI } from "@/api/endpoint";
import Loader from "@/components/ui/Loader";
import {
  FileText,
  Users,
  BookOpen,
  Calendar,
  Star,
  UserCheck,
  TrendingUp,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => statsAPI.getStats().then((res) => res.data),
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => statsAPI.getHealth().then((res) => res.data),
  });

  const { data: citationStats } = useQuery({
    queryKey: ["citationStats"],
    queryFn: () => citationAPI.getStats().then((res) => res.data),
  });

  const statCards = [
    {
      label: "Articles",
      value: stats?.articles || 0,
      icon: FileText,
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
    {
      label: "Authors",
      value: stats?.authors || 0,
      icon: Users,
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
    {
      label: "Journals",
      value: stats?.journals || 0,
      icon: BookOpen,
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
    {
      label: "Conferences",
      value: stats?.conferences || 0,
      icon: Calendar,
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      iconBg: "rgba(255, 255, 255, 0.25)",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white text-opacity-90 text-lg">
          Overview of your research management system
        </p>
        {health && (
          <div
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg"
            style={{
              background: "rgba(255, 255, 255, 0.25)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <span
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                backgroundColor: "#4ade80",
                display: "block",
                boxShadow: "0 0 10px #4ade80",
              }}
            ></span>
            System Healthy
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl p-6 text-white transform transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                background: stat.gradient,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-90 text-sm font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-4xl font-bold">{stat.value}</p>
                </div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: stat.iconBg,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <Icon
                    className="w-8 h-8"
                    style={{
                      color: "#ffffff",
                      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          Most Cited Articles
        </h2>
        {citationStats?.length > 0 ? (
          <div className="space-y-3">
            {citationStats.slice(0, 5).map((stat, idx) => (
              <div
                key={stat.ArticleID}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/articles/${stat.ArticleID}`)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span
                    className="text-2xl font-bold text-transparent bg-clip-text shrink-0"
                    style={{
                      background:
                        idx === 0
                          ? "linear-gradient(135deg, #FFD700, #FFA500)"
                          : idx === 1
                            ? "linear-gradient(135deg, #C0C0C0, #808080)"
                            : idx === 2
                              ? "linear-gradient(135deg, #CD7F32, #8B4513)"
                              : "linear-gradient(135deg, #667eea, #764ba2)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {stat.Title}
                    </p>
                    {stat.DOI && (
                      <p className="text-sm text-gray-600 truncate">
                        {stat.DOI}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="px-4 py-2 rounded-full text-sm font-bold shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#ffffff",
                  }}
                >
                  {stat.CitationCount}{" "}
                  {stat.CitationCount === 1 ? "citation" : "citations"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No citation data yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Citations will appear here once articles start citing each other
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
