import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services/auth';
import { useAuth } from '../app/AuthProvider';
import { AuthShell, Alert, Submit } from '../components/auth/AuthShell';
import { TextField } from '../components/common/fields';
import { Eye, EyeOff } from 'lucide-react';
import { PageShell, Notice } from '../components/common/ui';
import { errMsg, safePath } from '../lib/utils';
import { forgotSchema, loginSchema, registerSchema, resetSchema, type ForgotValues, type LoginValues, type RegisterValues, type ResetValues } from '../schemas/auth';
const lnk = 'text-teal-800 underline';
const explainGoogleError = (message: string) => /unsupported provider|provider is not enabled/i.test(message) ? 'Google sign-in is disabled for this Supabase project. The project owner must enable Google under Authentication → Sign In / Providers and configure its Google OAuth client ID and secret.' : message;
const PasswordField = forwardRef<HTMLInputElement, { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>>(function PasswordField({ label, error, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><TextField ref={ref} label={label} error={error} {...props} type={visible ? 'text' : 'password'} className="pr-12" />
    <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute right-2 top-[27px] rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-red-700">{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>;
});

export function LoginPage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const adminMode = window.location.pathname === '/admin/login'; const nextPath = adminMode ? '/admin' : safePath(params.get('next'));
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const [err, setErr] = useState<string | null>(null);
  const submit = handleSubmit(async v => {
    setErr(null);
    try { const { data, error } = await authService.signIn(v.email, v.password); if (error) setErr(/not confirmed/i.test(error.message) ? 'Please verify your email before signing in.' : 'Invalid email or password.'); else if (adminMode && data.user.app_metadata?.role !== 'careerforge_admin') { await authService.signOut(); setErr('This account does not have administrator access.'); } else navigate(nextPath, { replace: true }); }
    catch (e) { setErr(errMsg(e)); }
  });
  return (<AuthShell title={adminMode ? 'Administrator sign in' : 'Sign in'}>{err && <Alert kind="error">{err}</Alert>}
    <form onSubmit={submit} noValidate>
      <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
      <Submit busy={isSubmitting}>Sign in</Submit></form>
    <button type="button" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:border-red-300 hover:bg-rose-50" onClick={async () => { try { const { error } = await authService.google(nextPath); if (error) setErr(explainGoogleError(error.message)); } catch (e) { setErr(explainGoogleError(errMsg(e))); } }}>Continue with Google</button>
    {!adminMode&&<><p className="mt-4 text-sm"><Link to="/forgot-password" className={lnk}>Forgot password?</Link> · <Link to="/register" className={lnk}>Create account</Link></p><div className="mt-6 border-t pt-4 text-xs text-slate-500"><Link to="/login?next=%2Fpublisher" className="font-semibold text-red-700 underline">Publisher sign in</Link><span> · </span><Link to="/admin/login" className="font-semibold text-red-700 underline">Admin sign in</Link><p className="mt-1">Admin access is granted only to trusted accounts.</p></div></>}</AuthShell>);
}

export function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { terms: false } });
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  const submit = handleSubmit(async v => {
    setErr(null);
    try { const { error } = await authService.signUp(v.email, v.password, v.fullName); if (error) setErr(error.message); else setDone(true); }
    catch (e) { setErr(errMsg(e)); }
  });
  if (done) return <AuthShell title="Check your email"><Alert kind="ok">If this address can be registered, we have sent a verification link. If you already have an account, sign in or reset your password.</Alert><Link to="/login" className={lnk}>Back to sign in</Link></AuthShell>;
  return (<AuthShell title="Create your account">{err && <Alert kind="error">{err}</Alert>}
    <form onSubmit={submit} noValidate>
      <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
      <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <PasswordField label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
      <label className="mb-1 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" {...register('terms')} />I accept the Terms and Privacy Policy</label>
      {errors.terms && <p role="alert" className="mb-2 text-sm text-red-700">{errors.terms.message}</p>}
      <Submit busy={isSubmitting}>Create account</Submit></form>
    <button type="button" className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:border-red-300 hover:bg-rose-50" onClick={async () => { try { const { error } = await authService.google(); if (error) setErr(explainGoogleError(error.message)); } catch (e) { setErr(explainGoogleError(errMsg(e))); } }}>Create account with Google</button>
    <p className="mt-4 text-sm">Already registered? <Link to="/login" className={lnk}>Sign in</Link></p></AuthShell>);
}

export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  const submit = handleSubmit(async v => { setErr(null); try { await authService.forgot(v.email); setDone(true); } catch (e) { setErr(errMsg(e)); } });
  return (<AuthShell title="Reset your password">{err && <Alert kind="error">{err}</Alert>}{done && <Alert kind="ok">If an account exists for that email, a reset link is on its way.</Alert>}
    <form onSubmit={submit} noValidate><TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} /><Submit busy={isSubmitting}>Send reset link</Submit></form>
    <p className="mt-4 text-sm"><Link to="/login" className={lnk}>Back to sign in</Link></p></AuthShell>);
}

export function ResetPasswordPage() {
  const { session, loading } = useAuth(); const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });
  const [err, setErr] = useState<string | null>(null);
  const submit = handleSubmit(async v => { setErr(null); try { const { error } = await authService.updatePassword(v.password); if (error) setErr(error.message); else nav('/dashboard', { replace: true }); } catch (e) { setErr(errMsg(e)); } });
  if (loading) return <p role="status" className="p-10 text-center">Checking your reset link…</p>;
  if (!session) return <AuthShell title="Reset link invalid"><Alert kind="error">This reset link is invalid or has expired.</Alert><Link to="/forgot-password" className={lnk}>Request a new link</Link></AuthShell>;
  return (<AuthShell title="Choose a new password">{err && <Alert kind="error">{err}</Alert>}
    <form onSubmit={submit} noValidate>
      <PasswordField label="New password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
      <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
      <Submit busy={isSubmitting}>Update password</Submit></form></AuthShell>);
}

export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <p role="status" className="p-10 text-center">Completing sign-in…</p>;
  if (session) return <Navigate to={safePath(params.get('next'))} replace />;
  return <PageShell title="Sign-in could not be completed"><Notice>The link may have expired or already been used.</Notice><Link to="/login" className={lnk}>Back to sign in</Link></PageShell>;
}
