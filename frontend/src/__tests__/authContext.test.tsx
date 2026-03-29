import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../providers/AuthProvider';
import ProtectedRoute from '../../components/ProtectedRoute';

function createMockToken(role: string = 'EMPLOYER'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '123', email: 'test@test.com', name: 'Test User', role }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

function AuthStatus(): React.ReactElement {
  const { isAuthenticated, user } = useAuth();
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide auth context to children', () => {
    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth')).toHaveTextContent('no');
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });

  it('should decode and load user from valid token in localStorage', () => {
    const token = createMockToken('EMPLOYER');
    localStorage.setItem('payd_auth_token', token);

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth')).toHaveTextContent('yes');
    expect(screen.getByTestId('role')).toHaveTextContent('EMPLOYER');
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should redirect to /login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should allow access for authenticated user with correct role', () => {
    const token = createMockToken('EMPLOYER');
    localStorage.setItem('payd_auth_token', token);

    render(
      <MemoryRouter initialEntries={['/payroll']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute allowedRoles={['EMPLOYER']} />}>
              <Route path="/payroll" element={<div>Payroll Page</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Payroll Page')).toBeInTheDocument();
  });

  it('should redirect EMPLOYEE away from employer-only routes', () => {
    const token = createMockToken('EMPLOYEE');
    localStorage.setItem('payd_auth_token', token);

    render(
      <MemoryRouter initialEntries={['/payroll']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/portal" element={<div>Employee Portal</div>} />
            <Route element={<ProtectedRoute allowedRoles={['EMPLOYER']} />}>
              <Route path="/payroll" element={<div>Payroll Page</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Employee Portal')).toBeInTheDocument();
  });
});
