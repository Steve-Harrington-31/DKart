import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, User, Gift, Shield, BadgeIndianRupee, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — DKart" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", referral: "" });
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (!accept) return toast.error("Please accept terms");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { full_name: form.name, referred_by: form.referral || null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to verify.");
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3">
          <Logo size={48} />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground">Join DKart and start shopping smarter.</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3 bg-card border border-border rounded-2xl p-6">
          <Field icon={<User className="h-4 w-4" />}>
            <input required placeholder="Full Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-transparent outline-none text-sm" />
          </Field>
          <Field icon={<Mail className="h-4 w-4" />}>
            <input type="email" required placeholder="Email Address" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-transparent outline-none text-sm" />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input type={show1 ? "text" : "password"} required minLength={6} placeholder="Create Password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-transparent outline-none text-sm" />
            <button type="button" onClick={() => setShow1(!show1)} className="text-muted-foreground">
              {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input type={show2 ? "text" : "password"} required minLength={6} placeholder="Confirm Password"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full bg-transparent outline-none text-sm" />
            <button type="button" onClick={() => setShow2(!show2)} className="text-muted-foreground">
              {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>
          <Field icon={<Gift className="h-4 w-4" />}>
            <input placeholder="Referral Code (optional)" value={form.referral}
              onChange={(e) => setForm({ ...form, referral: e.target.value })}
              className="w-full bg-transparent outline-none text-sm" />
          </Field>

          <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5" />
            <span>I agree to DKart's <span className="text-primary">Terms</span> and <span className="text-primary">Privacy Policy</span>.</span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {loading ? "Creating…" : "Create Account →"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link>
          </p>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: "Secure & Safe" },
            { icon: BadgeIndianRupee, label: "Best Prices" },
            { icon: Truck, label: "Fast Delivery" },
          ].map((b) => (
            <div key={b.label} className="rounded-xl bg-card border border-border p-3 text-center">
              <b.icon className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-1 text-[10px] font-semibold text-foreground">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
