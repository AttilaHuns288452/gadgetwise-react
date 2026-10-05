import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ponytail: mock demo login, no real auth
  const submit = (e) => {
    e.preventDefault();
    localStorage.setItem("gw_user", JSON.stringify({ name: "AV Demo", email }));
    navigate("/profile");
  };

  return (
    <section className="section">
      <div className="mx-auto max-w-md">
        <div className="eyebrow">Account</div>
        <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Welcome back</h1>
        <p className="mt-2 text-ink2">your wishlist missed you</p>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={fieldLabelCls} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu"
              className={fieldInputCls}
            />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <button type="submit" className="btn-primary w-full">Log in</button>
          <p className="text-center text-sm text-ink2">
            New here? <Link to="/register" className="font-semibold text-primary hover:text-primary-dark">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default Login;
