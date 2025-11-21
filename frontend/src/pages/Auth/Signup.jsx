import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Loader from "@/components/ui/Loader";

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    affiliation: "",
    orcid: "",
  });
  const [loading, setLoading] = useState(false);
  const { handleSignup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await handleSignup(formData);
    setLoading(false);
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Affiliation
          </label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) =>
              setFormData({ ...formData, affiliation: e.target.value })
            }
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ORCID
          </label>
          <input
            type="text"
            value={formData.orcid}
            onChange={(e) =>
              setFormData({ ...formData, orcid: e.target.value })
            }
            className="input"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? <Loader size="sm" /> : "Sign Up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
};

export default Signup;
