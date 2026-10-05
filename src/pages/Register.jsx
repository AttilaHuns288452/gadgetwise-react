import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fieldLabelCls, fieldInputCls } from "../components/ui.jsx";

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ponytail: mock demo signup, no real auth
  const submit = (e) => {
    e.preventDefault();
    localStorage.setItem("gw_user", JSON.stringify({ name: name.trim() || "AV Demo", email }));
    navigate("/profile");
  };

  return (
    <section className="section">
      <div className="mx-auto max-w-md">
        <div className="eyebrow">Account</div>
        <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Create your account</h1>
        <p className="mt-2 text-ink2">Free for students. Your data stays yours.</p>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
          <div>
            <label className={fieldLabelCls} htmlFor="reg-name">Name</label>
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={fieldInputCls}
            />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu"
              className={fieldInputCls}
            />
          </div>
          <div>
            <label className={fieldLabelCls} htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldInputCls}
            />
          </div>
          <button type="submit" className="btn-primary w-full">Create account</button>
          <p className="text-center text-sm text-ink2">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default Register;
