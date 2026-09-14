import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../hooks/useAuth';
import { authApi } from '../services';
import { ApiError } from '../services/apiClient';

vi.mock('../services', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockedAuth = vi.mocked(authApi);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('<LoginPage />', () => {
  beforeEach(() => {
    // No existing session: the bootstrap probe rejects.
    mockedAuth.me.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Authentication required.'));
  });

  it('renders the sign-in form', async () => {
    renderLogin();
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows field errors and does not call the API when fields are empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(mockedAuth.login).not.toHaveBeenCalled();
  });

  it('signs in and navigates to the dashboard on success', async () => {
    const user = userEvent.setup();
    mockedAuth.login.mockResolvedValue({
      agent: {
        id: 'a1',
        name: 'Demo Agent',
        email: 'demo@example.com',
        phone: '+919000000001',
        role: 'AGENT',
        createdAt: new Date().toISOString(),
      },
      token: 'token',
    });

    renderLogin();

    await user.type(await screen.findByLabelText(/email/i), 'demo@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Str0ngPassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedAuth.login).toHaveBeenCalledWith({
        email: 'demo@example.com',
        password: 'Str0ngPassword',
      });
    });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('surfaces the server message when credentials are rejected', async () => {
    const user = userEvent.setup();
    mockedAuth.login.mockRejectedValue(
      new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password.'),
    );

    renderLogin();

    await user.type(await screen.findByLabelText(/email/i), 'demo@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    // The user stays on the login screen.
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('maps server field errors onto the right inputs', async () => {
    const user = userEvent.setup();
    mockedAuth.login.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', [
        { field: 'email', message: 'Must be a valid email address.' },
      ]),
    );

    renderLogin();

    await user.type(await screen.findByLabelText(/email/i), 'bad@');
    await user.type(screen.getByLabelText(/password/i), 'Str0ngPassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Must be a valid email address.')).toBeInTheDocument();
  });
});
