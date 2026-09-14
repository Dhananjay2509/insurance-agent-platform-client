import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/apiClient';
import { Alert, Button, TextField } from '../components/ui';
import { AuthShell } from './AuthShell';

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

export function SignupPage() {
  const { agent, register, initialising } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!initialising && agent) return <Navigate to="/" replace />;

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  /** Mirrors the server's rules so the agent gets feedback before a round trip. */
  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (!PHONE_PATTERN.test(form.phone.trim())) {
      errors.phone = 'Include the country code, e.g. +919876543210.';
    }
    if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
    else if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
      errors.password = 'Include at least one letter and one number.';
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.details.length > 0 ? null : error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your agent account"
      subtitle="You will be signed in straight away."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Priya Nair"
          value={form.name}
          onChange={update('name')}
          error={fieldErrors.name}
          required
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
          required
        />
        <TextField
          label="Phone"
          name="phone"
          autoComplete="tel"
          placeholder="+919876543210"
          value={form.phone}
          onChange={update('phone')}
          error={fieldErrors.phone}
          hint="Include the country code."
          required
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
          hint="At least 8 characters, including a letter and a number."
          required
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
